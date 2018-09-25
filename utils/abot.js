module.exports.connect = () => {
  let token = share.tokens.addtoken(1)
  token.actionID = userStatus.IDLE
  share.streams.broadcast('main', packets.userPanel(1))
  share.streams.broadcast('main', packets.userStatus(1))
}

module.exports.disconnect = () => {
  share.tokens.removetoken(share.tokens.getTokenFromUserid(1))
}

module.exports.response = (from, to, message) => {
  if (message.startsWith('!test')) {
    return 'Test!'
  }
}

const userutil = require('./user')
const packets = require('./packets')
const share = require('../share')
const userStatus = require('./userStatus')
