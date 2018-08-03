const fs = require('fs')

module.exports.tokens = require('./utils/tokens')
module.exports.online_users = 0
module.exports.streams = require('./utils/streams')
module.exports.channels = require('./utils/channels')
module.exports.irc = null
module.exports.log_file = fs.createWriteStream('log.json')
module.exports.matches = require('./utils/matches')

process.on('exit', () => {
  module.exports.log_file.end()
})
