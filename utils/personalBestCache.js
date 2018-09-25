const deasync = require('deasync')
module.exports = class {
  get (userID, fileMd5, country = false, friends = false, mods = -1) {
    let done = false
    let data
    share.redis.get(`score:personal_best_cache:${userID}`, (err, reply) => {
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
      return 0
    }

    data = data.split('|')
    let cachedpersonalBestRank = Number(data[0])
    let cachedfileMd5 = String(data[1])
    let cachedCountry = Boolean(data[2])
    let cachedFriends = Boolean(data[3])
    let cachedMods = Number(data[4])

    if ((fileMd5 !== cachedfileMd5) || (country !== cachedCountry) || (friends !== cachedFriends) || (mods !== cachedMods)) {
      return 0
    }

    return cachedpersonalBestRank
  }

  set (userID, rank, fileMd5, country = false, friends = false, mods = -1) {
    share.redis.set(`score:personal_best_cache:${userID}`, `${rank}|${fileMd5}|${country}|${friends}|${mods}`, 'EX', 1800)
  }
}

const share = require('../share')
