const Token = require('./token')
let share = require('../share')

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

    Object.values(this.tokens).forEach(x => {
      if (x.userid === id) {
        if (ignoreIRC && x.irc) {
          return
        }
        if (_all) {
          all.push(x)
        } else {
          return x
        }
      }
    })

    if (_all) {
      return all
    } else {
      return null
    }
  }
  getTokenFromUsername (username, ignoreIRC = false, easy = false, _all = false) {
    let who = (!easy) ? username.toLowerCase() : username

    let ret = []
    let value
    Object.values(this.tokens).forEach(x => {
      if (!(easy && x.username.toLowerCase() === who) || (easy && x.easyUsername === who)) {
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

    })
  }
}
