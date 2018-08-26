module.exports = (userToken, packetData) => {
  userToken.addpackets(utils.packet.buildPacket(4, [[0, datatypes.uInt32]]))
}

const utils = require('../../utils')
const datatypes = require('../../types').datatypes
