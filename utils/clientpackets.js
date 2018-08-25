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

module.exports.userActionChange = (stream) => {
  return packet.readPacketData(stream, [
    ['actionID', datatypes.byte],
    ['actionText', datatypes.string],
    ['actionMd5', datatypes.string],
    ['actionMods', datatypes.uInt32],
    ['gameMode', datatypes.byte],
    ['beatmapID', datatypes.sInt32]
  ])
}

module.exports.userStatsRequest = stream => {
  return packet.readPacketData(stream, [['users', datatypes.int_list]])
}

module.exports.userPanelRequest = stream => {
  return packet.readPacketData(stream, [['users', datatypes.int_list]])
}

module.exports.sendPublicMessage = stream => {
  return packet.readPacketData(stream, [
    ['unknown', datatypes.string],
    ['message', datatypes.string],
    ['to', datatypes.string]
  ])
}

module.exports.sendPrivateMessage = stream => {
  return packet.readPacketData(stream, [
    ['unknown', datatypes.string],
    ['message', datatypes.string],
    ['to', datatypes.string],
    ['unknown2', datatypes.string]
  ])
}

module.exports.setAwayMessage = stream => {
  return packet.readPacketData(stream, [
    ['unknown', datatypes.string],
    ['awayMessage', datatypes.string]
  ])
}

module.exports.channelJoin = stream => {
  return packet.readPacketData(stream, [['channel', datatypes.string]])
}

module.exports.channelPart = stream => {
  return packet.readPacketData(stream, [['channel', datatypes.string]])
}

module.exports.addRemoveFriend = stream => {
  return packet.readPacketData(stream, [['friendID', datatypes.sInt32]])
}

module.exports.startSpectating = stream => {
  return packet.readPacketData(stream, [['userID', datatypes.sInt32]])
}

module.exports.matchSettings = stream => {
  let data = []

  let struct = [
    ['matchID', datatypes.uInt16],
    ['inProgress', datatypes.byte],
    ['unknown', datatypes.byte],
    ['mods', datatypes.uInt32],
    ['matchName', datatypes.string],
    ['matchPassword', datatypes.string],
    ['beatmapName', datatypes.string],
    ['beatmapID', datatypes.uInt32],
    ['beatmapMD5', datatypes.string]
  ]

  range(0, 16).forEach(i => {
    struct.push([`slot${i}Status`, datatypes.byte])
  })

  range(0, 16).forEach(i => {
    struct.push([`slot${i}Team`, datatypes.byte])
  })

  data.push(packet.readPacketData(stream, struct))

  let start = 7 + 2 + 1 + 1 + 4 + 4 + 16 + 16 + data[0].matchName.length + data[0].matchPassword.length + data[0].beatmapMD5.length + data[0].beatmapName.length
  start += (data[0].matchName === '') ? 1 : 2
  start += (data[0].matchPassword === '') ? 1 : 2
  start += 2
  start += 2
  range(0, 16).forEach(i => {
    let s = data[0][`slot${i}Status`]
    if (s !== slotStatuses.FREE && s !== slotStatuses.LOCKED) {
      start += 4
    }
  })

  struct = [
    ['hostUserID', datatypes.sInt32],
    ['gameMode', datatypes.byte],
    ['scoringType', datatypes.byte],
    ['teamType', datatypes.byte],
    ['freeMods', datatypes.byte]
  ]

  data.push(packet.readPacketData(stream.slice(start), struct, false))

  let result = {}
  data.forEach(i => {
    result = {...result, ...i}
  })
  return result
}

module.exports.createMatch = stream => {
  return module.exports.matchSettings(stream)
}

module.exports.changeMatchSettings = stream => {
  return module.exports.matchSettings(stream)
}

module.exports.changeSlot = stream => {
  return packet.readPacketData(stream, [['slotID', datatypes.uInt32]])
}

module.exports.joinMatch = stream => {
  return packet.readPacketData(stream, [['matchID', datatypes.uInt32], ['password', datatypes.string]])
}

module.exports.changeMods = stream => {
  return packet.readPacketData(stream, [['mods', datatypes.uInt32]])
}

module.exports.lockSlot = stream => {
  return packet.readPacketData(stream, [['slotID', datatypes.uInt32]])
}

module.exports.transferHost = stream => {
  return packet.readPacketData(stream, [['slotID', datatypes.uInt32]])
}

module.exports.matchInvite = stream => {
  return packet.readPacketData(stream, [['userID', datatypes.uInt32]])
}

module.exports.matchFrames = stream => {
  return packet.readPacketData(stream, [
    ['time', datatypes.sInt32],
    ['id', datatypes.byte],
    ['count300', datatypes.uInt16],
    ['count100', datatypes.uInt16],
    ['count50', datatypes.uInt16],
    ['countGeki', datatypes.uInt16],
    ['countKatu', datatypes.uInt16],
    ['countMiss', datatypes.uInt16],
    ['totalScore', datatypes.sInt32],
    ['maxCombo', datatypes.uInt16],
    ['currentCombo', datatypes.uInt16],
    ['perfect', datatypes.byte],
    ['currentHp', datatypes.byte],
    ['tagByte', datatypes.byte],
    ['usingScoreV2', datatypes.byte]
  ])
}

module.exports.tournamentMatchInfoRequest = stream => {
  return packet.readPacketData(stream, [['matchID', datatypes.uInt32]])
}

module.exports.tournamentJoinMatchChannel = stream => {
  return packet.readPacketData(stream, [['matchID', datatypes.uInt32]])
}

module.exports.tournamentLeaveMatchChannel = stream => {
  return packet.readPacketData(stream, [['matchID', datatypes.uInt32]])
}

const datatypes = require('../types').datatypes
const packet = require('./packet')
const slotStatuses = require('./matchType').Statuses
