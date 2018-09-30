const encoding = require('encoding')
const {StringDecoder} = require('string_decoder')
const decoding = new StringDecoder('utf8')

module.exports = class {
  constructor (md5 = undefined, beatmapSetID = undefined, gameMode = 0, refresh = false) {
    this.songName = ''
    this.fileMD5 = ''
    this.rankedStatus = rankedType.Statuser.NOT_SUBMITTED
    this.rankedStatusFrozen = 0
    this.beatmapID = 0
    this.beatmapSetID = 0
    this.offset = 0
    this.rating = 10.0

    this.starsStd = 0.0
    this.starsTaiko = 0.0
    this.starsCtb = 0.0
    this.starsMania = 0.0
    this.AR = 0.0
    this.OD = 0.0
    this.maxCombo = 0
    this.hitLength = 0
    this.bpm = 0

    this.playcount = 0

    this.refresh = refresh

    if (((typeof md5) !== 'undefined') && (typeof (beatmapSetID) !== 'undefined')) {
      this.setData(md5, beatmapSetID)
    }
  }

  setDataFromDB (md5) {
    let row = db.prepare('SELECT * FROM beatmaps WHERE beatmap_md5 = ?').get([md5])
    console.log(Boolean(row))
    if (row) {
      if ((row.difficulty_taiko === 0) && (row.difficulty_ctb === 0) && (row.difficulty_mania === 0)) {
        consoleColor.debug('Difficulty for non-std gamemodes not found in DB, refreshing data from osu!api...')
        return false
      }

      let expire = share.config.beatmapcacheexpire

      console.log(expire)
      if ((row.ranked >= rankedType.Statuser.RANKED) && (row.ranked_status_freezed === 0)) {
        expire *= 3
      }

      console.log(row.latest_update)
      console.log((expire > 0) && (Date.now() > (row.latest_update + expire)))
      if ((expire > 0) && (Date.now() > (Number(row.latest_update) + Number(expire)))) {
        if (row.ranked_status_freezed === 1) {
          this.setDataFromDict(row)
        }
        return false
      }

      consoleColor.debug('Got beatmap data from db')
      this.setDataFromDict(row)
      return true
    } else {
      return false
    }
  }

  setDataFromDict (data) {
    this.songName = data.song_name
    this.fileMD5 = data.beatmap_md5
    this.rankedStatus = Number(data.ranked)
    this.rankedStatusFrozen = Number(data.ranked_status_freezed)
    this.beatmapID = Number(data.beatmap_id)
    this.beatmapSetID = Number(data.beatmapset_id)
    this.AR = Number(data.ar)
    this.OD = Number(data.od)
    this.starsStd = Number(data.difficulty_std)
    this.starsTaiko = Number(data.difficulty_taiko)
    this.starsCtb = Number(data.difficulty_ctb)
    this.starsMania = Number(data.difficulty_mania)
    this.maxCombo = Number(data.max_combo)
    this.hitLength = Number(data.hit_length)
    this.bpm = Number(data.bpm)

    this.playcount = ('playcount' in data) ? data.playcount : 0
    this.passcount = ('passcount' in data) ? data.passcount : 0
  }

  setData (md5, beatmapSetID) {
    let dbResult = this.setDataFromDB(md5)

    if (dbResult && this.refresh) {
      dbResult = false
    }

    if (!dbResult) {
      consoleColor.debug('Beatmap not found in db')

      let apiResult = this.setDataFromOsuApi(md5, beatmapSetID)
      if (!apiResult) {
        this.rankedStatus = rankedType.Statuser.NOT_SUBMITTED
      }
      if (apiResult && (this.rankedStatus !== rankedType.Statuser.NOT_SUBMITTED) && (this.rankedStatus !== rankedType.Statuser.NEED_UPDATE)) {
        this.addBeatmapToDB()
      }
    } else {
      consoleColor.debug('Beatmap found in db')
    }

    consoleColor.debug(`${this.starsStd}\n${this.starsTaiko}\n${this.starsCtb}\n${this.starsMania}`)
  }

  setDataFromOsuApi (md5, beatmapSetID) {
    let mainData
    let dataStd = osuapi.osuApiRequest('get_beatmaps', `h=${md5}&a=1&m=0`)
    let dataTaiko = osuapi.osuApiRequest('get_beatmaps', `h=${md5}&a=1&m=1`)
    let dataCtb = osuapi.osuApiRequest('get_beatmaps', `h=${md5}&a=1&m=2`)
    let dataMania = osuapi.osuApiRequest('get_beatmaps', `h=${md5}&a=1&m=3`)
    if ((typeof dataStd) !== 'undefined') {
      mainData = dataStd
    }
    if ((typeof dataTaiko) !== 'undefined') {
      mainData = dataTaiko
    }
    if ((typeof dataCtb) !== 'undefined') {
      mainData = dataCtb
    }
    if ((typeof dataMania) !== 'undefined') {
      mainData = dataMania
    }

    if (((typeof mainData) !== 'undefined') && (this.rankedStatusFrozen === 1)) {
      return true
    }

    if ((typeof mainData) === 'undefined') {
      consoleColor.debug('osu! api data is undefined')
      dataStd = osuapi.osuApiRequest('get_beatmaps', `s=${beatmapSetID}&a=1&m=0`)
      dataTaiko = osuapi.osuApiRequest('get_beatmaps', `s=${beatmapSetID}&a=1&m=1`)
      dataCtb = osuapi.osuApiRequest('get_beatmaps', `s=${beatmapSetID}&a=1&m=2`)
      dataMania = osuapi.osuApiRequest('get_beatmaps', `s=${beatmapSetID}&a=1&m=3`)
      if ((typeof dataStd) !== 'undefined') {
        mainData = dataStd
      }
      if ((typeof dataTaiko) !== 'undefined') {
        mainData = dataTaiko
      }
      if ((typeof dataCtb) !== 'undefined') {
        mainData = dataCtb
      }
      if ((typeof dataMania) !== 'undefined') {
        mainData = dataMania
      }

      if ((typeof mainData) === 'undefined') {
        return false
      } else {
        this.rankedStatus = rankedType.Statuser.NEED_UPDATE
        return true
      }
    }

    consoleColor.debug('Got beatmap data from osu! api')
    this.songName = `${mainData.artist} - ${mainData.title} [${mainData.version}]`
    this.fileMD5 = md5
    this.rankedStatus = convertRankedStatus(Number(mainData.approved))
    this.beatmapID = Number(mainData.beatmap_id)
    this.beatmapSetID = Number(mainData.beatmapset_id)
    this.AR = Number(mainData.diff_approach)
    this.OD = Number(mainData.diff_overall)

    this.starsStd = 0.0
    this.starsTaiko = 0.0
    this.starsCtb = 0.0
    this.starsMania = 0.0
    if ((typeof dataStd) !== 'undefined') {
      this.starsStd = Number(dataStd.difficultyrating)
    }
    if ((typeof dataTaiko) !== 'undefined') {
      this.starsTaiko = Number(dataTaiko.difficultyrating)
    }
    if ((typeof dataCtb) !== 'undefined') {
      this.starsCtb = Number(dataCtb.difficultyrating)
    }
    if ((typeof dataMania) !== 'undefined') {
      this.starsMania = Number(dataMania.difficultyrating)
    }

    this.maxCombo = ((typeof mainData.max_combo) !== 'undefined') ? Number(mainData.max_combo) : 0
    this.hitLength = Number(mainData.hit_length)
    this.bpm = ((typeof mainData.bpm) !== 'undefined') ? Math.round(Number(mainData.bpm)) : -1
    return true
  }

  addBeatmapToDB () {
    let frozen = 0
    let bdata = db.prepare('select id, ranked_status_freezed, ranked from beatmaps where beatmap_md5 = ? or beatmap_id = ?').get([this.fileMD5, this.beatmapID])

    if (bdata) {
      frozen = bdata.ranked_status_freezed
      if (frozen === 1) {
        this.rankedStatus = bdata.ranked
      }
      consoleColor.debug('Old beatmap data has detected, Deleting...')
      db.prepare('delete from beatmaps where id = ?').run(bdata.id)
    }

    consoleColor.debug('Saving beatmap data in db...')
    db.prepare('insert into beatmaps (`id`, `beatmap_id`, `beatmapset_id`, `beatmap_md5`, `song_name`, `ar`, `od`, `difficulty_std`, `difficulty_taiko`, `difficulty_ctb`, `difficulty_mania`, `max_combo`, `hit_length`, `bpm`, `ranked`, `latest_update`, `ranked_status_freezed`) VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run([
      this.beatmapID,
      this.beatmapSetID,
      this.fileMD5,
      decoding.end(encoding.convert(this.songName, 'utf8')),
      this.AR,
      this.OD,
      this.starsStd,
      this.starsTaiko,
      this.starsCtb,
      this.starsMania,
      this.maxCombo,
      this.hitLength,
      this.bpm,
      (frozen === 0) ? this.rankedStatus : 2,
      Number(Date.now()),
      frozen
    ])
  }

  getData (totalScores = 0, version = 4) {
    let rankedStatusOutput
    if ((version < 4) && (this.rankedStatus === rankedType.Statuser.LOVED)) {
      rankedStatusOutput = rankedType.Statuser.QUALIFIED
    } else {
      rankedStatusOutput = this.rankedStatus
    }
    let data = `${rankedStatusOutput}|false`
    if ((this.rankedStatus !== rankedType.Statuser.NOT_SUBMITTED) && (this.rankedStatus !== rankedType.Statuser.NEED_UPDATE) && (this.rankedStatus !== rankedType.UNKNOWN)) {
      data += `|${this.beatmapID}|${this.beatmapSetID}|${totalScores}\n${this.offset}\n${this.songName}\n${this.rating}\n`
    }
    return data
  }

  getCachedTillerinoPP () {
    let data = db.prepare('select pp_100, pp_99, pp_98, pp_95 from beatmaps where beatmap_md5 = ?').get([this.fileMD5])

    if (!data) {
      return [0, 0, 0, 0]
    }

    return [data['pp_100'], data['pp_99'], data['pp_98'], data['pp_95']]
  }

  saveCachedTillerinoPP (l) {
    db.prepare('update beatmaps set pp_100 = ?, pp_99 = ? , pp_98 = ?, pp_95 = ? where beatmap_md5 = ?').run([l[0], l[1], l[2], l[3], this.fileMD5])
  }

  isRankable () {
    return (this.rankedStatus >= rankedType.Statuser.RANKED) && (this.rankedStatus !== rankedType.Statuser.UNKNOWN)
  }
}

const convertRankedStatus = (approvedStatus) => {
  approvedStatus = Number(approvedStatus)
  if (approvedStatus <= 0) {
    return rankedType.Statuser.PENDING
  } else if (approvedStatus === 1) {
    return rankedType.Statuser.RANKED
  } else if (approvedStatus === 2) {
    return rankedType.Statuser.APPROVED
  } else if (approvedStatus === 3) {
    return rankedType.Statuser.QUALIFIED
  } else if (approvedStatus === 4) {
    return rankedType.Statuser.LOVED
  } else {
    return rankedType.Statuser.UNKNOWN
  }
}

module.exports.incrementPlaycount = (md5, passed) => {
  db.prepare('update beatmaps set playcount = playcount+1 where beatmap_md5 = ?').run([md5])
  if (passed) {
    db.prepare('update beatmaps set passcount = passcount+1 where beatmap_md5 = ?').run([md5])
  }
}

const rankedType = require('./rankedType')
const consoleColor = require('./consoleColor')
const osuapi = require('./osuapi')
const share = require('../share')
const db = require('../db')
