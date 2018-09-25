module.exports = (userToken) => {
  userToken.leaveStream('lobby')

  utils.chat.partChannel(0, '#lobby', userToken, true, true)
  utils.consoleColor.log(`${userToken.username} has left multiplayer lobby`)
}

const utils = require('../../utils')
