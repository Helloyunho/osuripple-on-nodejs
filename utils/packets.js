const slice = require('slice.js')

// login errors
module.exports.loginFailed = () => {
  return packet.buildPacket(packetid.server_userID, [[-1, datatypes.sInt32]])
}
module.exports.Banned = () => {
  let packets = packet.buildPacket(packetid.server_userID, [[-1, datatypes.sInt32]])
  packets = Buffer.concat([packets, module.exports.notification('You are Banned. HAHA Good bye stupid hacker!')])

  return packets
}
module.exports.forceUpdate = () => {
  return packet.buildPacket(packetid.server_userID, [[-2, datatypes.sInt32]])
}

// login

module.exports.userid = (id) => {
  return packet.buildPacket(packetid.server_userID, [[id, datatypes.sInt32]])
}

module.exports.silenceEndtime = (time) => {
  return packet.buildPacket(packetid.server_silenceEnd, [[time, datatypes.uInt32]])
}

module.exports.serverVersion = (ver = 19) => {
  return packet.buildPacket(packetid.server_protocolVersion, [[ver, datatypes.uInt32]])
}

module.exports.userPermission = (a) => {
  let result = 1
  if (a.supporter) {
    result |= 4
  }
  if (a.bat) {
    result |= 2
  }
  if (a.mod) {
    result |= 6
  }
  if (a.peppy) {
    result |= 8
  }
  if (a.admin) {
    result |= 16
  }
  if (a.tournament) {
    result |= 32
  }
  return packet.buildPacket(packetid.server_supporterGMT, [[result, datatypes.uInt32]])
}

module.exports.mainIcon = (ico) => {
  return packet.buildPacket(packetid.server_mainMenuIcon, [[ico, datatypes.string]])
}

module.exports.friendS = (id) => {
  let friends = userutil.getFriends(id)
  return packet.buildPacket(packetid.server_friendsList, [[friends, datatypes.int_list]])
}

module.exports.onlineUsers = () => {
  let userids = []
  let users = share.tokens.tokens

  Object.values(users, x => {
    if (!x.restricted) {
      userids.push(x.userid)
    }
  })

  return packet.buildPacket(packetid.server_userPresenceBundle, [[userids, datatypes.int_list]])
}

// Users

module.exports.logout = (id) => {
  return packet.buildPacket(packetid.server_userLogout, [[id, datatypes.sInt32], [0, datatypes.byte]])
}

module.exports.userPanel = (id, force = false) => {
  let userToken = share.tokens.getTokenFromUserid(id)
  if ((!userToken || userToken.restricted) && !force) {
    return Buffer.from([])
  }

  let username = userToken.username
  let timezone = 24 + userToken.timeoffset
  let country = userToken.country
  let gameRank = userToken.gameRank
  let latitude = userToken.getLatitude()
  let longitude = userToken.getLongitude()

  let userRank = 0
  if (username === 'A Bot') {
    userRank |= 6
  } else if (userToken.permission & permission.admin) {
    userRank |= 16
  } else if (userToken.permission & permission.mod) {
    userRank |= 6
  } else {
    userRank |= 4
  }

  return packet.buildPacket(packetid.server_userPanel, [
    [id, datatypes.sInt32],
    [username, datatypes.string],
    [timezone, datatypes.byte],
    [country, datatypes.byte],
    [userRank, datatypes.byte],
    [longitude, datatypes.ffloat],
    [latitude, datatypes.ffloat],
    [gameRank, datatypes.uInt32]
  ])
}

module.exports.userStatus = (id, force = false) => {
  let userToken = share.tokens.getTokenFromUserid(id)
  if ((!userToken || (userToken.restricted || userToken.irc || userToken.tournament)) && !force) {
    return Buffer.from([])
  }

  return packet.buildPacket(packetid.server_userStats, [
    [id, datatypes.uInt32],
    [userToken.actionID, datatypes.byte],
    [userToken.actionText, datatypes.string],
    [userToken.actionMd5, datatypes.string],
    [userToken.actionMods, datatypes.sInt32],
    [userToken.gameMode, datatypes.byte],
    [userToken.beatmapID, datatypes.sInt32],
    [userToken.rankedScore, datatypes.uInt64],
    [userToken.accuracy, datatypes.ffloat],
    [userToken.playcount, datatypes.uInt32],
    [userToken.totalScore, datatypes.uInt64],
    [userToken.gameRank, datatypes.uInt32],
    [(userToken.pp <= 65535 > 0) ? userToken.pp : 0, datatypes.uInt16]
  ])
}

// Spectator

module.exports.addSpectator = (id) => {
  return packet.buildPacket(packetid.server_spectatorJoined, [[id, datatypes.sInt32]])
}

module.exports.removeSpectator = (id) => {
  return packet.buildPacket(packetid.server_spectatorLeft, [[id, datatypes.sInt32]])
}

module.exports.spectatorFrames = data => {
  return packet.buildPacket(packetid.server_spectateFrames, [[data, datatypes.bbytes]])
}

module.exports.noSongSpectator = (id) => {
  return packet.buildPacket(packetid.server_spectatorCantSpectate, [[id, datatypes.sInt32]])
}

module.exports.fellowSpectatorJoined = (id) => {
  return packet.buildPacket(packetid.server_fellowSpectatorJoined, [[id, datatypes.sInt32]])
}

module.exports.fellowSpectatorLeft = (id) => {
  return packet.buildPacket(packetid.server_fellowSpectatorLeft, [[id, datatypes.sInt32]])
}

// Chat

module.exports.sendMessage = (fr, to, msg) => {
  return packet.buildPacket(packetid.server_sendMessage, [
    [fr, datatypes.string],
    [msg, datatypes.string],
    [to, datatypes.string],
    [userutil.getIdFromUsername(fr), datatypes.sInt32]
  ])
}

module.exports.channelJoinSuccess = (id, channel) => {
  return packet.buildPacket(packetid.server_channelJoinSuccess, [[channel, datatypes.string]])
}

module.exports.channelInfo = (channel) => {
  if (!(channel in share.channels.channels)) {
    return Buffer.from([])
  }
  let chan = share.channels.channels[channel]
  return packet.buildPacket(packetid.server_channelInfo, [
    [chan.name, datatypes.string],
    [chan.description, datatypes.string],
    [share.streams.streams[`chat/${channel}`].clients.length, datatypes.uInt16]
  ])
}

module.exports.channelInfoEnd = () => {
  return packet.buildPacket(packetid.server_channelInfoEnd, [[0, datatypes.uInt32]])
}

module.exports.channelKicked = (channel) => {
  return packet.buildPacket(packetid.server_channelKicked, [[channel, datatypes.string]])
}

module.exports.userSilenced = (id) => {
  return packet.buildPacket(packetid.server_userSilenced, [[id, datatypes.uInt32]])
}

// Multiplayer

module.exports.createMatch = (id) => {
  if (!(id in share.matches.matches)) {
    return Buffer.from([])
  }

  let match = share.matches.matches[id]
  let matchData = match.getMatchData(true)
  return packet.buildPacket(packetid.server_newMatch, matchData)
}

module.exports.updateMatch = (id, censored = false) => {
  if (!(id in share.matches.matches)) {
    return Buffer.from([])
  }

  let match = share.matches.matches[id]
  return packet.buildPacket(packetid.server_updateMatch, match.getMatchData(censored))
}

module.exports.matchStart = (id) => {
  if (!(id in share.matches.matches)) {
    return Buffer.from([])
  }

  let match = share.matches.matches[id]
  return packet.buildPacket(packetid.server_matchStart, match.getMatchData())
}

module.exports.disposeMatch = (id) => {
  return packet.buildPacket(packetid.server_disposeMatch, [[id, datatypes.uInt32]])
}

module.exports.matchJoinSuccess = (id) => {
  if (!(id in share.matches.matches)) {
    return Buffer.from([])
  }

  let match = share.matches.matches[id]
  let data = packet.buildPacket(packetid.server_matchJoinSuccess, match.getMatchData())
  return data
}

module.exports.matchJoinFail = () => {
  return packet.buildPacket(packetid.server_matchJoinFail)
}

module.exports.changeMatchPassword = (pass) => {
  return packet.buildPacket(packetid.server_matchChangePassword, [[pass, datatypes.string]])
}

module.exports.allPlayersLoaded = () => {
  return packet.buildPacket(packetid.server_matchAllPlayersLoaded)
}

module.exports.playerSkipped = (id) => {
  return packet.buildPacket(packetid.server_matchPlayerSkipped, [[id, datatypes.sInt32]])
}

module.exports.allPlayersSkipped = () => {
  return packet.buildPacket(packetid.server_matchSkip)
}

module.exports.matchFrames = (id, data) => {
  return packet.buildPacket(packetid.server_matchScoreUpdate, [[slice.default(data)['7:11'], datatypes.bbytes], [id, datatypes.bbytes], [slice.default(data)['12:'], datatypes.bbytes]])
}

module.exports.matchCompete = () => {
  return packet.buildPacket(packetid.server_matchComplete)
}

module.exports.playerFailed = (id) => {
  return packet.buildPacket(packetid.server_matchPlayerFailed, [[id, datatypes.uInt32]])
}

module.exports.matchTransferHost = () => {
  return packet.buildPacket(packetid.server_matchTransferHost)
}

module.exports.matchAbort = () => {
  return packet.buildPacket(packetid.server_matchAbort)
}

module.exports.switchServer = (address) => {
  return packet.buildPacket(packetid.server_switchServer, [[address, datatypes.string]])
}

// Other Things

module.exports.notification = (x) => {
  return packet.buildPacket(packetid.server_notification, [[x, datatypes.string]])
}

const packetid = require('./packetid')
const datatypes = require('../types').datatypes
const packet = require('./packet')
const userutil = require('./user')
const share = require('../share')
const permission = require('../permission')
