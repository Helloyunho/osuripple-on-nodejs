module.exports = class {
  constructor (scoreID = undefined, rank = undefined, setData = true) {
    this.scoreID = 0
    this.playerName = 'nospe'
    this.score = 0
    this.maxCombo = 0
    this.c50 = 0
    this.c100 = 0
    this.c300 = 0
    this.cMiss = 0
    this.cKatu = 0
    this.cGeki = 0
    this.fullCombo = false
    this.mods = 0
    this.playerUserID = 0
    this.rank = rank
    this.date = 0
    this.hasReplay = 0

    this.fileMd5 = undefined
    this.passed = false
    this.playDateTime = 0
    this.gameMode = 0
    this.completed = 0

    this.accuracy = 0.00

    this.pp = 0.00

    this.oldPersonalBest = 0
    this.rankedScoreIncrease = 0

    if ((typeof scoreID) !== 'undefined' && setData) {
      this.setDataFromDB(scoreID, rank)
    }
  }

  setDataFromDB (scoreID, rank = undefined) {
    let row = share.db.prepare('select scores.*, users.username from scores left join users on users.id = scores.userid where scores.id = ?').get([scoreID])
    this.setDataFromDict(row, rank)
  }

  setDataFromDict (data, rank = undefined) {
    this.scoreID = data.id
    if ('username' in data) {
      this.playerName = data.username
    } else {
      this.playerName = user.getUsernameFromId(data.userid)
    }
    this.playerUserID = data.userid
    this.score = data.score
    this.maxCombo = data.max_combo
    this.gameMode = data.play_mode
    this.c50 = data['50_count']
    this.c100 = data['100_count']
    this.c300 = data['300_count']
    this.cMiss = data.misses_count
    this.cKatu = data.katus_count
    this.cGeki = data.gekis_count
    this.fullCombo = data.full_combo === 1
    this.mods = data.mods
    this.rank = ((typeof rank) !== 'undefined') ? rank : ''
    this.date = data.time
    this.fileMd5 = data.beatmap_md5
    this.completed = data.completed
    this.pp = data.pp
    this.calculateAccuracy()
  }

  calculateAccuracy () {
    let totalPoints
    let totalHits
    if (this.gameMode === 0) {
      totalPoints = (this.c50 * 50) + (this.c100 * 100) + (this.c300 * 300)
      totalHits = this.c300 + this.c100 + this.c50 + this.cMiss
      if (totalHits === 0) {
        this.accuracy = 1
      } else {
        this.accuracy = totalPoints / (totalHits * 300)
      }
    } else if (this.gameMode === 1) {
      totalPoints = (this.c100 * 50) + (this.c300 * 100)
      totalHits = this.cMiss + this.c100 + this.c300
      if (totalHits === 0) {
        this.accuracy = 1
      } else {
        this.accuracy = totalPoints / (totalHits * 100)
      }
    } else if (this.gameMode === 2) {
      totalPoints = this.c300 + this.c100 + this.c50
      totalHits = totalPoints + this.cMiss + this.cKatu
      if (totalHits === 0) {
        this.accuracy = 1
      } else {
        this.accuracy = totalPoints / totalHits
      }
    } else if (this.gameMode === 3) {
      totalPoints = (this.c50 * 50) + (this.c100 * 100) + (this.cKatu * 200) + (this.c300 * 300) + (this.cGeki * 300)
      totalHits = this.cMiss + this.c50 + this.c100 + this.c300 + this.cGeki + this.cKatu
      this.accuracy = totalPoints / (totalHits * 300)
    } else {
      this.accuracy = 0
    }
  }

  setRank (rank) {
    this.rank = rank
  }

  setDataFromScoreData (scoreData) {
    if (scoreData.length >= 16) {
      this.fileMd5 = scoreData[0]
      this.playerName = scoreData[1].replace(' ', '')
      this.c300 = Number(scoreData[3])
      this.c100 = Number(scoreData[4])
      this.c50 = Number(scoreData[5])
      this.cGeki = Number(scoreData[6])
      this.cKatu = Number(scoreData[7])
      this.cMiss = Number(scoreData[8])
      this.score = Number(scoreData[9])
      this.maxCombo = Number(scoreData[10])
      this.fullCombo = scoreData[11] === 'True'
      this.mods = Number(scoreData[13])
      this.passed = scoreData[14] === 'True'
      this.gameMode = Number(scoreData[15])
      this.playDateTime = Number(Date.now())
      this.calculateAccuracy()

      this.setCompletedStatus()
    }
  }

  setCompletedStatus () {
    this.completed = 0
    if ((this.passed === true) && scoreutil.isRankable(this.mods)) {
      let userID = user.getIdFromUsername(this.playerName)

      let row = share.db.prepare('select id from scores where userid = ? and beatmap_md5 = ? and play_mode = ? and score = ?').get([userID, this.fileMd5, this.gameMode, this.score])
      if (row) {
        this.completed = -1
        return undefined
      }
      row = share.db.prepare('select id, score from scores where userid = ? and beatmap_md5 = ? and play_mode = ? and completed = 3').get([userID, this.fileMd5, this.gameMode])
      if (!row) {
        this.completed = 3
        this.rankedScoreIncrease = this.score
        this.oldPersonalBest = 0
      } else {
        if (this.score > row.score) {
          this.completed = 3
          this.rankedScoreIncrease = this.score - row.scoreget
          this.oldPersonalBest = row.id
        } else {
          this.completed = 2
          this.rankedScoreIncrease = 0
          this.oldPersonalBest = 0
        }
      }
    }
  }

  saveScoreInDB () {
    console.log(this.completed)
    if (this.completed >= 2) {
      let row = share.db.prepare('INSERT INTO scores (id, beatmap_md5, userid, score, max_combo, full_combo, mods, `300_count`, `100_count`, `50_count`, katus_count, gekis_count, misses_count, time, play_mode, completed, accuracy, pp) VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run([this.fileMd5, user.getIdFromUsername(this.playerName), this.score, this.maxCombo, (this.fullCombo) ? 1 : 0, this.mods, this.c300, this.c100, this.c50, this.cKatu, this.cGeki, this.cMiss, this.playDateTime, this.gameMode, this.completed, this.accuracy, this.pp])
      this.scoreID = row.lastInsertROWID

      if (this.oldPersonalBest !== 0) {
        share.db.prepare('update scores set completed = 2 where id = ?').run([this.scoreID])
      }
    }
  }

  calculatePP (b = undefined) {
    if ((typeof b) === 'undefined') {
      b = new Beatmap(this.fileMd5, 0)
    }

    console.log((b.rankedStatus >= rankedType.Statuser.RANKED))
    console.log((b.rankedStatus >= rankedType.Statuser.UNKNOWN))
    console.log(scoreutil.isRankable(this.mods))
    console.log(this.passed)

    if ((b.rankedStatus >= rankedType.Statuser.RANKED) && (b.rankedStatus >= rankedType.Statuser.UNKNOWN) && scoreutil.isRankable(this.mods) && this.passed) {
      console.log('calculating pp...')
      let calculator = new Pp(b, this)
      console.log('pp = ' + calculator.pp)
      this.pp = calculator.pp
    } else {
      this.pp = 0
    }
  }

  getData (pp = false) {
    return `${this.scoreID}|${this.playerName}|${(pp) ? Math.round(this.pp) : this.score}|${this.maxCombo}|${this.c50}|${this.c100}|${this.c300}|${this.cMiss}|${this.cKatu}|${this.cGeki}|${this.fullCombo}|${this.mods}|${this.playerUserID}|${this.rank}|${this.date}|1\n`
  }
}

const share = require('../share')
const Beatmap = require('./beatmap')
const user = require('./user')
const rankedType = require('./rankedType')
const scoreutil = require('./scoreutil')
const Pp = require('../pp')
