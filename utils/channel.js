const share = require('../share')

module.exports = class {
  constructor (name, description, Read, Write, temp, hidden) {
    this.name = name
    this.description = description
    this.Read = Read
    this.Write = Write
    this.moderated = false
    this.temp = temp
    this.hidden = hidden

    this.clientName = this.name

    if (this.name.startsWith('#spect_')) {
      this.clientName = '#spectator'
    } else if (this.name.startsWith('#multi_')) {
      this.clientName = '#multiplayer'
    }

    let botToken = share.tokens.getTokenFromUserid(1)
    if (!botToken) {
      botToken.joinChannel(this)
    }
  }
}
