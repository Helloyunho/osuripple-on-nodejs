module.exports = (userToken, packetData) => {
  let userID = userToken.userid
  packetData = utils.clientPackets.lockSlot(packetData)

  let matchID = userToken.matchID

  if (!(matchID in share.matches.matches)) {
    return undefined
  }

  let match = share.matches.matches[matchID]
  if (userID !== match.hostUserID) {
    return undefined
  }

  let ourSlot = match.getUserSlotID(userID)
  if (packetData.slotID === ourSlot) {
    return undefined
  }

  match.toggleSlotLocked(packetData.slotID)
}

const utils = require('../../utils')
const share = require('../../share')
