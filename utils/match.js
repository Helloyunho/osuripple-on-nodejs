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
    range(0, 16).forEach(i => {
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
    range(0, 16).forEach(x => {
      if (this.slots[x].user && this.slots[x].user in share.tokens.tokens && share.tokens.tokens[this.slots[x].user].userid === id) {
        return x
      }
    })
    return null
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
    range(0, 16).forEach(i => {
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
  }
}
