const Sqlite3 = require('better-sqlite3')

module.exports = new Sqlite3('./db/osu.db')

process.on('exit', () => {
  module.exports.close()
})