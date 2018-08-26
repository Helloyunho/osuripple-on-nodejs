const chat = require('./chat')
const share = require('../share')
const packets = require('./packets')
const datatypes = require('../types').datatypes
const matchtypes = require('./matchType')
const consoleColor = require('./consoleColor')

// By https://stackoverflow.com/a/8273091/9376340
function range (start, stop, step) {
  if (typeof stop === 'undefined') {
    // one param defined
    stop = start
    start = 0
  }

  if (typeof step === 'undefined') {
    step = 1
  }

  if ((step > 0 && start >= stop) || (step < 0 && start <= stop)) {
    return []
  }

  var result = []
  for (var i = start; step > 0 ? i < stop : i > stop; i += step) {
    result.push(i)
  }

  return result
}

class Slot {
  constructor () {
    this.status = matchtypes.Statuses.FREE
    this.team = matchtypes.Teams.NO_TEAM
    this.userid = -1
    this.user = null
    this.mods = 0
    this.loaded = false
    this.skip = false
    this.complete = false
    this.score = 0
    this.failed = false
    this.passed = true
  }
}

module.exports = class {
  constructor (matchid, matchname, matchpassword, beatmapid, beatmapname, beatmapMD5, gamemode, hostuserid, istourney = false) {
    this.matchID = matchid
    this.streamName = `multi/${this.matchID}`
    this.playingStreamName = `${this.streamName}/playing`
    this.inProgress = false
    this.mods = 0
    this.matchName = matchname
    this.matchPassword = matchpassword
    this.beatmapID = beatmapid
    this.beatmapName = beatmapname
    this.beatmapMD5 = beatmapMD5
    this.hostUserID = hostuserid
    this.gameMode = gamemode
    this.matchScoringType = matchtypes.ScoringTypes.SCORE
    this.matchTeamType = matchtypes.TeamTypes.HEAD_TO_HEAD
    this.matchModMode = matchtypes.ModModes.NORMAL
    this.seed = 0
    this.matchDataCache = Buffer.from([])
    this.isTourney = istourney
    this.isLocked = false
    this.isStarting = false
    this.createTime = Date.now()

    this.slots = []
    let a = 0
    while (a < 16) {
      this.slots.push(new Slot())
      a++
    }

    share.streams.add(this.streamName)
    share.streams.add(this.playingStreamName)

    share.channels.addHiddenChannel(`#multi_${this.matchID}`)
  }

  getMatchData (censored = false) {
    let struct = [
      [this.matchID, datatypes.uInt16],
      [Number(this.inProgress), datatypes.byte],
      [0, datatypes.byte],
      [this.mods, datatypes.uInt32],
      [this.matchName, datatypes.string]
    ]

    if (censored && this.matchPassword) {
      struct.push(['redacted', datatypes.string])
    } else {
      struct.push([this.matchPassword, datatypes.string])
    }

    struct = struct.concat([
      [this.beatmapName, datatypes.string],
      [this.beatmapID, datatypes.uInt32],
      [this.beatmapMD5, datatypes.string]
    ])

    range(0, 16).forEach(i => {
      struct.append([this.slots[i].status, datatypes.byte])
    })

    range(0, 16).forEach(i => {
      struct.append([this.slots[i].team, datatypes.byte])
    })

    range(0, 16).forEach(i => {
      if (this.slots[i].user && this.slots[i].user in share.tokens.tokens) {
        struct.append([share.tokens.tokens[this.slots[i].user].userid, datatypes.uInt32])
      }
    })

    struct = struct.concat([
      [this.hostUserID, datatypes.sInt32],
      [this.gameMode, datatypes.byte],
      [this.matchScoringType, datatypes.byte],
      [this.matchTeamType, datatypes.byte],
      [this.matchModMode, datatypes.byte]
    ])

    if (this.matchModMode === matchtypes.ModModes.FREE_MOD) {
      range(0, 16).forEach(i => {
        struct.push([this.slots[i].mods, datatypes.uInt32])
      })
    }

    struct.push([this.seed, datatypes.uInt32])

    return struct
  }

  sendUpdates () {
    this.matchDataCache = packets.updateMatch(this.matchID)
    let censoredDataCache = packets.updateMatch(this.matchID, true)
    if (this.matchDataCache) {
      share.streams.broadcast(this.streamName, this.matchDataCache)
    }
    if (censoredDataCache) {
      share.streams.broadcast('lobby', censoredDataCache)
    } else {
      consoleColor.error(`MP id: ${this.matchID} ERROR!: Can't send match update packet! IT's EMPTY`)
    }
  }

  setHost (newHost) {
    let slotID = this.getUserSlotID(newHost)
    if (!slotID || !(this.slots[slotID].user in share.tokens.tokens)) {
      return false
    }
    let token = share.tokens.tokens[this.slots[slotID].user]
    this.hostUserID = newHost
    token.addpacket(packets.matchTransferHost())
    this.sendUpdates()
    return true
  }

  removeHost () {
    this.hostUserID = -1
    this.sendUpdates()
  }

  setSlot (slotID, status = null, team = null, user = '', mods = null, loaded = null, skip = null, complete = null) {
    if (status) {
      this.slots[slotID].status = status
    }
    if (team) {
      this.slots[slotID].team = team
    }
    if (user !== '') {
      this.slots[slotID].user = user
    }
    if (mods !== null) {
      this.slots[slotID].mods = mods
    }
    if (loaded) {
      this.slots[slotID].loaded = loaded
    }
    if (skip) {
      this.slots[slotID].skip = skip
    }
    if (complete) {
      this.slots[slotID].complete = complete
    }
  }

  setSlotMods (slotID, mods) {
    this.setSlot(slotID, null, null, '', mods)
    this.sendUpdates()
  }

  toggleSlotReady (id) {
    if (!this.slots[id].user || this.isStarting) {
      return
    }
    let oldStatus = this.slots[id].status
    let newStatus
    if (oldStatus === matchtypes.Statuses.READY) {
      newStatus = matchtypes.Statuses.NOT_READY
    } else {
      newStatus = matchtypes.Statuses.READY
    }

    this.setSlot(id, newStatus)
    this.sendUpdates()
  }

  toggleSlotLocked (id) {
    let newStatus
    if (this.slots[id].status === matchtypes.Statuses.LOCKED) {
      newStatus = matchtypes.Statuses.FREE
    } else {
      newStatus = matchtypes.Statuses.LOCKED
    }

    if (this.slots[id].user && this.slots[id].user in share.tokens.tokens) {
      share.tokens.tokens[this.slots[id].user].addpacket(packets.updateMatch(this.matchID))
    }

    this.setSlot(id, newStatus, 0, null, 0)

    this.sendUpdates()
  }

  playerLoaded (id) {
    let slotid = this.getUserSlotID(id)
    if (!slotid) {
      return
    }

    this.slots[slotid].loaded = true

    let total = 0
    let loaded = 0

    range(0, 16).forEach(i => {
      if (this.slots[i].status === matchtypes.Statuses.PLAYING) {
        total++
        if (this.slots[i].loaded) {
          loaded++
        }
      }
    })

    if (total === loaded) {
      this.allPlayersLoaded()
    }
  }

  allPlayersLoaded () {
    share.streams.broadcast(this.playingStreamName, packets.allPlayersLoaded())
  }

  playerSkip (id) {
    let slotid = this.getUserSlotID(id)

    if (!slotid) {
      return
    }

    this.slots[slotid].skip = true

    share.streams.broadcast(this.playingStreamName, packets.playerSkipped(slotid))

    let total = 0
    let skipped = 0

    range(0, 16).forEach((i) => {
      if (this.slots[i].status === matchtypes.Statuses.PLAYING) {
        total++
        if (this.slots[i].skip) {
          skipped++
        }
      }
    })

    if (total === skipped) {
      this.allPlayersSkipped()
    }
  }

  allPlayersSkipped () {
    share.streams.broadcast(this.playingStreamName, packets.allPlayersSkipped())
  }

  getUserSlotID (id) {
    let data = null

    range(0, 16).forEach((x) => {
      if (this.slots[x].user && this.slots[x].user in share.tokens.tokens && share.tokens.tokens[this.slots[x].user].userid === id) {
        data = x
      }
    })

    return data
  }

  updateScore (id, score) {
    this.slots[id].score = score
  }

  updateHP (id, hp) {
    this.slots[id].failed = (hp === 254)
  }

  playerCompleted (id) {
    let slotid = this.getUserSlotID(id)
    if (!slotid) {
      return
    }
    this.setSlot(slotid, null, null, '', 0, null, null, true)

    let total = 0
    let complete = 0

    range(0, 16).forEach((i, index) => {
      if (this.slots[i].status === matchtypes.Statuses.PLAYING) {
        total++
        if (this.slots[i].complete) {
          complete++
        }
      }
    })

    if (total === complete) {
      this.allPlayersCompleted()
    }
  }

  allPlayersCompleted () {
    let infoToSend = {
      id: this.matchID,
      name: this.matchName,
      beatmap_id: this.beatmapID,
      mods: this.mods,
      game_mode: this.gameMode,
      scores: {}
    }
    range(0, 16).forEach(i => {
      if (this.slots[i].user && this.slots[i].status === matchtypes.Statuses.PLAYING) {
        infoToSend.scores[share.tokens.tokens[this.slots[i].user].userID] = {
          scores: this.slots[i].score,
          mods: this.slots[i].mods,
          failed: this.slots[i].failed,
          pass: this.slots[i].passed,
          team: this.slots[i].team
        }
      }
    })

    this.inProgress = false

    this.resetSlots()

    this.sendUpdates()

    share.streams.broadcast(this.streamName, packets.matchCompete())

    share.streams.dispose(this.playingStreamName)
    share.streams.remove(this.playingStreamName)

    let chanName = `#multi_${this.matchID}`
    if (this.isTourney && (chanName in share.channels.channels)) {
      chat.sendMessage('A Bot', chanName, 'Match has just finished.')
    }
  }

  resetSlots () {
    range(0, 16).forEach(i => {
      if (this.slots[i].user && this.slots[i].status === matchtypes.Statuses.PLAYING) {
        this.slots[i].status = matchtypes.Statuses.NOT_READY
        this.slots[i].loaded = false
        this.slots[i].skip = false
        this.slots[i].complete = false
        this.slots[i].score = 0
        this.slots[i].failed = false
        this.slots[i].passed = true
      }
    })
  }

  userJoin (user) {
    let rangeList = range(0, 16)
    let data = null

    rangeList.forEach(i => {
      if (this.slots[i].user === user.token) {
        this.setSlot(i, matchtypes.Statuses.FREE, 0, null, 0)
      }
    })

    rangeList.forEach((i) => {
      if (this.slots[i].status === matchtypes.Statuses.FREE) {
        let team = matchtypes.Teams.NO_TEAM
        if (this.matchTeamType === matchtypes.TeamTypes.TEAM_VS || this.matchTeamType === matchtypes.TeamTypes.TAG_TEAM_VS) {
          team = (i % 2 === 0) ? matchtypes.Teams.RED : matchtypes.Teams.BLUE
        }
        this.setSlot(i, matchtypes.Statuses.NOT_READY, team, user.token, 0)

        this.sendUpdates()

        data = true
      }
    })

    return data
  }

  userLeft (user, disposeMatch = true) {
    let slotid = this.getUserSlotID(user.userid)
    if (!slotid) {
      return null
    }

    this.setSlot(slotid, matchtypes.Statuses.FREE, 0, null, 0)

    if (this.coundUsers() === 0 && disposeMatch && !this.isTourney) {
      share.matches.disposeMatch(this.matchID)
      return null
    }

    if (user.userid === this.hostUserID) {
      range(0, 16).some(i => {
        if (this.slots[i].user && this.slots[i].user in share.tokens.tokens) {
          this.setHost(share.tokens.tokens[this.slots[i].user].userid)
        }
        return this.slots[i].user && this.slots[i].user in share.tokens.tokens
      })
    }

    this.sendUpdates()
  }

  userChangeSlot (userid, newSlotID) {
    if (this.isLocked || this.isStarting) {
      return false
    }

    let oldSlotID = this.getUserSlotID(userid)
    if (!oldSlotID) {
      return false
    }

    if (this.slots[newSlotID].user || this.slots[newSlotID].status !== matchtypes.Statuses.FREE) {
      return false
    }

    let oldData = Object.assign({}, this.slots[oldSlotID])

    this.setSlot(oldSlotID, matchtypes.Statuses.FREE, 0, null, 0, false, false, false)

    this.setSlot(newSlotID, oldData.status, oldData.team, oldData.user, oldData.mods)

    this.sendUpdates()

    return true
  }

  changePassword (newPassword) {
    this.matchPassword = newPassword

    share.streams.broadcast(this.streamName, packets.changeMatchPassword(this.matchPassword))

    this.sendUpdates()
  }

  changeMods (mods) {
    this.mods = mods
    this.sendUpdates()
  }

  userHasBeatmap (userid, has = true) {
    let slotID = this.getUserSlotID(userid)
    if (!slotID) {
      return null
    }

    this.setSlot(slotID, (!has) ? matchtypes.Statuses.NO_MAP : matchtypes.Statuses.NOT_READY)

    this.sendUpdates()
  }

  transferHost (slotid) {
    if (!this.slots[slotid].user || !(this.slots[slotid].user in share.tokens.tokens)) {
      return null
    }

    this.setHost(share.tokens.tokens[this.slots[slotid].user].userid)
  }

  playerFailed (userid) {
    let slotID = this.getUserSlotID(userid)
    if (!slotID) {
      return null
    }

    this.slots[slotID].passed = false

    share.streams.broadcast(this.playingStreamName, packets.playerFailed(slotID))
  }

  invite (fro, to) {
    let froToken = share.tokens.getTokenFromUserid(fro)
    let toToken = share.tokens.getTokenFromUserid(to)
    if (!froToken || !toToken) {
      return null
    }

    if (to === 1) {
      chat.sendMessage('A Bot', froToken.username, 'I\'m a bot! So I can\'t play anything!')
    }

    let message = `Play with me!! "[osump://${this.matchID}/${this.matchPassword.replace(' ', '_')} ${this.matchName}]"`
    chat.sendMessage('', toToken.username, message, froToken)
  }

  countUsers () {
    let c = 0
    range(0, 16).forEach(i => {
      if (this.slots[i].user) {
        c++
      }
    })
    return c
  }

  changeTeam (userid, newTeam = null) {
    if (this.matchTeamType !== matchtypes.TeamTypes.TEAM_VS && this.matchTeamType !== matchtypes.TeamTypes.TAG_TEAM_VS) {
      return null
    }

    if (this.isLocked || this.isStarting) {
      return null
    }

    let slotID = this.getUserSlotID(userid)
    if (!slotID) {
      return null
    }

    if (!newTeam) {
      newTeam = (this.slots[slotID].team === matchtypes.Teams.RED) ? matchtypes.Teams.BLUE : matchtypes.Teams.RED
    }
    this.setSlot(slotID, null, newTeam)
    this.sendUpdates()
  }

  checkTeams () {
    if (this.matchTeamType !== matchtypes.TeamTypes.TEAM_VS && this.matchTeamType !== matchtypes.TeamTypes.TAG_TEAM_VS) {
      return true
    }

    let firstTeam = -1
    let data = false
    range(0, 16).forEach(i => {
      if (this.slots[i].user && (this.slots[i].status & matchtypes.Statuses.NO_MAP) === 0) {
        if (firstTeam === -1) {
          firstTeam = this.slots[i].team
        } else if (firstTeam !== this.slots[i].team) {
          data = true
        }
      }
    })

    return data
  }

  start () {
    this.isStarting = false

    if (this.countUsers() < 2 || !this.checkTeams()) {
      return false
    }

    share.streams.add(this.playingStreamName)

    this.inProgress = true

    range(0, 16).forEach(i => {
      if (this.slots[i].user in share.tokens.tokens) {
        this.slots[i].status = matchtypes.Statuses.PLAYING
        this.slots[i].loaded = false
        this.slots[i].skip = false
        this.slots[i].complete = false
        share.tokens.tokens[this.slots[i].user].joinStream(this.playingStreamName)
      }
    })

    share.streams.broadcast(this.playingStreamName, packets.matchStart(this.matchID))

    this.sendUpdates()
    return true
  }

  forceSize (matchSize) {
    range(0, matchSize).forEach(i => {
      if (this.slots[i].status === matchtypes.Statuses.LOCKED) {
        this.toggleSlotLocked(i)
      }
    })
    range(matchSize, 16).forEach(i => {
      if (this.slots[i].status !== matchtypes.Statuses.LOCKED) {
        this.toggleSlotLocked(i)
      }
    })
  }

  abort () {
    if (!this.inProgress) {
      return null
    }
    this.inProgress = false
    this.isStarting = false
    this.resetSlots()
    this.sendUpdates()
    share.streams.broadcast(this.playingStreamName, packets.matchAbort())
    share.streams.dispose(this.playingStreamName)
    share.streams.remove(this.playingStreamName)
  }

  initializeTeams () {
    if (this.matchTeamType === matchtypes.TeamTypes.TEAM_VS || this.matchTeamType === matchtypes.TeamTypes.TAG_TEAM_VS) {
      this.slots.forEach((i, index) => {
        i.team = (index % 2 === 0) ? matchtypes.Teams.RED : matchtypes.Teams.BLUE
      })
    } else {
      this.slots.forEach(i => {
        i.team = matchtypes.Teams.NO_TEAM
      })
    }
  }

  resetMods () {
    this.slots.forEach(i => {
      i.mods = 0
    })
  }

  resetReady () {
    this.slots.forEach(i => {
      if (i.status === matchtypes.Statuses.READY) {
        i.status = matchtypes.Statuses.NOT_READY
      }
    })
  }

  sendReadyStatus () {
    let chanName = `#multi_${this.matchID}`

    if (!(chanName in share.channels.channels)) {
      return null
    }

    let totalUsers = 0
    let readyUsers = 0

    this.slots.forEach(i => {
      if (!i.user) {
        return
      }

      totalUsers++

      if (i.status === matchtypes.Statuses.READY) {
        readyUsers++
      }
    })

    let message = `${readyUsers} users ready out of ${totalUsers}.`

    if (totalUsers === readyUsers) {
      message += ' All users ready!'
    }

    if (totalUsers === 0) {
      message = 'The match is now empty.'
    }

    chat.sendMessage('A Bot', chanName, message)
  }
}
