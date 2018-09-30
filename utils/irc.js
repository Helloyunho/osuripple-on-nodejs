const net = require('net')
const numeral = require('numeral')
const encoding = require('encoding')
const decoder = require('legacy-encoding').decode
const md5 = require('md5')

// By https://stackoverflow.com/a/281335/9376340
const clean = (array, deleteValue) => {
  for (let i = 0; i < array.length; i++) {
    if (array[i] === deleteValue) {
      array.splice(i, 1)
      i--
    }
  }
  return array
}

class Client {
  constructor (server, sock) {
    this.__timestamp = Date.now()
    this.__readbuffer = ''
    this.__writebuffer = ''
    this.__sentPing = false
    this.__handleCommand = this.passHandler
    this.__linesep_regexp = /\r?\n/

    this.server = server
    this.socket = sock
    this.ip = sock.remoteAddress
    this.port = sock.remotePort
    this.IRCUsername = ''
    this.banchoUsername = ''
    this.supposedUsername = ''
    this.supposedID = 0
    this.joinedChannels = []
  }

  messageChannel (channel, command, message, includeSelf = false) {
    let line = `:${command} ${message}`

    Object.values(this.server.clients).forEach(x => {
      if (x.joinedChannels.includes(channel) && (x !== this || includeSelf)) {
        x.message(line)
      }
    })
  }

  message (msg) {
    this.__writebuffer += msg + '\r\n'
  }

  reply (msg) {
    this.message(`: ${this.server.host} ${msg}`)
  }

  replyCode (code, msg, nickname = '', channel = '') {
    if (nickname === '') {
      nickname = this.IRCUsername
    }
    if (channel !== '') {
      channel = ' ' + channel
    }

    this.reply(`${numeral(code).format('000')} ${nickname}${channel} :${msg}`)
  }

  reply403 (channel) {
    this.replyCode(403, `${channel} :No such channel`)
  }

  reply461 (command) {
    this.replyCode(403, `${command} :Not enough parameters`)
  }

  disconnect (quitmsg = 'Client quit', callLogout = true) {
    this.message(`ERROR "${quitmsg}`)
    this.socket.end()
    consoleColor.log(`[IRC Server] Disconnected. ip: ${this.ip} port: ${this.port}, message: ${quitmsg}`)

    this.server.removeClient(this, quitmsg)

    if (callLogout && this.banchoUsername !== '') {
      chat.IRCDisconnect(this.IRCUsername)
    }
  }

  readSocket () {
    let data
    let quitmsg
    try {
      data = this.socket.read(2 ** 10)
      quitmsg = 'EOT'
    } catch (err) {
      data = Buffer.from([])
      quitmsg = err
    }

    if (data) {
      this.__readbuffer += decoder(data, 'latin1')
      this.parseBuffer()
      this.__timestamp = Date.now()
      this.__sentPing = false
    } else {
      this.disconnect(quitmsg)
    }
  }

  parseBuffer () {
    let lines = this.__readbuffer.split(this.__linesep_regexp)
    this.__readbuffer = lines.slice(-1)
    lines = lines.slice(0, -1)

    lines.forEach(x => {
      if (!x) {
        return
      }

      let y = x.split(' ', 1)

      let command = x[0].toUpperCase()

      let arg
      if (y.length === 1) {
        arg = []
      } else {
        if (y[1].length > 0 && y[1][0] === ':') {
          arg = [x[1].slice(1)]
        } else {
          let z = y[1].split(' :', 1)
          arg = clean(z[0].split(' '), '')
          if (z.length === 2) {
            arg.push(z[1])
          }
        }
      }

      this.__handleCommand(command, arg)
    })
  }

  writeSocket () {
    try {
      let sent = this.socket.write(encoding.convert(this.__writebuffer, 'utf-8'))
      this.__writebuffer = this.__writebuffer.slice(sent)
    } catch (err) {
      this.disconnect(String(err))
    }
  }

  checkAlive () {
    let now = Date.now()
    if (this.__timestamp + 180 < now) {
      this.disconnect('ping timeout')
      return
    }
    if (!this.__sentPing && this.__timestamp + 90 < now) {
      if (this.__handleCommand === this.mainHandler) {
        this.message(`PING :${this.server.host}`)
        this.__sentPing = true
      } else {
        this.disconnect('ping timeout')
      }
    }
  }

  sendLusers () {
    this.replyCode(251, `There are ${share.tokens.tokens.length} users and 0 services on 1 server`)
  }

  sendMotd () {
    this.replyCode(375, `- ${this.server.host} Message of the day - `)

    if (this.server.motd.length === 0) {
      this.replyCode(422, 'MOTD File is missing')
    } else {
      this.server.motd.forEach(x => {
        this.replyCode(372, `- ${x}`)
      })
    }

    this.replyCode(376, 'End of MOTD command')
  }

  // Handlers

  dummyHandler (command, args) {
  }

  passHandler (command, args) {
    if (command === 'PASS') {
      if (args.length === 0) {
        this.reply461('PASS')
      } else {
        let tokenHash = md5(encoding.convert(args[0], 'utf-8'))
        let row = db.prepare('SELECT users.username, users.id FROM users LEFT JOIN irc_tokens ON users.id = irc_tokens.id WHERE irc_tokens.token = ? LIMIT 1').get([tokenHash])
        if (!row) {
          this.reply('464 :Password incorrect')
          return
        }
        this.supposedUsername = chat.UsernameForIRC(row.username)
        this.supposedID = row.id
        this.__handleCommand = this.registerHandler
      }
    } else if (command === 'QUIT') {
      this.disconnect()
    }
  }

  registerHandler (command, args) {
    if (command === 'NICK') {
      if (args.length < 1) {
        this.reply('431 :No nickname given')
        return
      }
      let nick = args[0]

      if (this.IRCUsername !== '') {
        this.reply(`432 * ${nick} :Errorneous nickname`)
        return
      }

      if (nick.toLowerCase() !== this.supposedUsername.toLowerCase()) {
        this.reply('464 :Password incorrect')
        return
      }

      if (userutil.getPermission() & permission.restricted || userutil.getPermission() & permission.banned) {
        this.reply('465 :You\'re banned')
        return
      }

      let token = share.tokens.getTokenFromUsername(chat.UsernameForBancho(nick), true)
      if (token) {
        this.reply(`433 * ${nick} :Nickname is already in use`)
        return
      }

      this.IRCUsername = nick
      this.banchoUsername = chat.UsernameForBancho(this.IRCUsername)

      Object.values(this.server.clients).forEach(x => {
        if (x.IRCUsername.toLowerCase() === this.IRCUsername.toLowerCase() && x !== this) {
          x.disconnect('Connected from another client')
        }
      })
    } else if (command === 'USER') {
      return
    } else if (command === 'QUIT') {
      this.disconnect()
      return
    } else {
      return
    }

    if (this.IRCUsername !== '') {
      chat.IRCConnect(this.banchoUsername)

      this.replyCode(1, 'Welcome to the Internet Relay Network')
      this.replyCode(2, 'IDK HAHA')
      this.replyCode(3, 'Created by Helloyunho and ripple')
      this.replyCode(4, 'So... Enjoy!')
      this.sendLusers()
      this.sendMotd()
      this.__handleCommand = this.mainHandler
    }
  }

  quitHandler (_, args) {
    this.disconnect((args.length < 1) ? this.IRCUsername : args[0])
  }

  joinHandler (_, args) {
    if (args.length < 1) {
      this.reply461('JOIN')
      return
    }

    let token = share.tokens.getTokenFromUsername(this.banchoUsername)
    if (!token) {
      return
    }

    if (args[0] === '0') {
      return
    }

    let channels = args[0].split(',')

    channels.forEach(x => {
      if (token.joinedChannels.includes(x.toLowerCase())) {
        return
      }

      let res = chat.IRCJoinChannel(this.banchoUsername, x)
      if (res === 0) {
        this.joinedChannels.push(x)

        this.messageChannel(x, `${this.IRCUsername} JOIN`, x, true)

        let desc = share.channels.channels[x].description
        if (desc === '') {
          this.replyCode(331, 'No topic is set', '', x)
        } else {
          this.replyCode(332, desc, '', x)
        }

        if (!(`chat/${x}` in share.streams.streams)) {
          this.reply403(x)
          return
        }
        let users = share.streams.streams[`chat/${x}`].clients
        let usernames = []
        users.forEach(y => {
          if (!(y in share.tokens.tokens)) {
            return
          }
          usernames.push(chat.UsernameForIRC(share.tokens.tokens[y].username))
        })
        usernames = usernames.join(' ')

        this.replyCode(353, usernames, '', `= ${x}`)
        this.replyCode(366, 'End of NAMES list', '', x)
      } else if (res === 403) {
        this.reply403(x)
      }
    })
  }

  partHandler (_, args) {
    if (args.length < 1) {
      this.reply461('PART')
      return
    }

    let token = share.tokens.getTokenFromUsername(this.banchoUsername)
    if (!token) {
      return
    }

    let channels = args[0].split(',')

    channels.forEach(x => {
      if (!(token.joinedChannels.includes(x.toLowerCase()))) {
        return
      }

      let res = chat.IRCPartChannel(this.banchoUsername, x)
      if (res === 0) {
        this.joinedChannels.pop(x)
      } else if (res === 403) {
        this.reply403(x)
      } else if (res === 442) {
        this.replyCode(442, 'You\'re not on that channel', '', x)
      }
    })
  }

  noticePrivmsgHandler (command, args) {
    if (args.length === 0) {
      this.replyCode(411, `No recipient given (${command})`)
      return
    }
    if (args.length === 1) {
      this.replyCode(412, 'No text to send')
      return
    }

    let recipientIRC = args[0]
    let message = args[1]
    let recipientBancho

    if (!recipientIRC.startsWith('#')) {
      recipientBancho = chat.UsernameForBancho(recipientIRC)
    } else {
      recipientBancho = recipientIRC
    }
    let res = chat.sendMessage(this.banchoUsername, recipientBancho, message, '', false)
    if (res === 404) {
      this.replyCode(404, 'Cannot send to channel', '', recipientIRC)
      return
    } else if (res === 403) {
      this.replyCode(403, 'No such channel', '', recipientIRC)
      return
    } else if (res === 401) {
      this.replyCode(401, 'No such nick/channel', '', recipientIRC)
      return
    }

    if (recipientIRC.startsWith('#')) {
      if (!(recipientIRC in share.channels.channels)) {
        this.replyCode(401, 'No such nick/channel', '', recipientIRC)
        return
      }
      Object.values(this.server.clients).forEach(x => {
        if (x.joinedChannels.includes(recipientIRC) && x !== this) {
          x.message(`: ${this.IRCUsername} PRIVMSG ${recipientIRC} ${message}`)
        }
      })
    } else {
      Object.values(this.server.clients).forEach(x => {
        if (x.IRCUsername === recipientIRC) {
          x.message(`: ${this.IRCUsername} PRIVMSG ${recipientIRC} ${message}`)
        }
      })
    }
  }

  motdHandler (command, args) {
    this.sendMotd()
  }

  lusersHandler (command, args) {
    this.sendLusers()
  }

  pingHandler (_, args) {
    if (args.length < 1) {
      this.replyCode(409, 'No origin specified')
      return
    }
    this.reply(`PONG ${this.server.host} :${args[0]}`)
  }

  pongHandler (command, args) {}

  awayHandler (_, args) {
    let res = chat.IRCAway(this.banchoUsername, args.join(' '))
    this.replyCode(res, (res === 305) ? 'You are no longer marked as being away' : 'You have been marked as being away')
  }

  mainHandler (command, args) {
    let handlers = {
      'AWAY': this.awayHandler,
      'JOIN': this.joinHandler,
      'LUSERS': this.lusersHandler,
      'MOTD': this.motdHandler,
      'PART': this.partHandler,
      'PING': this.pingHandler,
      'PONG': this.pongHandler,
      'PRIVMSG': this.noticePrivmsgHandler,
      'QUIT': this.quitHandler,
      'USER': this.dummyHandler
    }
    try {
      handlers[command](command, args)
    } catch (err) {
      this.replyCode(421, `Unknown command (${command})`)
    }
  }
}

module.exports = class {
  constructor () {
    this.host = '0.0.0.0'
    this.port = 6667
    this.clients = {}
    this.motd = ['Hello.... um... Here is custom bancho server \\w node.js! Made by Helloyunho and ripple(source code)']
  }

  forceDiscon (username, bancho = true) {
    for (let x of Object.values(this.clients)) {
      if (x.ircUsername === username && !bancho) {
        x.disconnect(false)
        break
      }
    }
  }

  banchoJoinChannel (username, channel) {
    username = chat.UsernameForIRC(username)

    Object.values(this.clients).forEach(x => {
      if (x.joinedChannels.includes(channel)) {
        x.message(`: ${username} JOIN ${channel}`)
      }
    })
  }

  banchoPartChannel (username, channel) {
    username = chat.UsernameForIRC(username)

    Object.values(this.clients).forEach(x => {
      if (x.joinedChannels.includes(channel)) {
        x.message(`: ${username} PART ${channel}`)
      }
    })
  }

  banchoMessage (from, to, msg) {
    from = chat.UsernameForIRC(from)
    to = chat.UsernameForIRC(to)
    if (to.startsWith('#')) {
      Object.values(this.clients).forEach(x => {
        if (x.joinedChannels.includes(to) && x.IRCUsername !== from) {
          x.message(`:${from} PRIVMSG ${to} :${msg}`)
        }
      })
    } else {
      Object.values(this.clients).forEach(x => {
        if (x.IRCUsername === to && x.IRCUsername !== from) {
          x.message(`:${from} PRIVMSG ${to} :${msg}`)
        }
      })
    }
  }

  removeClient (cli, _) {
    if (cli.socket in this.clients) {
      delete this.clients[cli.socket]
    }
  }

  start () {
    let lastCheck = Date.now()
    let serversoc = net.createServer(cli => {
      cli.on('readable', read => {
        if (cli in this.clients) {
          this.clients[cli].readSocket()
        } else {
          try {
            this.clients[cli] = Client(this, cli)
          } catch (err) {
            cli.end()
          }
        }
      })

      cli.on('writeable', write => {
        if (cli in this.clients) {
          this.clients[cli].writeSocket()
        }
      })

      let now = Date.now()

      if (lastCheck + 10 < now) {
        Object.values(this.clients).forEach(x => {
          x.checkAlive()
        })
        lastCheck = now
      }
    })
    serversoc.listen({
      port: this.port,
      host: this.host,
      backlog: 5
    })
  }
}

const share = require('../share')
const chat = require('./chat')
const consoleColor = require('./consoleColor')
const userutil = require('./user')
const permission = require('../permission')
const db = require('../db')
