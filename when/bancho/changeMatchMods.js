module.exports = (userToken, packetData) => {
  let userID = userToken.userid

  packetData = utils.clientPackets.changeMods(packetData)

  let matchID = userToken.matchID
  if (!(matchID in share.matches.matches)) {
    return undefined
  }

  let match = share.matches.matches[matchID]
  if (match.matchModMode === utils.matchType.ModModes.FREE_MOD) {
    if (userID === match.hostUserID) {
      if (packetData.mods & utils.mods.DOUBLETIME > 0) {
        match.changeMods(utils.mods.DOUBLETIME)

        if (packetData.mods & utils.mods.NIGHTCORE > 0) {
          match.changeMods(match.mods + utils.mods.NIGHTCORE)
        }
      } else if (packetData.mods & utils.mods.HALFTIME > 0) {
        match.changeMods(utils.mods.HALFTIME)
      } else {
        match.changeMods(0)
      }
    }

    let slotID = match.getUserSlotID(userID)
    if (slotID) {
      match.setSlotMods(slotID, packetData.mods)
    }
  } else {
    match.changeMods(packetData.mods)
  }
}

const utils = require('../../utils')
const share = require('../../share')
