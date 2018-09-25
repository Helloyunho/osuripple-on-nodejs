module.exports = (userToken, packetData) => {
  packetData = utils.clientPackets.joinMatch(packetData)
  let matchID = packetData.matchID
  let password = packetData.password

  if (!(matchID in share.matches.matches)) {
    return undefined
  }

  let match = share.matches.matches[matchID]
  if ((match.matchPassword !== '') && (match.matchPassword !== password)) {
    userToken.addpackets(utils.packets.matchJoinFail())
  }

  userToken.joinMatch(matchID)
}

const utils = require('../../utils')
const share = require('../../share')
