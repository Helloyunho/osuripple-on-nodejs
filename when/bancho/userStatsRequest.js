module.exports = (userToken, packetData) => {
  packetData = utils.clientPackets.userStatsRequest(packetData)

  if (packetData.length > 32) {
    return null
  }

  packetData.users.forEach(i => {
    if (i === userToken.userid) {
      return null
    }

    userToken.addpackets(utils.packets.userStatus(i))
  })
}

const utils = require('../../utils')
