const http = require('http')
const express = require('express')
let app = express()
const server = http.createServer(app)
const compression = require('compression')
const queryString = require('query-string')
const multer = require('multer')
const upload = multer({storage: multer.memoryStorage()})
const fs = require('fs')

const deasync = require('deasync')
app.use(compression())

const request = require('request')
app.set('port', 5002)

server.listen(app.get('port'), () => {
  console.log('Welcome to osu! server!')
})

app.route('/web/bancho_connect.php').get((req, res) => {
  let ip = req.get('X-Real-IP')
  utils.consoleColor.log(`${ip} is connecting with url: ${req.url}`)

  if (!req.query.u || !req.query.h) {
    return
  }

  let username = req.query.u
  let userID = utils.user.getIdFromUsername(username)
  if (!userID) {
    res.send('error: pass\n')
    res.end()
    return undefined
  }

  if (!utils.user.checkLoginIsOk(userID, req.query.h)) {
    res.send('error: pass\n')
    res.end()
    return undefined
  }

  let userPer = utils.user.getPermission(userID)
  if (userPer & permission.banned) {
    return
  }

  utils.user.updateLatestActivity(userID)

  let done = false
  let data = null
  let row = db.prepare('select country from user_status where id = ?').get([userID])
  data = row.country
  res.send(data)
  res.end()
})

app.route('/web/osu-checktweets.php').get((req, res) => {
  res.send('Not yet')
  res.end()
})

app.route('/web/lastfm.php').get((req, res) => {
  res.send('Not yet')
  res.end()
})

app.route('/web/check-updates.php').get((req, res) => {
  try {
    let args = {}

    Object.keys(req.query).forEach(i => {
      args[i] = req.query[i]
    })

    if (args.action.toLowerCase() === 'put') {
      res.write('nope')
      res.end()
      return null
    }

    let done = false
    let data = null
    request(`${share.config.osuapi.apiurl}/web/check-updates.php?${queryString.stringify(args)}`, (err, req, body) => {
      if (err) {
        console.error(err)
        done = true
      }
      data = body
      done = true
    })

    deasync.loopWhile(() => {
      return !done
    })
    res.send(data)
    res.end()
  } catch (e) {
    console.error(e)
    res.send('')
    res.end()
  }
})

app.route('/web/osu-osz2-getscores.php').get((req, res) => {
  let ip = req.get('X-Real-IP')
  utils.consoleColor.log(`${ip} is connecting with url: ${req.url}`)
  when.getScores(req, res)
})

app.route('/web/osu-submit-modular.php').post(upload.any(), (req, res) => {
  let ip = req.get('X-Real-IP')
  utils.consoleColor.log(`${ip} is connecting with url: ${req.url}`)
  let ok = when.submitModular(req, res)
  if (!ok) {
    res.sendStatus(408)
    res.end()
  }
})

app.route('/web/osu-submit-modular-selector.php').post(upload.any(), (req, res) => {
  let ip = req.get('X-Real-IP')
  utils.consoleColor.log(`${ip} is connecting with url: ${req.url}`)
  let ok = when.submitModular(req, res)
  if (!ok) {
    res.sendStatus(408)
    res.end()
  }
})

app.route('/web/osu-getreplay.php').get((req, res) => {
  let okArgs = true
  let args = ['c', 'u', 'h']
  args.forEach(i => {
    if (!(i in req.query)) {
      okArgs = false
    }
  })

  if (!okArgs) {
    return undefined
  }

  let username = req.query.u
  let password = req.query.h
  let replayID = req.qurey.c

  let userID = utils.user.getIdFromUsername(username)
  if (!userID) {
    return undefined
  }
  if (!utils.user.checkLoginIsOk(userID, password)) {
    return undefined
  }

  let replayData = db.get('select scores.*, users.username as uname from scores join users on scores.userid = users.id where scores.id = ?', [replayID])

  if (replayData) {
    if (username !== replayData.uname) {
      utils.user.incrementReplaysWatched(replayData.userid, replayData.play_mode)
    }
  }

  let fileName = `.data/replays/replay_${replayID}.osr`
  if (fs.existsSync(fileName)) {
    res.send(fs.readFileSync(fileName).toString('utf8'))
  } else {
    utils.consoleColor.warn(`Replay ${replayID} doesn't exist`)
    res.send('')
  }
  res.end()
})

app.route('/web/replays/:replayID').get((req, res) => {
  let fullReplay = utils.replay.buildFullReplay(req.query.replayID)
  if (!fullReplay) {
    res.send('Replay not found')
    res.end()
  }
  res.send(fullReplay)
  res.setHeader('Content-type', 'application/octet-stream')
  res.setHeader('Content-length', fullReplay.length)
  res.setHeader('Content-Description', 'File Transfer')
  res.setHeader('Content-Disposition', `attachment; filename="${replayID}.osr"`)
  res.end()
})

app.route('/web/osu-rate.php').get((req, res) => {
  res.send('Not yet')
  res.end()
})

app.route('/web/osu-comment.php').get((req, res) => {
  res.send('Not yet')
  res.end()
})

app.route('*').all((req, res) => {
  let ip = req.get('X-Real-IP')
  utils.consoleColor.log(`${ip} is connecting with url: ${req.url}`)
})

const permission = require('./permission')
const share = require('./share')
const utils = require('./utils')
const when = require('./when/score')
const db = require('./db')
