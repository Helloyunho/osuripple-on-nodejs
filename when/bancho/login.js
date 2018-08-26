const utils = require('../../utils')
const slice = require('slice.js')
const permission = require('../../permission')
const share = require('../../share')

module.exports = (req) => {
  let resTokenString = 'ayy'
  let resData = Buffer.from([])

  let reqIP = req.ip

  // Login Part
  let loginInfo = req.body.toString('utf8').split('\n')

  utils.consoleColor.log(`'${loginInfo[0]}' is trying to login with IP: ${reqIP}`)

  let username = loginInfo[0]
  // Get Something IMPORTANT Info
  let closerInfo = loginInfo[2].split('|')
  let osuVersion = closerInfo[0]
  let timeOffset = Number(closerInfo[1])
  let clientData = slice.default(closerInfo[3].split(':'))[':5']
  if (clientData.length < 4) {
    resData = Buffer.concat([resData, utils.packets.loginFailed(), utils.packets.notification('What are you doing?')])
    return returnObject(resTokenString, resData)
  }

  let userID = utils.user.getIdFromUsername(username)
  if (!userID) {
    utils.console_color.error('Error: wrong password or username')
    resData = Buffer.concat([resData, utils.packets.loginFailed()])
    return returnObject(resTokenString, resData)
  }
  let userPasswordCorrect = utils.user.checkLoginIsOk(userID, loginInfo[1])
  if (!userPasswordCorrect) {
    utils.console_color.error('Error: wrong password or username')
    resData = Buffer.concat([resData, utils.packets.loginFailed()])
    return returnObject(resTokenString, resData)
  }

  let userPer = utils.user.getPermission(userID)
  if (userPer & permission.banned) {
    utils.console_color.error(`Error: ${username} is banned.`)
    resData = Buffer.concat([resData, utils.packets.Banned()])
    return returnObject(resTokenString, resData)
  }
  
  let isTournament = osuVersion.includes('tourney')
  if (!isTournament) {
    share.tokens.deleteOldTokens(userID)
  }
  let resToken = share.tokens.addtoken(userID, reqIP, false, timeOffset, isTournament)
  resTokenString = resToken.token

  resToken.checkRestricted()

  resToken.silenceEndTime = utils.user.getSilenceEnd(userID)

  let silenceSeconds = resToken.getSilenceLeft()

  let userGMT = false
  let userSupporter = true
  let userTournament = false
  if (userPer & permission.admin) {
    userGMT = true
  }
  if (userPer & permission.tournament) {
    userTournament = true
  }

  resToken.addpackets(utils.packets.silenceEndtime(silenceSeconds))
  resToken.addpackets(utils.packets.userid(userID))
  resToken.addpackets(utils.packets.serverVersion())
  resToken.addpackets(utils.packets.userPermission({supporter: userSupporter, admin: userGMT, tournament: userTournament}))
  resToken.addpackets(utils.packets.userPanel(userID, true))
  resToken.addpackets(utils.packets.userStatus(userID, true))
  resToken.addpackets(utils.packets.channelInfoEnd())

  utils.chat.joinChannel(0, '#osu', resToken)
  utils.chat.joinChannel(0, '#announce', resToken)
  if (userGMT) {
    utils.chat.joinChannel(0, '#admin', resToken)
  }

  Object.keys(share.channels.channels).forEach(k => {
    if (share.channels.channels[k].publicRead && !share.channels.channels[k].hidden) {
      resToken.addpackets(utils.packets.channelInfo(k))
    }
  })

  resToken.addpackets(utils.packets.friendS(userID))

  Object.values(share.tokens.tokens).forEach(i => {
    if (!i.restricted) {
      resToken.addpackets(utils.packets.userPanel(i.userID))
    }
  })

  let {lat, long} = utils.location.getLocation(reqIP)
  let countryLetters = utils.location.getCountry(reqIP)
  let country = utils.location.getCountryID(countryLetters)

  resToken.setLocation(lat, long)
  resToken.country = country

  if (!resToken.restricted) {
    share.streams.broadcast('main', utils.packets.userPanel(userID))
  }
  resData = resToken.queue
  resToken.resetpackets()
  return returnObject(resTokenString, resData)
}

const returnObject = (a, b) => {
  return {resTokenString: a, resData: b}
}
