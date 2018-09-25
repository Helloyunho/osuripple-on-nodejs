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

  match.changePassword(packetData.matchPassword)
}

const utils = require('../../utils')
const share = require('../../share')
