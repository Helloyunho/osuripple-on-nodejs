module.exports = (userToken, packetData) => {
  let userID = userToken.userid

  let matchID = userToken.matchID

  if (matchID === -1) {
    return undefined
  }

  if (!(matchID in share.matches.matches)) {
    return undefined
  }

  let data = utils.clientPackets.matchFrames(packetData)

  let match = share.matches.matches[matchID]

  let slotID = match.getUserSlotID(userID)

  match.updateScore(slotID, data.totalScore)
  match.updateHP(slotID, data.currentHp)

  share.streams.broadcast(match.playingStreamName, utils.packets.matchFrames(slotID, packetData))
}

const utils = require('../../utils')
const share = require('../../share')
