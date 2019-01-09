const deasync = require('deasync')

module.exports.getRankInfo = (userID, gameMode) => {
  let data = {nextUsername: '', difference: 0, currentRank: 0}
  let k = `score:leaderboard:${gameMode}`
  let position = user.getGameRank(userID, gameMode) - 1

  if (position) {
    let aboveUs
    let done
    share.redis.zrevrange(k, position - 1, position, (err, d) => {
      if (err) {
        console.error(err)
        done = true
        return undefined
      }
      aboveUs = d
      done = true
    })

    deasync.loopWhile(() => {
      return !done
    })

    if (aboveUs && (aboveUs.length > 0) && /^\d+$/.test(aboveUs[0])) {
      let done = false
      let myScore
      share.redis.zscore(k, userID, (err, row) => {
        if (err) {
          console.error(err)
          done = true
          return undefined
        }
        myScore = row
        done = true
      })
      deasync.loopWhile(() => {
        return !done
      })
      done = false
      let otherScore
      share.redis.zscore(k, aboveUs[0], (err, row) => {
        if (err) {
          console.error(err)
          done = true
          return undefined
        }
        otherScore = row
        done = true
      })
      deasync.loopWhile(() => {
        return !done
      })
      let nextUsername = user.getUsernameFromId(aboveUs[0])
      if (!nextUsername && ((typeof myScore) !== 'undefined') && ((typeof otherScore) !== 'undefined')) {
        data.nextUsername = nextUsername
        data.difference = Number(myScore) - Number(otherScore)
      }
    }
  } else {
    position = 0
  }

  data.currentRank = position + 1
  return data
}

module.exports.update = (userID, newScore, gameMode) => {
  let upermission = user.getPermission(userID)
  if ((upermission & permission.restricted) > 0) {
    consoleColor.debug(`Leaderboard update for user ${userID} skipped (restricted)`)
  } else {
    consoleColor.debug('Updating leaderboard....')
    share.redis.zadd(`score:leaderboard:${gameMode}`, String(userID), String(newScore))
  }
}

module.exports.updateCountry = (userID, newScore, gameMode) => {
  let upermission = user.getPermission(userID)
  if ((upermission & permission.restricted) > 0) {
    consoleColor.debug(`Country leaderboard update for user ${userID} skipped (restricted)`)
  } else {
    let country = user.getCountry(userID)
    if (country && country.toLowerCase() !== 'xx') {
      share.redis.zadd(`score:leaderboard:${gameMode}:${country.toLowerCase()}`, String(userID), String(newScore))
    }
  }
}

const share = require('../share')
const user = require('./user')
const consoleColor = require('./consoleColor')
const permission = require('../permission')
