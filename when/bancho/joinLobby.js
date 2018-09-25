module.exports = (userToken) => {
  userToken.joinStream('lobby')

  Object.keys(share.matches.matches).forEach(key => {
    userToken.addpackets(utils.packets.createMatch(key))
  })

  utils.consoleColor.log(`${userToken.username} has joined multiplayer lobby`)
}

const utils = require('../../utils')
const share = require('../../share')
