module.exports = (userToken, packetData) => {
  packetData = utils.clientPackets.channelJoin(packetData)
  utils.chat.joinChannel(0, packetData.channel, userToken)
}

const utils = require('../../utils')