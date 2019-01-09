const Rijndael = require('rijndael-js')
const fs = require('fs')
const path = require('path')

module.exports = (req, res) => {
  let okArgs = true
  let args = ['score', 'iv', 'pass']
  args.forEach(i => {
    if (!(i in req.body)) {
      okArgs = false
    }
  })

  if (!okArgs) {
    res.send('error: meme')
    return undefined
  }

  let scoreDataEnc = req.body.score
  let iv = req.body.iv
  let password = req.body.pass
  let bmk
  let bml

  if (('bmk' in req.body) && ('bml' in req.body)) {
    bmk = req.body.bmk
    bml = req.body.bml
  }

  let aeskey
  if ('osuver' in req.body) {
    aeskey = `osu!-scoreburgr---------${req.body.osuver}`
  } else {
    aeskey = 'h89f2-890h2h89b34g-h80g134n90133'
  }

  const cipher = new Rijndael(aeskey, 'cbc')
  let scoreData = cipher.decrypt(Buffer.from(scoreDataEnc, 'base64'), 256, Buffer.from(iv, 'base64')).toString('latin1').split(':')
  let username = scoreData[1].replace(' ', '')

  let userID = utils.user.getIdFromUsername(username)

  if (!userID) {
    res.send('error: pass')
    res.end()
    return undefined
  }
  if (!utils.user.checkLoginIsOk(userID, password)) {
    res.send('error: pass')
    res.end()
    return undefined
  }

  if (scoreData.length < 16) {
    res.send('error: meme')
    res.end()
    return undefined
  }

  let restricted = Boolean(utils.user.getPermission(userID) & permission.restricted)

  utils.consoleColor.log(`${username} has submitted a score on ${scoreData[0]}`)
  let s = new utils.score()
  s.setDataFromScoreData(scoreData)

  if (s.completed === -1) {
    utils.consoleColor.warn('Score is duplicated. this is normal right after restarted server.')
    res.end()
    return undefined
  }

  s.playerUserID = userID

  let beatmapInfo = new utils.beatmap()
  beatmapInfo.setDataFromDB(s.fileMd5)

  console.log(beatmapInfo.rankedStatus + '\n\n' + s.fileMd5)

  if ((beatmapInfo.rankedStatus === utils.rankedType.Statuser.NOT_SUBMITTED) || (beatmapInfo.rankedStatus === utils.rankedType.Statuser.NEED_UPDATE) || (beatmapInfo.rankedStatus === utils.rankedType.Statuser.UNKNOWN)) {
    utils.consoleColor.debug('Beatmap is not submitted, outdated or unknown. Submitting failed.')
    return undefined
  }

  s.calculatePP()
  console.log('PP calculated')

  if ((s.pp >= 700) && s.gameMode === utils.gamemodes.STD && !restricted) {
    utils.user.restrict(userID)
    utils.user.restrict_reason(userID, `Restricted due to too high pp gain (${s.pp}pp)`)
  }

  if (bmk !== bml && !restricted) {
    utils.user.restrict(userID)
    utils.user.restrict_reason(userID, `Restricted due to change beatmap hack`)
  }

  let oldPersonalBestRank
  let oldPersonalBest
  if (s.passed && s.oldPersonalBest > 0) {
    oldPersonalBestRank = share.personalBestCache.get(userID, s.fileMd5)
    if (oldPersonalBestRank === 0) {
      let oldScoreboard = new utils.scoreboard(username, s.gameMode, beatmapInfo, false)
      oldScoreboard.setPersonalBestRank()
      oldPersonalBestRank = Math.max(s.oldPersonalBest, oldPersonalBestRank)
    }
    oldPersonalBest = new utils.score(s.oldPersonalBest, oldPersonalBestRank)
  } else {
    oldPersonalBestRank = 0
  }

  console.log('Saving score...')
  s.saveScoreInDB()
  console.log('Done!')

  if (((s.score < 0) || (s.score > ((2 ** 63) - 1))) && !restricted) {
    utils.user.restrict(userID)
    utils.user.restrict_reason(userID, `Banned due to negative score (score submitter)`)
  }

  if ((s.gameMode === utils.gamemodes.MANIA) && (s.score > 1000000)) {
    utils.user.restrict(userID)
    utils.user.restrict_reason(userID, `Banned due to mania score > 1000000 (score submitter)`)
  }

  if ((((s.mods & utils.mods.DOUBLETIME) > 0 && (s.mods & utils.mods.HALFTIME) > 0) || ((s.mods & utils.mods.HARDROCK) > 0 && (s.mods & utils.mods.EASY) > 0) || ((s.mods & utils.mods.SUDDENDEATH) > 0 && (s.mods & utils.mods.NOFAIL) > 0)) && !restricted) {
    utils.user.restrict(userID)
    utils.user.restrict_reason(userID, `Impossible mod combination ${s.mods} (score submitter)`)
  }

  if (s.passed && s.scoreID > 0) {
    if (req.files[0].length !== 0) {
      fs.writeFileSync(path.resolve('.data', 'replays', `replay_${s.scoreID}.osr`), req.files[0].buffer)
    } else {
      if (!restricted) {
        utils.user.restrict(userID)
        utils.user.restrict_reason(userID, `Missing replay file`)
      }
    }
  }

  utils.beatmap.incrementPlaycount(s.fileMd5, s.passed)

  if (s.passed) {
    let oldUserStats = share.userStatsCache.get(userID, s.gameMode)
    let oldRank = utils.user.getGameRank(userID, s.gameMode)

    utils.consoleColor.debug(`Updating ${username} stats...`)
    console.log(userID)
    utils.user.updateStats(userID, s)

    let newUserStats = utils.user.getStatus(userID, s.gameMode)
    share.userStatsCache.update(userID, s.gameMode, newUserStats)

    if ((s.completed === 3) && (newUserStats.pp !== oldUserStats.pp)) {
      utils.leaderboard.update(userID, newUserStats.pp, s.gameMode)
      utils.leaderboard.updateCountry(userID, newUserStats.pp, s.gameMode)
    }

    utils.user.updateLatestActivity(userID)

    utils.consoleColor.debug('Score submitting is done!')

    if (beatmapInfo && s.passed) {
      utils.consoleColor.debug('Started building ranking panel')
      share.redis.publish('bancho:update_cached_stats', userID)

      let newScoreboard = new utils.scoreboard(username, s.gameMode, beatmapInfo, false)
      newScoreboard.setPersonalBestRank()
      let personalBestID = newScoreboard.getPersonalBestID()
      let currentPersonalBest = new utils.score(personalBestID, newScoreboard.personalBestRank)

      let rankInfo = utils.leaderboard.getRankInfo(userID, s.gameMode)

      let output = []
      if (req.url === '/web/osu-submit-modular-selector.php') {
        output.push({
          beatmapId: beatmapInfo.beatmapID,
          beatmapSetId: beatmapInfo.beatmapSetID,
          beatmapPlaycount: beatmapInfo.playcount + 1,
          beatmapPasscount: beatmapInfo.passcount + (s.completed === 3),
          approvedDate: ''
        })
        let oldScore = s.completed === 3 ? oldPersonalBest : currentPersonalBest
        let newScore = s.completed === 3 ? currentPersonalBest : s
        output.push({
          chartId: 'beatmap',
          chartUrl: 'IDK',
          chartName: 'Beatmap Ranking',
          rankBefore: oldScore.rank || '',
          rankAfter: newScore.rank,
          maxComboBefore: oldScore.maxCombo || '0',
          maxComboAfter: newScore.maxCombo,
          accuracyBefore: (oldScore.accuracy * 100) || '0',
          accuracyAfter: (newScore.accuracy * 100),
          rankedScoreBefore: oldScore.score || '0',
          rankedScoreAfter: newScore.score,
          ppBefore: oldScore.pp || '0',
          ppAfter: newScore.pp,
          onlineScoreId: newScore.scoreID
        })
        output.push({
          chartId: 'overall',
          chartUrl: 'IDK',
          chartName: 'Overall Ranking',
          rankBefore: oldRank || '0',
          rankAfter: rankInfo.currentRank || '0',
          rankedScoreBefore: oldScore.rankedScore || '0',
          rankedScoreAfter: newScore.rankedScore || '0',
          totalScoreBefore: oldUserStats.totalScore || '0',
          totalScoreAfter: newUserStats.totalScore || '0',
          maxComboBefore: '0',
          maxComboAfter: '0',
          accuracyBefore: (oldUserStats.accuracy) || '0',
          accuracyAfter: (newUserStats.accuracy) || '0',
          ppBefore: oldUserStats.pp || '0',
          ppAfter: newUserStats.pp || '0',
          'achievements-new': '',
          onlineScoreId: s.scoreID
        })
      } else {
        output.push({
          beatmapId: beatmapInfo.beatmapID,
          beatmapSetId: beatmapInfo.beatmapSetID,
          beatmapPlaycount: beatmapInfo.playcount,
          beatmapPasscount: beatmapInfo.passcount,
          approvedDate: ''
        })
        output.push({
          chartId: 'overall',
          chartName: 'Overall Ranking',
          chartEndDate: '',
          beatmapRankingBefore: oldPersonalBestRank,
          beatmapRankingAfter: newScoreboard.personalBestRank,
          rankedScoreBefore: oldUserStats['rankedScore'],
          rankedScoreAfter: newUserStats['rankedScore'],
          totalScoreBefore: oldUserStats['totalScore'],
          totalScoreAfter: newUserStats['totalScore'],
          playCountBefore: newUserStats['playcount'],
          accuracyBefore: Number(oldUserStats['accuracy']) / 100,
          accuracyAfter: Number(newUserStats['accuracy']) / 100,
          rankBefore: oldRank,
          rankAfter: rankInfo['currentRank'],
          toNextRank: rankInfo['difference'],
          toNextRankUser: rankInfo['nextUsername'],
          achievements: '',
          'achievements-new': '',
          onlineScoreId: s.scoreID
        })
      }

      let msg = ''
      output = output.map(x => {
        let a = []
        Object.keys(x).forEach(y => {
          a.push(`${y}:${x[y]}`)
        })
        return a.join('|')
      })
      console.log(output)
      msg = output.join('\n')

      utils.consoleColor.debug('Generated output for online ranking screen!')
      utils.consoleColor.debug(msg)

      res.send(msg)
      res.end()
    }
  } else {
    res.send('ok')
    res.end()
  }
  return true
}

const share = require('../../share')
const utils = require('../../utils')
const permission = require('../../permission')
