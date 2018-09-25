module.exports = (userToken, packetData) => {
  packetData = utils.clientPackets.startSpectating(packetData)

  if (packetData.userID < 0) {
    userToken.stopSpectating()
    return undefined
  }

  let targetToken = share.tokens.getTokenFromUserid(packetData.userID)
  if (!targetToken) {
    utils.consoleColor.debug('During start spectating, this error has occurred: token not found')
    userToken.stopSpectating()
    return undefined
  }

  userToken.startSpectating(targetToken)
}

const utils = require('../../utils')
const share = require('../../share')
