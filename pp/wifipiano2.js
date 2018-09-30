module.exports.calculate = function (scoreData) {

  /*
   * Strain PP
  */
  
  let scoreMultiplier = 1.0

  // Scale score to mods multiplier.
  if ((scoreData.mods & mods.EASY) > 0) {
    scoreMultiplier *= 0.5
  }

  // Calculate Strain PP
  let strainPP
  if (scoreMultiplier <= 0) {
    strainPP = 0
  } else {
    scoreData.score *= Math.round(1.0 / scoreMultiplier)
    strainPP = Math.pow(5.0 * Math.max(1.0, scoreData.starRating / 0.0825) - 4.0, 3.0) / 110000.0
    strainPP *= 1 + 0.1 * Math.min(1.0, scoreData.objects / 1500.0)
    
    if (scoreData.score <= 500000) {
      strainPP *= (scoreData.score / 500000.0) * 0.1

    } else if (scoreData.score <= 600000) {
      strainPP *= 0.1 + (scoreData.score - 500000) / 100000.0 * 0.2

    } else if (scoreData.score <= 700000) {
      strainPP *= 0.3 + (scoreData.score - 600000) / 100000.0 * 0.35

    } else if (scoreData.score <= 800000) {
      strainPP *= 0.65 + (scoreData.score - 700000) / 100000.0 * 0.2

    } else if (scoreData.score <= 900000) {
      strainPP *= 0.85 + (scoreData.score - 800000) / 100000.0 * 0.1

    } else {
      strainPP *= 0.95 + (scoreData.score - 900000) / 100000.0 * 0.05
    }
    
  }

  /*
   * Accuracy PP
   */

  // Calculate hitWindow depending on what game modws are provided.
  let scrubbedOD = Math.min(10.0, Math.max(0, 10.0 - scoreData.overallDifficulty))

  let hitWindow300 = (34 + 3 * scrubbedOD)
  if ((scoreData.mods & mods.EASY) > 0) {
    hitWindow300 *= 1.4
  }

  if ((scoreData.mods & mods.DOUBLETIME) > 0) {
    hitWindow300 *= 1.5
  } else if ((scoreData.mods & mods.HALFTIME) > 0) {
    hitWindow300 *= 0.75
  }

  hitWindow300 = Math.round(hitWindow300) + 0.5

  if ((scoreData.mods & mods.DOUBLETIME) > 0) {
    hitWindow300 /= 1.5
  } else if ((scoreData.mods & mods.HALFTIME) > 0) {
    hitWindow300 /= 0.75
  }

  let accPP = Math.pow((150.0 / hitWindow300) * Math.pow(scoreData.accuracy / 100, 16.0), 1.8) * 2.5
  accPP = accPP * Math.min(1.15, Math.pow(scoreData.objects / 1500.0, 0.3))

  // Calc multiplier based on certain mods.
  let multiplier = 1.1

  if ((scoreData.mods & mods.NOFAIL) > 0) {
    multiplier *= 0.9
  }
  if ((scoreData.mods & mods.SPUNOUT) > 0) {
    multiplier *= 0.95
  }
  if ((scoreData.mods & mods.EASY) > 0) {
    multiplier *= 0.5
  }

  // Calculate total performance points.
  let pp = Math.pow(Math.pow(strainPP, 1.1) + Math.pow(accPP, 1.1), 1.0 / 1.1) * multiplier
  return pp
}

const mods = require('../utils/mods')
