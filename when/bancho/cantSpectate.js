module.exports = (userToken) => {
  if (!(userToken.spectating in share.tokens.tokens)) {
    utils.consoleColor.debug('During start spectating, this error has occurred: token not found')
    userToken.stopSpectating()
    return undefined
  }

  share.tokens.tokens[userToken.spectating].addpackets(utils.packets.noSongSpectator(userToken.userid))
}

const utils = require('../../utils')
const share = require('../../share')
