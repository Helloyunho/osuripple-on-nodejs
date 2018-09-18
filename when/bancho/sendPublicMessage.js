module.exports = (userToken, packetData) => {
  packetData = utils.clientPackets.sendPublicMessage(packetData)
  utils.chat.sendMessage('', packetData['to'], packetData['message'])
}

const utils = require('../../utils')