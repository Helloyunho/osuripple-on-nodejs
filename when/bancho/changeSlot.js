module.exports = (userToken, packetData) => {
  let userID = userToken.userid

  packetData = utils.clientPackets.changeSlot(packetData)

  let match = share.matches.matches[userToken.matchID]

  match.userChangeSlot(userID, packetData.slotID)
}

const utils = require('../../utils')
const share = require('../../share')
