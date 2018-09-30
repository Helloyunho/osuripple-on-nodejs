const fs = require('fs')
const redis = require('redis')

module.exports.tokens = new (require('./utils/tokens'))()
module.exports.online_users = 0
module.exports.streams = new (require('./utils/streams'))()
module.exports.channels = new (require('./utils/channels'))()
module.exports.channels.loadChannels()
module.exports.irc = new (require('./utils/irc'))()
module.exports.log_file = fs.createWriteStream('log.log')
module.exports.matches = new (require('./utils/matches'))()
module.exports.config = JSON.parse(fs.readFileSync('config.json'))
module.exports.redis = redis.createClient(module.exports.config.redis)
module.exports.userStatsCache = new (require('./utils/userStatsCache'))()
module.exports.personalBestCache = new (require('./utils/personalBestCache'))()

process.on('exit', () => {
  module.exports.log_file.end()
})
