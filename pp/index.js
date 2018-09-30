const std = require('ojsama')
const taiko = require('taiko-pp-calc')
const ctb = require('ctb-pp-calc')
const mania = require('./wifipiano2')
const fs = require('fs')
module.exports = class {
  constructor (__beatmap, __score = undefined, acc = 0, mods = 0, tillerino = false) {
    this.pp = undefined
    this.score = undefined
    this.acc = 0
    this.mods = 0
    this.combo = 0
    this.misses = 0
    this.stars = 0
    this.tillerino = tillerino

    this.beatmap = __beatmap

    if ((typeof __score) !== 'undefined') {
      this.score = __score
      this.acc = this.score.accuracy * 100
      this.mods = this.score.mods
      this.combo = this.score.maxCombo
      this.misses = this.score.cMiss
      this.gameMode = this.score.gameMode
    } else {
      this.acc = acc
      this.mods = mods
      if (this.beatmap.starsStd > 0) {
        this.gameMode = utils.gamemodes.STD
      } else if (this.beatmap.starsTaiko > 0) {
        this.gameMode = utils.gamemodes.TAIKO
      } else if (this.beatmap.starsCtb > 0) {
        this.gameMode = utils.gamemodes.CTB
      } else if (this.beatmap.starsMania > 0) {
        this.gameMode = utils.gamemodes.MANIA
      } else {
        this.gameMode = undefined
      }
    }
    this.calculatePP()
  }

  calculatePP () {
    this.pp = undefined
    let mapFile = utils.maps.cachedMapPath(this.beatmap.beatmapID)
    utils.maps.cacheMap(mapFile, this.beatmap)

    let mapContent = fs.readFileSync(mapFile).toString()

    let parser

    let tillerinoAcc = [100, 99, 98, 95]
    let ppList = []
    let pp
    let objects = this.score.c50 + this.score.c100 + this.score.c300 + this.score.cKatu + this.score.cGeki + this.score.cMiss
    if (this.gameMode === utils.gamemodes.STD) {
      parser = new std.parser()
      parser.feed(mapContent)

      let modsFixed = this.mods & 5983
      let stars = new std.diff().calc({map: parser.map, mods: utils.scoreutil.readableMods(modsFixed)})
      this.stars = stars

      if (!this.tillerino) {
        console.log(`${stars}\n\n${this.combo}\n\n${this.misses}\n\n${this.acc}`)
        pp = std.ppv2({
          stars: stars,
          combo: this.combo,
          nmiss: this.misses,
          acc_percent: this.acc
        })
        if (this.stars > 50) {
          this.pp = 0
        } else {
          this.pp = pp.total.toFixed(2)
        }
      } else {
        tillerinoAcc.forEach(i => {
          pp = std.ppv2({
            stars: stars,
            combo: parser.map.max_combo(),
            nmiss: undefined,
            acc_percent: i
          })
          ppList.push(pp.total.toFixed(2))
        })
        this.pp = ppList
      }
    } else if (this.gameMode === utils.gamemodes.CTB) {
      if (!this.tillerino) {
        pp = new ctb(mapContent, this.beatmap.starsCtb, this.mods, this.combo, this.acc, this.misses)
        this.pp = pp.pp
      } else {
        tillerinoAcc.forEach(i => {
          ppList.push(new ctb(mapContent, this.beatmap.starsCtb, this.mods, this.combo, i, this.misses).pp)
        })
        this.pp = ppList
      }
    } else if (this.gameMode === utils.gamemodes.TAIKO) {
      if (!this.tillerino) {
        pp = new taiko(mapContent, this.beatmap.starsTaiko, this.mods, this.combo, this.acc, this.misses)
        this.pp = pp.pp
      } else {
        tillerinoAcc.forEach(i => {
          ppList.push(new taiko(mapContent, this.beatmap.starsTaiko, this.mods, this.combo, i, this.misses).pp)
        })
        this.pp = ppList
      }
    } else if (this.gameMode === utils.gamemodes.MANIA) {
      let scoreData = {
        starRating: this.beatmap.starsMania,
        overallDifficulty: this.beatmap.OD,
        objects: objects,
        mods: this.mods,
        score: this.score.score,
        accuracy: this.acc
      }
      this.pp = mania.calculate(scoreData)
    }
  }
}

const utils = {maps: require('../utils/maps'), gamemodes: require('../utils/gamemodes'), scoreutil: require('../utils/scoreutil')}

