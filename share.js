const fs = require('fs')
const redis = require('redis')

module.exports.tokens = new (require('./utils/tokens'))()
module.exports.online_users = 0
module.exports.streams = new (require('./utils/streams'))()
module.exports.channels = new (require('./utils/channels'))()
module.exports.irc = new (require('./utils/irc'))()
module.exports.log_file = fs.createWriteStream('log.log')
module.exports.matches = new (require('./utils/matches'))()
module.exports.redis = redis.createClient({password: 'kats_is_awesome'})

process.on('exit', () => {
  module.exports.log_file.end()
})
