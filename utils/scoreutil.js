module.exports.isRankable = (m) => {
  return !((m & mods.RELAX > 0) || (m & mods.RELAX2 > 0) || (m & mods.AUTOPLAY > 0) || (m & mods.SCOREV2 > 0))
}

module.exports.readableGameMode = (gameMode) => {
  if (gameMode === 0) {
    return 'std'
  } else if (gameMode === 1) {
    return 'taiko'
  } else if (gameMode === 2) {
    return 'ctb'
  } else {
    return 'mania'
  }
}

module.exports.readableMods = (m) => {
  let r = ''
  if (m === 0) {
    return 'nomod'
  }

  if (m & mods.NOFAIL > 0) {
    r += 'NF'
  }
  if (m & mods.EASY > 0) {
    r += 'EZ'
  }
  if (m & mods.HIDDEN > 0) {
    r += 'HD'
  }
  if (m & mods.HARDROCK > 0) {
    r += 'HR'
  }
  if (m & mods.DOUBLETIME > 0) {
    r += 'DT'
  }
  if (m & mods.HALFTIME > 0) {
    r += 'HT'
  }
  if (m & mods.FLASHLIGHT > 0) {
    r += 'FL'
  }
  if (m & mods.SPUNOUT > 0) {
    r += 'SO'
  }
  if (m & mods.TOUCHSCREEN > 0) {
    r += 'TD'
  }
  return r
}

const mods = require('./mods')
