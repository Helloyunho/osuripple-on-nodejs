module.exports = (userToken, packetData) => {
  matchBeatmap(userToken, packetData, true)
}

const matchBeatmap = require('./matchBeatmap')
