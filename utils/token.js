const userutil = require('./user')
const permission_ = require('../permission')
const user_status = require('./user_status')
const gamemodes = require('./gamemodes')
const console_color = require('./console_color')
const uuidv4 = require('uuid/v4')
const share = require('../share')
const packets = require('./packets')

module.exports = class {
    constructor(id, token_=null, ip='', irc=false, timeoffset=0, tournament=false) {
        this.userid = id
        this.username = userutil.getUsernameFromId(this.userid)
        this.easyUsername = userutil.getEasyUsernameFromId(this.userid)
        this.permission = userutil.getPermission(this.userid)
        this.irc = irc
        this.restricted = Boolean(this.permission & permission_.restricted)
        this.loginTime = Date.now()
        this.timeoffset = timeoffset
        this.streams = []
        this.tournament = tournament
        this.messages = []

        this.spectators = []
        this.spetating = false
        this.spetatingID = 0
        this.location = [0,0]
        this.joinedChannels = []
        this.ip = ip
        this.country = 0
        this.awayMessage = ""
        this.sentAway = []
        this.matchID = -1
        this.tillerino = [0,0,-1.0]
        this.silenceEndTime = 0
        this.queue = Buffer.from([])

        this.spamRate = 0

        this.actionID = user_status.IDLE
		this.actionText = ""
		this.actionMd5 = ""
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

    updateStatus() {
        let status = userutil.getStatus(this.userid, this.gameMode)
        console_color.log(status)
        if (!status) { 
            console_color.warn('Status is undifined!')
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
    getLatitude() {
        return this.location[0]
    }
    getLongitude() {
        return this.location[1]
    }

    // packets
    addpackets(packet) {
        if (this.irc || this.userid <= 1) {
            return
        }

        if (packet.length < 10 * 10 ** 6) {
            this.queue = Buffer.concat([this.queue, packet])
        } else {
            console_color.warn(`Wait, Username ${this.username}'s packets buffer is over 10M!! Stoped!`)
        }
    }
    resetpackets() {
        this.queue = Buffer.from([])
    }

    // spectating
    startSpectating(a) {
        this.stopSpectating()

        this.spetating = a.token
        this.spetatingID = a.userid

        a.spectators.push(this.token)

        let streamname = `spect/${a.userid}`
        share.streams.add(streamname)
        this.joinStream(streamname)
        a.joinStream(streamname)

        a.addpackets(packets.addSpectator(this.userid))

        share.channels
    }

    // stream
    joinStream(name) {
        share.streams.join(name, null, this.token)
        if (!this.streams.includes(name)) {
            this.streams.push(name)
        }
    }

    leaveStream(name) {
        share.streams.leave(name, null, this.token)
        if (!this.streams.includes(name)) {
            this.streams.pop(name)
        }
    }
    leaveAllStreams() {
        this.streams.forEach(x => {
            this.leaveStream(x)
        })
    }

    // channel

    joinChannel(channel) {
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

    partChannel(channel) {
        this.joinedChannels.pop(channel.name)
        this.leaveStream(`chat/${channel.name}`)
    }


}
