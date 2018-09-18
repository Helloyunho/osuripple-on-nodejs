module.exports = (userToken, packetData) => {
  let userID = userToken.userid
  let username = userToken.username

  packetData = utils.clientPackets.userActionChange(packetData)

  if (userToken.gameMode !== packetData.gameMode) {
    userToken.gameMode = packetData.gameMode
    userToken.updateStatus()
  }

  userToken.actionID = packetData.actionID
  userToken.actionText = packetData.actionText
  userToken.actionMd5 = packetData.actionMd5
  userToken.actionMods = packetData.actionMods
  userToken.beatmapID = packetData.beatmapID

  let recipients = [userToken]
  if (userToken.spectators.length > 0) {
    userToken.spectators.forEach(i => {
      if (i in share.tokens.tokens) {
        recipients.push(share.tokens.tokens[i])
      }
    })
  }

  recipients.forEach(i => {
    if (i) {
      let force = i === userToken
      i.addpackets(utils.packets.userPanel(userID, force))
      i.addpackets(utils.packets.userStatus(userID, force))
    }
  })
}

const utils = require('../../utils')
const share = require('../../share')
