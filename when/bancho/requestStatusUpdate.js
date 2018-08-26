module.exports = (userToken, packetData) => {
  userToken.updateStatus()
  userToken.addpackets(utils.packets.userStatus(userToken.userid))
}

const utils = require('../../utils')
