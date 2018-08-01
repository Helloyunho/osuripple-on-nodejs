const token = require('./token')
let share = require('../share')

module.exports = class {
    constructor() {
        this.tokens = {}
    }
    
    addtoken(id, ip="", irc=false, timeoffset=0, tournament=false) {
        let newToken = new token(id, null, ip, irc, timeoffset, tournament)
        this.tokens[newToken.token] = newToken
        share.online_users++
        return newToken
    }
    removetoken(token) {
        if (token in this.tokens) {
            let a = this.tokens.token
            delete a
            share.online_users--
        }
    }
    getTokenFromUserid(id, ignoreIRC=false, _all=false) {
        let all = []

        Object.values(this.tokens).forEach(x => {
            if (x.userid == id) {
                if (ignoreIRC && x.irc) {
                    continue
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
    deleteOldTokens(id) {
        let del = []

        Object.keys(this.tokens).forEach(x => {
            if (this.tokens[x].userid == id) {
                del.push(this.tokens[x])
            }
        })

        del.forEach(x => {
            
        })
    }
}