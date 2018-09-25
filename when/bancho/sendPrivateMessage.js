module.exports = (userToken, packetData) => {
  packetData = utils.clientPackets.sendPrivateMessage(packetData)
  utils.chat.sendMessage('', packetData['to'], packetData['message'], userToken)
}

const utils = require('../../utils')
