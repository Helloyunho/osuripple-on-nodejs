const CronJob = require('cron').CronJob

module.exports = class {
  constructor () {
    this.tokens = {}
  }

  addtoken (id, ip = '', irc = false, timeoffset = 0, tournament = false) {
    let newToken = new Token(id, null, ip, irc, timeoffset, tournament)
    this.tokens[newToken.token] = newToken
    share.online_users++
    return newToken
  }
  removetoken (token) {
    if (token in this.tokens) {
      delete this.tokens.token
      share.online_users--
    }
  }
  getTokenFromUserid (id, ignoreIRC = false, _all = false) {
    let all = []
    let data

    Object.values(this.tokens).forEach(x => {
      if (x.userid === id) {
        if (ignoreIRC && x.irc) {
          return
        }
        if (_all) {
          all.push(x)
        } else {
          data = x
          return undefined
        }
      }
    })

    if (_all) {
      return all
    } else if (data) {
      return data
    } else {
      return null
    }
  }
  getTokenFromUsername (username, ignoreIRC = false, easy = false, _all = false) {
    let who = (!easy) ? username.toLowerCase() : username

    let ret = []
    let value
    Object.values(this.tokens).forEach(x => {
      if ((!easy && (x.username.toLowerCase() === who)) || (easy && (x.easyUsername === who))) {
        if (ignoreIRC && x.irc) {
          return
        }
        if (_all) {
          ret.push(x)
        } else {
          value = x
        }
      }
    })

    if (_all) {
      return ret
    } else {
      return value
    }
  }
  deleteOldTokens (id) {
    let del = []

    Object.keys(this.tokens).forEach(x => {
      if (this.tokens[x].userid === id) {
        del.push(this.tokens[x])
      }
    })

    del.forEach(x => {
      logoutEvent(x)
    })
  }

  multipleEnqueue (packet, who, but = false) {
    Object.values(this.tokens).forEach(x => {
      let shouldEnqueue = false
      if (x.userid in who && !but) {
        shouldEnqueue = true
      } else if (!(x.userid in who) && but) {
        shouldEnqueue = true
      }

      if (shouldEnqueue) {
        x.addpackets(packet)
      }
    })
  }

  enqueueAll (packet) {
    Object.values(this.tokens).forEach(x => {
      x.addpackets(packet)
    })
  }

  usersTimeoutCheckLoop () {
    let timedOutTokens = []
    let timeoutLimit = Date.now() - 100
    Object.keys(this.tokens).forEach(x => {
      if (this.tokens[x].pingTime < timeoutLimit && this.tokens[x].userid !== 1 && !this.tokens[x].irc && !this.tokens[x].tournament) {
        timedOutTokens.push(x)
      }
    })

    timedOutTokens.forEach(i => {
      this.tokens[i].addpackets(packets.notification('Your connection to the server timed out.'))
      logoutEvent(this.tokens[i], null)
    })
    timedOutTokens = []

    let timer = new CronJob('100 * * * * *', this.usersTimeoutCheckLoop)
    timer.start()
  }

  spamProtectionResetLoop () {
    Object.values(this.tokens).forEach(x => {
      x.spamRate = 0
    })

    let timer = new CronJob('10 * * * * *', this.spamProtectionResetLoop)
    timer.start()
  }

  deleteBanchoSessions () {
    share.redis.eval('return redis.call(\'del\', unpack(redis.call(\'keys\', ARGV[1])))', 0, 'bancho:sessions:*')
  }

  tokenExists (username = '', userID = -1) {
    if (userID > -1) {
      return this.getTokenFromUserid(userID)
    } else {
      return this.getTokenFromUsername(username)
    }
  }
}

const Token = require('./token')
const logoutEvent = require('../when/bancho').logout
let share = require('../share')
const packets = require('./packets')
