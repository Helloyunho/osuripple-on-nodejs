const fs = require('fs')

module.exports = class {
  constructor () {
    this.channels = {}
  }

  loadChannels () {
    let channelss = fs.readFileSync('../db/channels.json')
    channelss = JSON.parse(channelss)

    Object.keys(channelss).forEach(x => {
      if (!(x in this.channels)) {
        let Read = Boolean(channelss[x]['read'])
        let Write = Boolean(channelss[x]['write'])
        this.addChannel(x, channelss[x]['description'], Read, Write)
      }
    })
  }

  addChannel (name, desc, Read, Write, temp = false, hidden = false) {
    share.streams.add(`chat/${name}`)
    this.channels[name] = channel(name, desc, Read, Write, temp, hidden)
  }

  addTempChannel (name) {
    if (name in this.channels) {
      return false
    }
    share.streams.add(`chat/${name}`)
    this.channels[name] = channel(name, 'Chat', true, true, true, true)
  }

  addHiddenChannel (name) {
    if (name in this.channels) {
      return false
    }
    share.streams.add(`chat/${name}`)
    this.channels[name] = channel(name, 'Chat', true, true, false, true)
  }

  removeChannel (name) {
    if (!(name in this.channels)) {
      return
    }

    let stream = share.streams.getStreamByName(`chat/${name}`)
    if (stream) {
      stream.clients.forEach(x => {
        if (x in share.tokens.tokens) {
          chat.partChannel(0, name, share.tokens.tokens[x], true, true)
        }
      })
    }
    share.streams.dispose(`chat/${name}`)
    share.streams.remove(`chat/${name}`)
    delete this.channels[name]
  }
}

const share = require('../share')
const channel = require('./channel')
const chat = require('./chat')
