const deasync = require('deasync')
module.exports = class {
  get (userID, gameMode) {
    let done = false
    let data
    share.redis.get(`score:user_stats_cache:${gameMode}:${userID}`, (err, reply) => {
      if (err) {
        console.error(err)
        done = true
        return undefined
      }

      data = reply
      done = true
    })

    deasync.loopWhile(() => {
      return !done
    })

    if (!data) {
      this.update(userID, gameMode)
      return this.get(userID, gameMode)
    }

    let retData = JSON.parse(data)
    return retData
  }

  update (userID, gameMode, data = undefined) {
    if ((typeof data) === 'undefined') {
      data = {}
    }
    if (data.length === 0) {
      data = user.getStatus(userID, gameMode)
    }
    share.redis.set(`score:user_stats_cache:${gameMode}:${userID}`, JSON.stringify(data), 'EX', 1800)
  }
}

const user = require('./user')
const share = require('../share')
