const sqlite3 = require('sqlite3').verbose()

const deasync = require('deasync')

let db = new sqlite3.Database('./db/osu.db', (err) => {
  if (err) {
    return console.error(err.message)
  }
})

exports.getIdFromUsername = (username) => {
  let done = false
  let data = null
  db.each('select id from users where username = (?)', [username], (err, row) => {
    if (err) {
      console.error(err)
      done = true
      return
    }
    data = row.id
  }, () => {
    done = true
  })
  deasync.loopWhile(() => {
    return !done
  })
  return data
}

exports.getUsernameFromId = (id) => {
  let done = false
  let data = null
  db.each('select username from users where id = (?)', [id], (err, row) => {
    if (err) {
      console.error(err)
      done = true
      return
    }
    data = row.username
    done = true
  }, () => {
    done = true
  })
  deasync.loopWhile(() => {
    return !done
  })
  return data
}

exports.getEasyUsernameFromId = (id) => {
  let done = false
  let data = null
  db.each('select username_easy from users where id = (?)', [id], (err, row) => {
    if (err) {
      console.error(err)
      done = true
      return
    }
    data = row.username_easy
    done = true
  }, () => {
    done = true
  })
  deasync.loopWhile(() => {
    return !done
  })
  return data
}

exports.checkLoginIsOk = (id, pass) => {
  let done = false
  let data = null
  db.each('select password from users where id = (?)', [id], (err, row) => {
    if (err) {
      console.error(err)
      done = true
      return
    }
    data = row.password === pass
    done = true
  }, () => {
    done = true
  })
  deasync.loopWhile(() => {
    return !done
  })
  return data
}

exports.getPermission = (id) => {
  let done = false
  let data = null
  db.each('select permission from users where id = (?)', [id], (err, row) => {
    if (err) {
      console.error(err)
      done = true
      return
    }
    data = row.permission
    done = true
  }, () => {
    done = true
  })
  deasync.loopWhile(() => {
    return !done
  })
  return data
}

exports.getFriends = (id) => {
  let done = false
  let data = []
  db.all('select friendid from friends where userid = (?)', [id], (err, rows) => {
    if (err) {
      console.error(err)
      done = true
      return
    }
    rows.forEach((a) => {
      data.push(a)
    })
    done = true
  }, () => {
    done = true
  })
  deasync.loopWhile(() => {
    return !done
  })
  if (!data) {
    data = [0]
  }
  return data
}

exports.getStatus = (id, mode) => {
  let done = false
  let data = {}
  db.each(`select ranked_score_${mode} as rankedScore, accuracy_${mode} as accuracy, playcount_${mode} as playcount, total_score_${mode} as totalScore, pp_${mode} as pp, game_rank_${mode} as game_rank from user_status where id = ${id}`, (err, row) => {
    if (err) {
      console.error(err)
      done = true
      return
    }
    data = row
    done = true
  }, () => {
    done = true
  })
  deasync.loopWhile(() => {
    return !done
  })
  return data
}

exports.getGameRank = (id, mode) => {
  let done = false
  let data = null
  db.each(`select game_rank_${mode} as game_rank from user_status where id = ${id}`, (err, row) => {
    if (err) {
      console.error(err)
      done = true
      return
    }
    data = row.game_rank
    done = true
  }, () => {
    done = true
  })
  deasync.loopWhile(() => {
    return !done
  })
  return data
}

exports.silence = (id, sec, silenceReason, author = 1) => {
  let silenceEndTime = Date.now() + sec
  db.run('update users set silence_time = ?, silence_reason = ? where id = ?', [silenceEndTime, silenceReason, id])

  if (sec > 0) {
    share.log_file.write(`UserID ${id} has silenced for ${sec} by ${author}`)
  } else {
    share.log_file.write(`UserID ${id}'s silence has removed by ${author}`)
  }
}

exports.getSilenceEnd = (id) => {
  let done = false
  let data = null
  db.each('select silence_time from users where id = ?', [id], (err, row) => {
    if (err) {
      console.error(err)
      done = true
      return
    }
    data = row.silence_time
    done = true
  }, () => {
    done = true
  })
  deasync.loopWhile(() => {
    return !done
  })

  return data
}

exports.updateLatestActivity = id => {
  db.run('update users set latest_activity = ? where id = ?', [Date.now(), id])
}

exports.setCountry = (id, country) => {
  db.run('update user_status set country = ? where id = ?', [country, id])
}

exports.getCountry = (id) => {
  let done = false
  let data = null
  db.each('select country from user_status where id = ?', [id], (err, row) => {
    if (err) {
      console.error(err)
      done = true
      return
    }
    data = row.country
    done = true
  }, () => {
    done = true
  })
  deasync.loopWhile(() => {
    return !done
  })

  return data
}

process.on('exit', () => {
  db.close((err) => {
    if (err) {
      return console.error(err)
    }
  })
})

const share = require('../share')
