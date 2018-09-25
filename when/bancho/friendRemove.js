module.exports = (userToken, packetData) => {
  packetData = utils.clientPackets.addRemoveFriend(packetData)
  utils.user.removeFriend(userToken.userid, packetData.friendid)
}

const utils = require('../../utils')
