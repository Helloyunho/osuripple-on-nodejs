module.exports = (userToken, packetData) => {
  let username = userToken.username

  packetData = utils.clientPackets.setAwayMessage(packetData)

  userToken.awayMessage = packetData.awayMessage

  let aMessage
  if (packetData.awayMessage === '') {
    aMessage = 'Your away message has been reset'
  } else {
    aMessage = `Your away message is now: ${packetData.awayMessage}`
  }

  userToken.addpackets(utils.packets.sendMessage('A Bot', username, aMessage))
}

const utils = require('../../utils')
