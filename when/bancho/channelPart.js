module.exports = (userToken, packetData) => {
  packetData = utils.clientPackets.channelPart(packetData)
  utils.chat.partChannel(0, packetData.channel, userToken)
}

const utils = require('../../utils')