const fs = require('fs')
const crypto = require('crypto')

module.exports.buildFullReplay = (scoreID = undefined, scoreData = undefined, rawReplay = undefined) => {
  if ((!scoreID && !scoreData) || (scoreID && scoreData)) {
    return undefined
  }

  if (!scoreData) {
    scoreData = db.get('select scores.*, users.username from scores join users on scores.userid = users.id where scores.id = ?', [scoreID])
  } else {
    scoreID = scoreData.id
  }

  if (!scoreID && !scoreData) {
    return undefined
  }

  if (!rawReplay) {
    let fileName = `.data/replays/replay_${scoreID}.osr`
    if (!fs.existsSync(fileName)) {
      return undefined
    }

    rawReplay = fs.readFileSync(fileName)
  }

  let rank = general.getRank(Number(scoreData.play_mode), Number(scoreData.mods), Math.round(scoreData.accuracy), Number(scoreData['300_count']), Number(scoreData['100_count']), Number(scoreData['50_count']), Number(scoreData.misses_count))

  let magicHash = crypto.createHash('md5').update(`${Number(scoreData['100_count']) + Number(scoreData['300_count'])}p${scoreData['50_count']}o${scoreData.gekis_count}o${scoreData.katus_count}t${scoreData.misses_count}a${scoreData.beatmap_md5}r${scoreData.max_combo}e${(Number(scoreData.full_combo) === 1) ? 'True' : 'False'}y${scoreData.username}o${scoreData.score}u${rank}${scoreData.mods}${'True'}`).digest('hex')

  let fullReplay = packet.binaryWrite([
    [scoreData.play_mode, datatypes.byte],
    [20150414, datatypes.uInt32],
    [scoreData.beatmap_md5, datatypes.string],
    [scoreData.username, datatypes.string],
    [magicHash, datatypes.string],
    [scoreData['300_count'], datatypes.uInt16],
    [scoreData['100_count'], datatypes.uInt16],
    [scoreData['50_count'], datatypes.uInt16],
    [scoreData['gekis_count'], datatypes.uInt16],
    [scoreData['katus_count'], datatypes.uInt16],
    [scoreData['misses_count'], datatypes.uInt16],
    [scoreData.score, datatypes.uInt32],
    [scoreData.max_combo, datatypes.uInt16],
    [scoreData.full_combo, datatypes.byte],
    [scoreData.mods, datatypes.uInt32],
    [0, datatypes.byte],
    [0, datatypes.uInt64],
    [rawReplay, datatypes.rawReplay],
    [0, datatypes.uInt32],
    [0, datatypes.uInt32]
  ])

  return fullReplay
}

const db = require('../db')
const general = require('./general')
const packet = require('./packet')
const datatypes = require('../types').datatypes
