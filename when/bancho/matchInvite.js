module.exports = (userToken, packetData) => {
  let userID = userToken.userid
  packetData = utils.clientPackets.matchInvite(packetData)

  let matchID = userToken.matchID

  if (matchID === -1) {
    return undefined
  }

  if (!(matchID in share.matches.matches)) {
    return undefined
  }

  let match = share.matches.matches[matchID]
  match.invite(userID, packetData.userID)
}

const utils = require('../../utils')
const share = require('../../share')
