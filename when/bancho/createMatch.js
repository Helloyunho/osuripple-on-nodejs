module.exports = (userToken, packetData) => {
  let userID = userToken.userid

  packetData = utils.clientPackets.createMatch(packetData)

  let matchName = packetData.matchName.replace(' ', '')
  if (!matchName) {
    utils.consoleColor.error('Error while creating match!')
    return undefined
  }

  let matchID = share.matches.createMatch(matchName, packetData.matchPassword.replace(' ', ''), packetData.beatmapID, packetData.beatmapName, packetData.beatmapMD5, packetData.gameMode, userID)

  if (!(matchID in share.matches.matches)) {
    utils.consoleColor.error('Error while creating match!')
    return undefined
  }

  let match = share.matches.matches[matchID]

  userToken.joinMatch(matchID)

  match.setHost(userID)
  match.sendUpdates()
  match.changePassword(packetData.matchPassword)
}

const utils = require('../../utils')
const share = require('../../share')
