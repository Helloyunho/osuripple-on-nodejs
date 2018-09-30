module.exports = class {
  constructor (username, gameMode, beatmap, setScores = true, country = false, friends = false, mods = -1) {
    this.scores = []
    this.totalScores = 0
    this.personalBestRank = -1
    this.username = username
    this.userID = user.getIdFromUsername(this.username)
    this.gameMode = gameMode
    this.beatmap = beatmap
    this.country = country
    this.friends = friends
    this.mods = mods

    if (setScores) {
      this.setScores()
    }
  }

  setScores () {
    const buildQuery = (...params) => {
      return `${params[0]} ${params[1]} ${params[2]} ${params[3]} ${params[4]} ${params[5]} ${params[6]}`
    }

    this.scores = []
    this.scores.push(-1)

    if (this.beatmap.rankedStatus < rankedType.Statuser.RANKED) {
      return undefined
    }

    let select = ''
    let joins = ''
    let country = ''
    let mods = ''
    let friends = ''
    let order = ''
    let limit = ''
    let query = ''
    let params = {}
    let personalBestScore
    let s
    let c = 1
    let topScores

    if (this.userID !== 0) {
      select = `select id from scores where userid = $userid and beatmap_md5 = $md5 and play_mode = $mode and completed = 3`

      if (this.mods > -1) {
        mods = 'and mods = $mods'
      }

      if (this.friends) {
        friends = 'and (scores.userid in (select friendid from friends where userid = $userid) or scores.userid = $userid'
      }

      order = 'order by score desc'
      limit = 'limit 1'

      query = buildQuery(select, joins, country, mods, friends, order, limit)
      params = {userid: this.userID, md5: this.beatmap.fileMD5, mode: this.gameMode}
      if (this.mods > -1) {
        params.mods = this.mods
      }
      let row = db.prepare(query).get(params)
      personalBestScore = row
    }

    if ((typeof personalBestScore) !== 'undefined') {
      s = new Score(personalBestScore.id)
      this.scores[0] = s
    } else {
      this.scores[0] = -1
    }

    select = 'select *'
    joins = 'from scores join users on scores.userid = users.id join user_status on users.id = user_status.id where scores.beatmap_md5 = $beatmap_md5 and scores.play_mode = $play_mode and scores.completed = 3 and (users.permission & 1 > 0 or users.id = $userid)'

    if (this.country) {
      country = 'and user_status.country = (select country from user_status where id = $userid limit 1)'
    } else {
      country = ''
    }

    if ((this.mods > -1) && this.mods & modsEnum.AUTOPLAY === 0) {
      mods = 'and scores.mods = $mods'
    } else {
      mods = ''
    }

    if (this.friends) {
      friends = 'and scores.userid in (select friendid from friends where userid = $userid) or scores.userid = $userid'
    } else {
      friends = ''
    }

    if ((this.mods <= -1) || (this.mods & modsEnum.AUTOPLAY === 0)) {
      order = 'order by score desc'
    } else if (this.mods & modsEnum.AUTOPLAY > 0) {
      order = 'oder by pp desc'
    }
    limit = 'limit 50'

    query = buildQuery(select, joins, country, mods, friends, order, limit)
    params = {beatmap_md5: this.beatmap.fileMD5, play_mode: this.gameMode, userid: this.userID}
    if ((this.mods > -1) && this.mods & modsEnum.AUTOPLAY === 0) {
      params.mods = this.mods
    }
    let rows = db.prepare(query).all(params)

    if (rows !== []) {
      rows.forEach(topScore => {
        s = new Score(topScore.id, undefined, false)

        s.setDataFromDict(topScore)
        s.setRank(c)

        if (s.playerName === this.username) {
          this.personalBestRank = c
        }
        this.scores.push(s)
        c++
      })
    }

    if (((typeof personalBestScore) !== 'undefined') && this.personalBestRank < 1) {
      this.personalBestRank = share.personalBestCache.get(this.userID, this.beatmap.fileMD5, this.country, this.friends, this.mods)
    }

    if (((typeof personalBestScore) !== 'undefined') && this.personalBestRank < 1) {
      this.setPersonalBest()
    }

    if (this.personalBestRank >= 1) {
      share.personalBestCache.set(this.userID, this.personalBestRank, this.beatmap.fileMD5)
    }
  }

  setPersonalBest () {
    let query = 'select id from scores where beatmap_md5 = $md5 and userid = $userid and play_mode = $mode and completed = 3'

    if (this.mods > -1) {
      query += ' and scores.mods = $mods'
    }

    if (this.friends) {
      query += ' and (scores.userid in (select friendid from friends where userid = $userid) or scores.userid = $userid)'
    }

    query += ' limit 1'
    let hasScore
    let row = db.prepare(query).get((this.mods > -1) ? {md5: this.beatmap.fileMD5, userid: this.userID, mode: this.gameMode, mods: this.mods} : {md5: this.beatmap.fileMD5, userid: this.userID, mode: this.gameMode})
    hasScore = row

    if ((typeof hasScore) === 'undefined') {
      return undefined
    }

    query = 'select count(*) as rank from scores join users on scores.userid = users.id join user_status on users.id = user_status.id where scores.score >= (select score from scores where beatmap_md5 = $md5 and play_mode = $mode and completed = 3 and userid = $userid limit 1) and scores.beatmap_md5 = $md5 and scores.play_mode = $mode and scores.completed = 3 and users.permission & 1 > 0'

    if (this.country) {
      query += ' and user_status.country = (select country from user_status where id = $userid limit 1)'
    }
    if (this.mods > -1) {
      query += ' and scores.mods = $mods'
    }
    if (this.friends) {
      query += ' and (scores.userid in (select friendid from friends where userid = $userid) or scores.userid = $userid)'
    }

    query += ' order by score desc limit 1'
    row = db.prepare(query).get({md5: this.beatmap.fileMD5, userid: this.userID, mode: this.gameMode, mods: this.mods})

    if (row) {
      this.personalBestRank = row.rank
    }
  }

  getScoresData () {
    let data = ''

    if (this.scores[0] === -1) {
      data += '\n'
    } else {
      this.setPersonalBest()
      this.scores[0].setRank(this.personalBestRank)
      data += this.scores[0].getData()
    }

    this.scores.slice(1).forEach(i => {
      data += i.getData((this.mods > -1) && (this.mods & modsEnum.AUTOPLAY > 0))
    })
    return data
  }
}

const Score = require('./score')
const user = require('./user')
const rankedType = require('./rankedType')
const modsEnum = require('./mods')
const share = require('../share')
const db = require('../db')
