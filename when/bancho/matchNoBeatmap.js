module.exports = (userToken, packetData) => {
  matchBeatmap(userToken, packetData, false)
}

const matchBeatmap = require('./matchBeatmap')
