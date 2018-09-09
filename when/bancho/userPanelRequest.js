module.exports = (userToken, packetData) => {
  packetData = utils.clientPackets.userPanelRequest(packetData)

  if (packetData.length > 256) {
    return null
  }

  packetData.users.forEach(i => {
    userToken.addpackets(utils.packets.userPanel(i))
  })
}

const utils = require('../../utils')
