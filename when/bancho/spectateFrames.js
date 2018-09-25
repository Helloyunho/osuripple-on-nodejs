module.exports = (userToken, packetData) => {
  let userID = userToken.userid

  let streamName = `spect/${userID}`
  share.streams.broadcast(streamName, utils.packets.spectatorFrames(packetData.slice(7)))
  utils.consoleColor.debug(`Broadcasting ${userID}'s frames to ${share.streams.streams[streamName].clients.length}`)
}

const utils = require('../../utils')
const share = require('../../share')
