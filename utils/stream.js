const consoleColor = require('./consoleColor')
const share = require('./share')

module.exports = class {
  constructor (name) {
    this.name = name
    this.clients = []
  }

  addClient (client = null, token = null) {
    if (!client && !token) {
      return
    }
    if (client) {
      token = client.token
    }
    if (!this.clients.includes(token)) {
      consoleColor.log(`${token} has joined on stream ${this.name}`)
      this.clients.push(token)
    }
  }
  removeClient (client = null, token = null) {
    if (!client && !token) {
      return
    }
    if (client) {
      token = client.token
    }
    if (!this.clients.includes(token)) {
      consoleColor.log(`${token} has left on stream ${this.name}`)
      this.clients.pop(token)
    }
  }
  broadcast (data, nope = null) {
    if (!nope) {
      nope = []
    }
    this.clients.forEach(x => {
      if (x in share.tokens.tokens) {
        if (!nope.includes(x)) {
          share.tokens.tokens[x].addpackets(data)
        }
      } else {
        this.removeClient(null, x)
      }
    })
  }
  dispose () {
    this.clients.forEach(x => {
      if (x in share.tokens.tokens) {
        share.tokens.tokens[x].leaveStream(this.name)
      }
    })
  }
}
