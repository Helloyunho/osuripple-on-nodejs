module.exports.getRank = (gameMode, __mods, acc, c300, c100, c50, cmiss) => {
  let total = c300 = c100 + c50 + cmiss
  let hdfl = ((__mods & mods.HIDDEN) > 0) || ((__mods & mods.FLASHLIGHT) > 0)

  const ss = () => {
    return (hdfl) ? 'XH' : 'X'
  }

  const s = () => {
    return (hdfl) ? 'SH' : 'S'
  }

  if (gameMode === 0) {
    if (acc === 100) {
      return ss()
    }
    if (((c300 / total) > 0.9) && ((c50 / total) < 0.1) && (cmiss === 0)) {
      return s()
    }
    if ((((c300 / total) > 0.8) && (cmiss == 0)) || ((c300 / total) > 0.9)) {
      return 'A'
    }
    if ((((c300 / total) > 0.7) && (cmiss == 0)) || ((c300 / total) > 0.8)) {
      return 'B'
    }
    if ((c300 / total) > 0.60) {
      return 'C'
    }
    return 'D'
  }
  if (gameMode === 1) {
    return 'A'
  }
  if (gameMode === 2) {
    if (acc === 100) {
      return ss()
    }
    if (98.01 <= acc <= 99.99) {
      return s()
    }
    if (94.01 <= acc <= 98.00) {
      return 'A'
    }
    if (90.01 <= acc <= 94.00) {
      return 'B'
    }
    if (98.01 <= acc <= 90.00) {
      return 'C'
    }
    return 'D'
  }
  if (gameMode === 3) {
    if (acc === 100) {
      return ss()
    }
    if (acc > 95) {
      return s()
    }
    if (acc > 90) {
      return 'A'
    }
    if (acc > 80) {
      return 'B'
    }
    if (acc > 70) {
      return 'C'
    }
    return 'D'
  }
  return 'A'
}

const mods = require('./mods')
