module.exports = (userToken, packetData) => {
  let userID = userToken.userid

  let matchID = userToken.matchID

  if (!(matchID in share.matches.matches)) {
    return undefined
  }

  let match = share.matches.matches[matchID]
  let slotID = match.getUserSlotID(userID)
  if ((typeof slotID) === 'number') {
    match.toggleSlotReady(slotID)
  }

  if (match.isTourney) {
    match.sendReadyStatus()
  }
}

const share = require('../../share')
