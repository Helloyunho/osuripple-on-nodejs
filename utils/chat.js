const userutil = require('./user')
const share = require('../share')
const packets = require('./packets')
const consoleColor = require('./consoleColor')
const slice = require('slice.js')
const encoding = require('encoding')
const { StringDecoder } = require('string_decoder')
const decoding = new StringDecoder('utf-8')

module.exports.joinChannel = (id = 0, channel = '', token = null, toirc = true) => {
  if (!token) {
    token = share.tokens.getTokenFromUserid(id)
    if (!token) {
      return 403
    }
  }

  if (!(channel in share.channels.channels)) {
    return 403
  }

  token.joinChannel(share.channels.channels[channel])

  if (toirc) {
    share.irc.banchoJoinChannel(token.username, channel)
  }

  consoleColor.log(`${token.username} joined ${channel} channel!`)

  return 0
}

module.exports.partChannel = (id = 0, channel = '', token = null, toirc = true, kick = false) => {
  if (!channel.startsWith('#')) {
    return
  }

  if (!token) {
    token = share.tokens.getTokenFromUserid(id)
    if (!token) {
      return 403
    }
  }

  let channelClient = channel
  let s
  if (channel === '#spectator') {
    if (!token.spectating) {
      s = id
    } else {
      s = token.spectatingID
    }
    channel = `#spect_${s}`
  } else if (channel === '#multiplayer') {
    channel = `#multi_${token.matchID}`
  } else if (channel.startsWith('#spect_')) {
    channelClient = '#spectator'
  } else if (channel.startsWith('#multi_')) {
    channelClient = '#multiplayer'
  }

  if (!(channel in share.channels.channels)) {
    return 403
  }

  if (!token.joinedChannel.includes(channel)) {
    return 442
  }

  let channelObject = share.channels.channels[channel]
  token.partChannel(channelObject)

  if (`chat/${channelObject.name}` in share.streams.streams) {
    if (channelObject.temp && share.streams.streams[`chat/${channelObject.name}`].clients.length - 1 === 0) {
      share.channels.removeChannel(channelObject.name)
    }
  }

  if (kick) {
    token.addpacket(packets.channelKicked(channelClient))
  }

  if (toirc) {
    share.irc.banchoPartChannel(token.username, channel)
  }

  consoleColor.log(`${token.username} parted ${channel} channel`)
  return 0
}

module.exports.sendMessage = (from = '', to = '', message = '', token = null, toirc = true) => {
  if (!token) {
    token = share.tokens.getTokenFromUsername(from)
    if (!token) {
      return 401
    }
  } else {
    from = token.username
  }

  if (token.restricted) {
    return 404
  }

  if (token.isSilenced()) {
    token.addpacket(packets.silenceEndtime(token.getSilenceLeft()))
    return 404
  }

  if (message.startsWith('!report')) {
    to = 'A Bot'
  }

  let toClient = to
  let s
  if (to === '#spectator') {
    if (!token.spectating) {
      s = token.userid
    } else {
      s = token.spectatingID
    }
    to = `#spect_${s}`
  } else if (to === '#multiplayer') {
    to = `#multi_${token.matchID}`
  } else if (to.startsWith('#spect_')) {
    toClient = '#spectator'
  } else if (to.startsWith('#multi_')) {
    toClient = '#multiplayer'
  }

  if (!message.trim()) {
    return 404
  }

  message = (message.length > 2048) ? slice.default(message)[':2048'] + '...' : message

  let packett = packets.sendMessage(token.username, toClient, message)

  let isChannel = to.startsWith('#')
  if (isChannel) {
    if (!(to in share.channels.channels)) {
      return 403
    }

    if (share.channels.channels[to].moderated && !token.admin) {
      return 404
    }

    if (!(share.channels.channels[to].Write && token.admin)) {
      return 404
    }

    token.addMessageInBuffer(to, message)

    share.streams.broadcast(`chat/${to}`, packett, [token.token])
  } else {
    let recipientToken = share.tokens.getTokenFromUsername(to)
    if (!recipientToken) {
      return 401
    }

    if (recipientToken.restricted && (from.toLowerCase() !== 'a_bot' || from.toLowerCase() !== 'a bot')) {
      return 404
    }

    if (recipientToken.awayCheck(token.id)) {
      module.exports.sendMessage(from, to, `\x01ACTION is away: ${recipientToken.awayMessage}\x01`)
    }

    recipientToken.addpacket(packett)
  }

  if (toirc) {
    let messageSplitInLines = decoding.write(encoding(message, 'latin-1')).split('\n')
    messageSplitInLines.forEach(x => {
      if (x === slice.default(messageSplitInLines)[':1'] && x === '') {
        return
      }
      share.irc.banchoMessage(from, to, x)
    })
  }

  if (token.userid > 1) {
    token.spamProtection()
  }

  if (isChannel || to.toLowerCase() === 'A Bot') {
    module.exports.sendMessage('A Bot', (isChannel) ? to : from, 'Test!')
  }

  if (to.startsWith('#') && !(message.startsWith('\x01ACTION is playing') && to.startsWith('#spect_'))) {
    share.log_file.write(`"${from}" -> "${to}": ${StringDecoder(encoding.convert(message, 'latin-1'))}`)
  }
  return 0
}

// for IRC

module.exports.IRCConnect = (user) => {
  let id = userutil.getIdFromUsername(user)
  if (!id) {
    consoleColor.warn(`${user} doesn't exist`)
    return
  }
  share.tokens.deleteOldTokens(id)
  share.tokens.addtoken(id, '', true)
  share.streams.broadcast('main', packets.userPanel(id))
  consoleColor.log(`${user} is logged!`)
}

module.exports.IRCDisconnect = (user) => {
  let id = userutil.getIdFromUsername(user)
  if (!id) {
    consoleColor.warn(`${user} doesn't exist`)
    return
  }
  share.tokens.deleteOldTokens(id)
  share.tokens.addtoken(id, '', true)
  share.streams.broadcast('main', packets.userPanel(id))
  consoleColor.log(`${user} is logged!`)
}

module.exports.IRCJoinChannel = (username, channel) => {
  let id = userutil.getIdFromUsername(username)
  if (!id) {
    consoleColor.warn(`${username} doesn't exist`)
    return
  }

  return module.exports.joinChannel(id, channel)
}

module.exports.IRCAway = (username, message) => {
  let id = userutil.getIdFromUsername(username)
  if (!id) {
    consoleColor.warn(`${username} doesn't exist`)
    return
  }
  share.tokens.getTokenFromUserid(id).awayMessage = message
  return (message === '') ? 305 : 306
}

module.exports.UsernameForBancho = (user) => {
  if (!user.includes(' ') && !user.includes('_')) {
    return user
  }
  let result = userutil.getIdFromUsername(user)

  if (result) {
    return user
  }

  return user.replace(/_/g, ' ')
}

module.exports.UsernameForIRC = (user) => {
  return user.replace(/ /g, '_')
}
