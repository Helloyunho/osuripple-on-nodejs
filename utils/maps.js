const fs = require('fs')
const readline = require('readline')
const stripBom = require('strip-bom')
const md5File = require('md5-file')
const path = require('path')

module.exports.isBeatmap = (fileName = undefined, content = undefined) => {
  let firstLine
  if (fileName) {
    let file = fs.readFileSync(fileName)
    file = file.toString()
    firstLine = file.split('\n')[0]
  }
  if (content) {
    firstLine = content.split('\n')[0]
  }
  if (!fileName && !content) {
    return false
  }
  return firstLine.toLowerCase().startsWith('osu file format v')
}

module.exports.cacheMap = (mapFile, _beatmap) => {
  let download = false
  if (!fs.existsSync(mapFile)) {
    download = true
  } else if ((md5File.sync(mapFile) !== _beatmap.fileMD5) || !module.exports.isBeatmap(mapFile)) {
    download = true
  }

  if (download) {
    consoleColor.debug(`Downloading ${_beatmap.beatmapID} osu file...`)

    let fileContent = osuapi.getOsuFileFromID(_beatmap.beatmapID)
    if (!fileContent || !module.exports.isBeatmap(undefined, fileContent)) {
      return undefined
    }

    if (fs.existsSync(mapFile)) {
      fs.unlinkSync(mapFile)
    }

    fs.writeFileSync(mapFile, fileContent)

    return fileContent
  }
}

module.exports.cachedMapPath = (beatmapId) => {
  return path.resolve('.data', 'beatmaps', `${beatmapId}.osu`)
}

const consoleColor = require('./consoleColor')
const osuapi = require('./osuapi')
