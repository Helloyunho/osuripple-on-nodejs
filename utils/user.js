const deasync = require('deasync')

exports.getIdFromUsername = (username) => {
  let row = share.db.prepare('select id from users where username = ?').get([username])
  return row.id
}

exports.getUsernameFromId = (id) => {
  let row = share.db.prepare('select username from users where id = ?').get([id])
  return row.username
}

exports.getEasyUsernameFromId = (id) => {
  let row = share.db.prepare('select username_easy from users where id = ?').get([id])
  return row.username_easy
}

exports.checkLoginIsOk = (id, pass) => {
  let row = share.db.prepare('select password from users where id = ?').get([id])
  return row.password === pass
}

exports.getPermission = (id) => {
  let row = share.db.prepare('select permission from users where id = ?').get([id])
  return row.permission
}

exports.getFriends = (id) => {
  let data = []
  let rows = share.db.prepare('select friendid from friends where userid = ?').all([id])
  rows.forEach((a) => {
    data.push(a)
  })
  if (!data) {
    data = [0]
  }
  return data
}

exports.getStatus = (id, mode) => {
  let row = share.db.prepare(`select ranked_score_${mode} as rankedScore, accuracy_${mode} as accuracy, playcount_${mode} as playcount, total_score_${mode} as totalScore, pp_${mode} as pp, game_rank_${mode} as game_rank from user_status where id = ${id}`).get()

  return row
}

exports.getGameRank = (id, mode) => {
  let row = share.db.prepare(`select game_rank_${mode} as game_rank from user_status where id = ${id}`).get()
  return row.game_rank
}

exports.silence = (id, sec, silenceReason, author = 1) => {
  let silenceEndTime = Date.now() + sec
  share.db.prepare('update users set silence_time = ?, silence_reason = ? where id = ?').run([silenceEndTime, silenceReason, id])

  if (sec > 0) {
    share.log_file.write(`UserID ${id} has silenced for ${sec} by ${author}`)
  } else {
    share.log_file.write(`UserID ${id}'s silence has removed by ${author}`)
  }
}

exports.getSilenceEnd = (id) => {
  let row = share.db.prepare('select silence_time from users where id = ?').get([id])

  return row.silence_time
}

exports.updateLatestActivity = id => {
  share.db.prepare('update users set latest_activity = ? where id = ?').run([Date.now(), id])
}

exports.setCountry = (id, country) => {
  share.db.prepare('update user_status set country = ? where id = ?').run([country, id])
}

exports.getCountry = (id) => {
  let row = share.db.prepare('select country from user_status where id = ?').get([id])

  return row.country
}

exports.addFriend = (userID, friendID) => {
  if (userID === friendID) {
    return undefined
  }

  let row = share.db.prepare('select id from friends where userid = ? and friendid = ?').get([userID, friendID])

  if ((typeof row.id) !== 'number') {
    share.db.prepare('insert into friends (userid, friendid) values (?, ?)').run([userID, friendID])
  }
}

exports.removeFriend = (userID, friendID) => {
  share.db.prepare('delete from friends whene userid = ? and friendid = ?').run([userID, friendID])
}

exports.restrict = (userID) => {
  share.db.prepare('update users set permission = permission & ? , banned_time = ?, where id = ?').run([~(2 << 0), Date.now(), userID])
}

exports.restrict_reason = (userID, reason) => {
  share.db.prepare('update users set banned_reason = ? where id = ?').run([reason, userID])
}

exports.exists = (userID) => {
  let row = share.db.prepare('select id from users where id = ?').get([userID])

  return Boolean(row)
}

exports.updateStats = (userID, __score) => {
  if (!exports.exists(userID)) {
    return undefined
  }

  let mode = __score.gameMode

  share.db.prepare(`update user_status set total_score_${mode}=total_score_${mode}+$s, playcount_${mode}=playcount_${mode}+1 where id = $id`).run({s: __score.score, id: userID})

  exports.updateLevel(userID, __score.gameMode)

  if (__score.passed) {
    share.db.prepare(`update user_status set ranked_score_${mode}=ranked_score_${mode}+? where id = ?`).run([__score.rankedScoreIncrease, userID])

    exports.updateAccuracy(userID, __score.gameMode)

    exports.updatePP(userID, __score.gameMode)
  }
}

exports.updatePP = (userID, gameMode) => {
  let newPP = exports.calculatePP(userID, gameMode)
  share.db.prepare(`update user_status set pp_${gameMode}=? where id = ?`).run([newPP, userID])
}

exports.calculatePP = (userID, gameMode) => {
  let bestPPScores
  let rows = share.db.prepare('select pp from scores where userid = ? and play_mode = ? and completed = 3 order by pp desc limit 500').all([userID, gameMode])
  bestPPScores = rows

  let totalPP = 0
  if ((typeof bestPPScores) !== 'undefined') {
    let k = 0
    bestPPScores.forEach(i => {
      let neww = Math.round(Math.round(i.pp) * 0.95 ** k)
      totalPP += neww
      k += 1
    })
  }

  return totalPP
}

exports.updateAccuracy = (userID, gameMode) => {
  let newAcc = exports.calculateAccuracy(userID, gameMode)
  share.db.prepare(`update user_status set accuracy_${gameMode} = ? where id = ?`).run([newAcc, userID])
}

exports.calculateAccuracy = (userID, gameMode) => {
  let sortby

  if (gameMode === 0) {
    sortby = 'pp'
  } else {
    sortby = 'accuracy'
  }

  let bestAccScores
  let rows = share.db.prepare(`select accuracy from scores where userid = ? and play_mode = ? and completed = 3 order by ${sortby} desc limit 500`).all([userID, gameMode])
  bestAccScores = rows

  let v = 0
  if ((typeof bestAccScores) !== 'undefined') {
    let totalAcc = 0
    let divideTotal = 0
    let k = 0
    bestAccScores.forEach(i => {
      let add = Math.round((0.95 ** k) * 100)
      totalAcc += i.accuracy * add
      divideTotal += add
      k += 1
    })

    if (divideTotal !== 0) {
      v = totalAcc / divideTotal
    } else {
      v = 0
    }
  }
  return v
}

exports.updateLevel = (userID, gameMode = 0, totalScore = 0) => {
  if (totalScore === 0) {
    totalScore = undefined
    let row = share.db.prepare(`select total_score_${gameMode} as total_score from user_status where id = ?`).get([userID])
    totalScore = row

    if ((typeof totalScore) !== 'undefined') {
      totalScore = totalScore.total_score
    }
  }

  let level = exports.getLevel(totalScore)

  share.db.prepare(`update user_status set level_${gameMode} = ? where id = ?`).run([level, userID])
}

exports.getLevel = (totalScore) => {
  let level = 1
  let reqScore
  while (true) {
    if (level > 8000) {
      return level
    }

    reqScore = exports.getRequiredScoreForLevel(level)

    if (totalScore <= reqScore) {
      return level - 1
    } else {
      level++
    }
  }
}

exports.getRequiredScoreForLevel = (level) => {
  if (level <= 100) {
    if (level >= 2) {
      return 5000 / 3 * (4 * (level ** 3) - 3 * (level ** 2) - level) + 1.25 * (1.8 ** (level - 60))
    } else if ((level <= 0) || (level === 1)) {
      return 1
    }
  } else if (level >= 101) {
    return 26931190829 + 100000000000 * (level - 100)
  }
}

const share = require('../share')
