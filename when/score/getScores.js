module.exports = (req, res) => {
  let okArgs = true
  let args = ['c', 'f', 'i', 'm', 'us', 'v', 'vv', 'mods']
  args.forEach(i => {
    if (!(i in req.query)) {
      okArgs = false
    }
  })

  if (!okArgs) {
    res.send('error: meme')
    res.end()
    return undefined
  }

  let md5 = req.query.c
  let fileName = req.query.f
  let beatmapSetID = req.query.i
  let gameMode = req.query.m
  let username = req.query.us
  let password = req.query.ha
  let scoreboardType = Number(req.query.v)
  let scoreboardVersion = Number(req.query.vv)

  let userID = utils.user.getIdFromUsername(username)
  if (!userID) {
    res.send('error: pass')
    res.end()
    return undefined
  }
  if (!utils.user.checkLoginIsOk(userID, password)) {
    res.send('error: pass')
    res.end()
    return undefined
  }

  let country = false
  let friends = false
  let modsFilter = -1
  if (scoreboardType === 4) {
    country = true
  } else if (scoreboardType === 2) {
    modsFilter = Number(req.get('mods'))
  } else if (scoreboardType === 3) {
    friends = true
  }

  let fileNameShort = (fileName.length > 32) ? fileName.slice(0, 32) + '...' : fileName.slice(0, -4)
  utils.consoleColor.log(`Get Score requested, beatmap: ${fileNameShort} md5: ${md5}`)

  let bmap = new utils.beatmap(md5, beatmapSetID, gameMode)

  let sboard = new utils.scoreboard(username, gameMode, bmap, true, country, friends, modsFilter)

  let data = ''
  data += bmap.getData(sboard.totalScores, scoreboardVersion)
  data += sboard.getScoresData()
  res.send(data)
  res.end()
}

const utils = require('../../utils')
