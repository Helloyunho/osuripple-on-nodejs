const crypto = require('crypto')

module.exports = (userToken, packetData) => {
  packetData = utils.clientPackets.changeMatchSettings(packetData)

  let matchID = userToken.matchID

  if (!(matchID in share.matches.matches)) {
    return undefined
  }

  let match = share.matches.matches[matchID]
  if (userToken.userid !== match.hostUserID) {
    return undefined
  }
  match.matchName = (packetData.matchName === '!meme') ? share.config.memeTitles[Math.floor(Math.random() * share.config.memeTitles.length)] : packetData.matchName

  match.inProgress = packetData.inProgress
  if (packetData.matchPassword !== '') {
    match.matchPassword = crypto.createHash('md5').update(packetData.matchPassword).digest('hex')
  } else {
    match.matchPassword = ''
  }
  match.beatmapName = packetData['beatmapName']
  match.beatmapID = packetData['beatmapID']
  match.hostUserID = packetData['hostUserID']
  match.gameMode = packetData['gameMode']

  let oldBeatmapMD5 = match.beatmapMD5
  let oldMods = match.mods
  let oldMatchTeamType = match.matchTeamType
  match.mods = packetData['mods']
  match.beatmapMD5 = packetData['beatmapMD5']
  match.matchScoringType = packetData['scoringType']
  match.matchTeamType = packetData['teamType']
  match.matchModMode = packetData['freeMods']

  if ((oldMods !== match.mods) || (oldBeatmapMD5 !== match.beatmapMD5)) {
    match.resetReady()
  } else {
    match.mods = 0
  }

  if (match.matchTeamType !== oldMatchTeamType) {
    match.initializeTeams()
  }

  if ((match.matchTeamType === utils.matchType.TeamTypes.TAG_COOP) || (match.matchTeamType === utils.matchType.TeamTypes.TAG_TEAM_VS)) {
    match.matchModMode = utils.matchType.ModModes.NORMAL
  }

  match.sendUpdates()
}

const utils = require('../../utils')
const share = require('../../share')
