module.exports = (userToken, _ = null, deleteToken = true) => {
  let userID = userToken.userid

  if ((Date.now() - userToken.loginTime) >= 5 || userToken.irc) {
    userToken.stopSpectating()

    userToken.leaveMatch()

    userToken.joinedChannels.forEach(i => {
      utils.chat.partChannel(0, i, userToken)
    })

    userToken.leaveAllStreams()

    share.streams.broadcast('main', utils.packets.logout(userID))

    if (userToken.irc) {
      share.irc.forceDiscon(userToken.username)
    }

    if (deleteToken) {
      share.tokens.removetoken(userToken)
    } else {
      userToken.kicked = true
    }

    // TODO: Make change username
  }
}

const utils = require('../../utils')
const share = require('../../share')
