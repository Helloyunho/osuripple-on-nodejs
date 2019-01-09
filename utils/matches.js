const CronJob = require('cron').CronJob

module.exports = class {
  constructor () {
    this.matches = {}
    this.lastID = 1
  }

  createMatch (matchName, matchPassword, beatmapID, beatmapName, beatmapMD5, gameMode, hostUserID, isTourney = false) {
    let matchID = this.lastID
    this.lastID++
    this.matches[matchID] = new Match(matchID, matchName, matchPassword, beatmapID, beatmapName, beatmapMD5, gameMode, hostUserID, isTourney)
    return matchID
  }

  disposeMatch (matchID) {
    if (!(matchID in this.matches)) {
      console.log(`Match ${matchID} want's to dispose, but not found.`)
      return null
    }

    let _match = this.matches[matchID]
    _match.slots.forEach(i => {
      let _token = share.tokens.getTokenFromUserid(i.userid, true)
      if (!_token) {
        return
      }
      _match.userLeft(_token, false)
    })

    share.channels.removeChannel(`#multi_${_match.matchID}`)

    share.streams.broadcast(_match.streamName, packets.disposeMatch(_match.matchID))

    share.streams.dispose(_match.streamName)
    share.streams.dispose(_match.playingStreamName)
    share.streams.remove(_match.streamName)
    share.streams.remove(_match.playingStreamName)

    share.streams.broadcast('lobby', packets.disposeMatch(matchID))
    delete this.matches[matchID]
  }

  cleanupLoop () {
    let t = Date.now()
    let emptyMatches = []

    Object.values(this.matches).forEach(i => {
      let asdf = []
      i.slots.forEach(x => {
        if (x.user) {
          asdf.push(x)
        }
      })
      if (asdf) {
        return
      }
      if (t - i.createTime >= 120) {
        emptyMatches.push(i.matchID)
      }
    })

    emptyMatches.forEach(i => {
      this.disposeMatch(i.matchID)
    })

    let timer = new CronJob('30 * * * * *', this.cleanupLoop)
    timer.start()
  }
}

const share = require('../share')
const packets = require('./packets')
const Match = require('./match')
