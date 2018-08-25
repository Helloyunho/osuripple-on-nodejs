const userutil = require('./user')
const permission_ = require('../permission')
const userStatus = require('./userStatus')
const gamemodes = require('./gamemodes')
const consoleColor = require('./consoleColor')
const uuidv4 = require('uuid/v4')
const share = require('../share')
const packets = require('./packets')
const slice = require('slice.js')
const dateFormat = require('dateformat')
const chat = require('./chat')

module.exports = class {
  constructor (id, token_ = null, ip = '', irc = false, timeoffset = 0, tournament = false) {
    this.userid = id
    this.username = userutil.getUsernameFromId(this.userid)
    this.easyUsername = userutil.getEasyUsernameFromId(this.userid)
    this.permission = userutil.getPermission(this.userid)
    this.irc = irc
    this.restricted = Boolean(this.permission & permission_.restricted)
    this.loginTime = Date.now()
    this.pingTime = this.loginTime
    this.timeoffset = timeoffset
    this.streams = []
    this.tournament = tournament
    this.messages = []

    this.spectators = []
    this.spectating = false
    this.spectatingID = 0
    this.location = [0, 0]
    this.joinedChannels = []
    this.ip = ip
    this.country = 0
    this.awayMessage = ''
    this.sentAway = []
    this.matchID = -1
    this.tillerino = [0, 0, -1.0]
    this.silenceEndTime = 0
    this.queue = Buffer.from([])

    this.spamRate = 0

    this.actionID = userStatus.IDLE
    this.actionText = ''
    this.actionMd5 = ''
    this.actionMods = 0
    this.gameMode = gamemodes.STD
    this.beatmapID = 0
    this.rankedScore = 0
    this.accuracy = 0.0
    this.playcount = 0
    this.totalScore = 0
    this.gameRank = 0
    this.pp = 0

    if (token_) {
      this.token = token_
    } else {
      this.token = uuidv4()
    }

    this.updateStatus()
  }

  updateStatus () {
    let status = userutil.getStatus(this.userid, this.gameMode)
    consoleColor.log(status)
    if (!status) {
      consoleColor.warn('Status is undifined!')
      return
    }
    this.rankedScore = status.rankedScore
    this.accuracy = status.accuracy
    this.playcount = status.playcount
    this.totalScore = status.totalScore
    this.gameRank = status.game_rank
    this.pp = status.pp
  }

  // location
  getLatitude () {
    return this.location[0]
  }
  getLongitude () {
    return this.location[1]
  }
  setLocation (lat, long) {
    this.location = [lat, long]
  }

  // packets
  addpackets (packet) {
    if (this.irc || this.userid <= 1) {
      return
    }

    if (packet.length < 10 * 10 ** 6) {
      this.queue = Buffer.concat([this.queue, packet])
    } else {
      consoleColor.warn(`Wait, Username ${this.username}'s packets buffer is over 10M!! Stoped!`)
    }
  }
  resetpackets () {
    this.queue = Buffer.from([])
  }

  // spectating
  startSpectating (a) {
    this.stopSpectating()

    this.spectating = a.token
    this.spectatingID = a.userid

    a.spectators.push(this.token)

    let streamname = `spect/${a.userid}`
    share.streams.add(streamname)
    this.joinStream(streamname)
    a.joinStream(streamname)

    a.addpackets(packets.addSpectator(this.userid))

    share.channels.addTempChannel(`#spect_${a.userid}`)
    chat.joinChannel(0, `#spect_${a.userid}`, this)
    if (a.spectators.length === 1) {
      chat.joinChannel(0, `#spect_${a.userid}`, a)
    }

    share.streams.broadcast(streamname, packets.fellowSpectatorJoined(this.userid))

    a.spectators.forEach(i => {
      if (i !== this.token && i in share.tokens.tokens) {
        this.addpackets(packets.fellowSpectatorJoined(share.tokens.tokens[i].userid))
      }
    })
  }

  stopSpectating () {
    let hostToken
    if (!this.spectating || this.spectatingID <= 0) {
      return
    }
    if (this.spectating in share.tokens.tokens) {
      hostToken = share.tokens.tokens[this.spectating]
    } else {
      hostToken = null
    }
    let streamName = `spect${this.spectatingID}`

    this.leaveStream(streamName)
    if (hostToken) {
      hostToken.spectators.pop(this.token)
      hostToken.addpackets(packets.removeSpectator(this.userid))

      hostToken.spectators.forEach(i => {
        if (i in share.tokens.tokens) {
          share.tokens.tokens[i].addpackets(packets.fellowSpectatorLeft(this.userid))
        }
      })

      if (hostToken.spectators.length === 0) {
        chat.partChannel(0, `spect${hostToken.userid}`, hostToken, true, true)
        hostToken.leaveStream(streamName)
      }
    }

    chat.partChannel(0, streamName, this, true, true)

    this.spectating = null
    this.spectatingID = 0
  }

  // Ping(?)

  updatePingTime () {
    this.pingTime = Date.now()
  }

  // Match!!

  joinMatch (matchID) {
    if (!(matchID in share.matches.matches)) {
      return null
    }

    let match = share.matches.matches[matchID]

    this.stopSpectating()

    if (this.matchID > -1 && this.matchID !== matchID) {
      this.leaveMatch()
    }

    let joined = match.userJoin(this)
    if (!joined) {
      this.addpackets(packets.matchJoinFail())
      return null
    }

    this.matchID = matchID
    this.joinStream(match.streamName)
    chat.joinChannel(0, `#multi_${this.matchID}`, this)
    this.addpackets(packets.matchJoinSuccess(matchID))

    if (match.isTourney) {
      this.addpackets(packets.notification('You are now in a tournament match.'))
      match.sendReadyStatus()
    }
  }

  leaveMatch () {
    if (this.matchID === -1) {
      return null
    }

    chat.partChannel(0, `#multi_${this.matchID}`, this, true, true)
    this.leaveStream(`multi/${this.matchID}`)
    this.leaveStream(`multi/${this.matchID}/playing`)

    let leavingMatchID = this.matchID
    this.matchID = -1

    if (!(leavingMatchID in share.matches.matches)) {
      return null
    }

    let match = share.matches.matches[leavingMatchID]

    match.userLeft(this)

    if (match.isTourney) {
      match.sendReadyStatus()
    }
  }

  // kick to the moon!
  kick (message = 'You have been kicked from the server. Please login again.', reason = 'kick') {
    if (message !== '') {
      this.addpackets(packets.notification(message))
    }
    this.addpackets(packets.loginFailed())
    
    logoutEvent(this, null, this.irc)
  }

  setRestricted () {
    this.restricted = true
    chat.sendMessage('A Bot', this.username, 'Your account is currently in restricted mode. Please visit Helloyunho\'s website for more information.')
  }

  resetRestricted () {
    chat.sendMessage('A Bot', this.username, 'Your account has been unrestricted! Please log in again.')
  }

  checkRestricted () {
    let oldRestricted = this.restricted
    this.restricted = Boolean(this.permission & permission_.restricted)
    if (this.restricted) {
      this.setRestricted()
    } else if (!this.restricted && oldRestricted !== this.restricted) {
      this.resetRestricted()
    }
  }

  // stream
  joinStream (name) {
    share.streams.join(name, null, this.token)
    if (!this.streams.includes(name)) {
      this.streams.push(name)
    }
  }

  leaveStream (name) {
    share.streams.leave(name, null, this.token)
    if (!this.streams.includes(name)) {
      this.streams.pop(name)
    }
  }
  leaveAllStreams () {
    this.streams.forEach(x => {
      this.leaveStream(x)
    })
  }

  // IDK

  awayCheck (id) {
    if (this.awayMessage === '' || this.sentAway.includes(id)) {
      return false
    }
    this.sentAway.push(id)
    return true
  }

  // channel

  joinChannel (channel) {
    if (this.joinedChannels.includes(channel.name)) {
      return
    }
    if (!channel.Read && !(this.permission & 2 << 9)) {
      return
    }
    this.joinedChannels.push(channel.name)
    this.joinStream(`chat/${channel.name}`)
    this.addpackets(packets.channelJoinSuccess(this.userid, channel.clientName))
  }

  partChannel (channel) {
    this.joinedChannels.pop(channel.name)
    this.leaveStream(`chat/${channel.name}`)
  }

  // silence

  isSilenced () {
    return this.silenceEndTime - Date.now() > 0
  }

  getSilenceLeft () {
    return Math.max(0, this.silenceEndTime - Date.now())
  }

  silence (sec = null, reason = '', author = 1) {
    if (!sec) {
      sec = Math.max(0, userutil.getSilenceEnd(this.userid) - Date.now())
    } else {
      userutil.silence(this.userid, sec, reason, author)
    }

    this.silenceEndTime = Date.now() + sec

    this.addpackets(packets.silenceEndtime(sec))

    share.streams.broadcast('main', packets.userSilenced(this.userid))
  }

  spamProtection (increaseSpamRate = true) {
    if (increaseSpamRate) {
      this.spamRate++
    }

    if (this.spamRate > 10) {
      this.silence(1800, 'Spamming (A Bot\'s auto spam detection)')
    }
  }

  // Message

  addMessageInBuffer (chan, msg) {
    if (this.messages.length > 9) {
      this.messages = slice.default(this.messages)['1:']
    }
    this.messages.push(`${dateFormat(new Date(), 'HH:MM')} - ${this.username}@${chan}: ${slice.default(msg)[':50']}`)
  }

  getMessagesBufferString () {
    let a = ''
    this.messages.forEach(x => {
      a += x.join('\n')
    })
    return a
  }
}
