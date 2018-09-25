const http = require('http')
const express = require('express')
let app = express()
const server = http.createServer(app)
const bodyParser = require('body-parser')
const compression = require('compression')
app.use(compression())
const rawBodySaver = (req, res, buf, encoding) => {
  if (buf && buf.length) {
    req.rawBody = buf.toString(encoding || 'utf8')
  }
}

app.use(bodyParser.raw({verify: rawBodySaver, type: () => { return true }}))
app.set('port', 5001)

server.listen(app.get('port'), () => {
  console.log('Welcome to osu! server!')
  share.streams.add('main')
  share.streams.add('lobby')
  share.redis.subscribe('bancho:update_cached_stats')
  share.redis.on('message', (channel, message) => {
    if (channel === 'bancho:update_cached_stats') {
      console.log('recived: update_cached_stats')
      let userID = Number(message)
      if (!userID) {
        return undefined
      }
      let token = share.tokens.getTokenFromUserid(userID)
      token.updateStatus()
    }
  })
  utils.abot.connect()
})

app.route('/')
  .get((req, res) => {
    res.end('Hello, and here is custom bancho server. So... get the fu** off!')
  })
  .post((req, res) => {
    let reqToken = req.get('osu-token')
    let reqData = req.body

    let resToken = 'ayy'
    let resData = Buffer.from([])

    if (!reqToken) {
      let a = when.login(req)
      resToken = a.resTokenString
      resData = a.resData
    } else {
      let userToken = null
      let pos = 0

      if (!(reqToken in share.tokens.tokens)) {
        resData = utils.packets.loginFailed()
        resData = Buffer.concat([resData, utils.packets.notification('OMG! Server is rebooted... Please login again!')])
      } else {
        userToken = share.tokens.tokens[reqToken]

        while (pos < reqData.length) {
          let leftData = reqData.slice(pos)

          let packetID = utils.packet.readPacketID(leftData)
          let dataLength = utils.packet.readPacketLength(leftData)
          let packetData = reqData.slice(pos, (pos + dataLength + 7))

          if (packetID !== 4) {
            utils.consoleColor.log(`${reqToken} sended packet id: ${packetID}`)
          }

          const eventHandle = ev => {
            const wrapper = () => {
              ev(userToken, packetData)
            }
            return wrapper
          }

          let eventHandler = Object()

          eventHandler[utils.packetid.client_logout] = eventHandle(when.logout)
          eventHandler[utils.packetid.client_requestStatusUpdate] = eventHandle(when.requestStatusUpdate)
          eventHandler[utils.packetid.client_changeAction] = eventHandle(when.changeAction)
          eventHandler[utils.packetid.client_userPanelRequest] = eventHandle(when.userPanelRequest)
          eventHandler[utils.packetid.client_userStatsRequest] = eventHandle(when.userStatsRequest)
          eventHandler[utils.packetid.client_channelJoin] = eventHandle(when.channelJoin)
          eventHandler[utils.packetid.client_channelPart] = eventHandle(when.channelPart)
          eventHandler[utils.packetid.client_sendPublicMessage] = eventHandle(when.sendPublicMessage)
          eventHandler[utils.packetid.client_sendPrivateMessage] = eventHandle(when.sendPrivateMessage)
          eventHandler[utils.packetid.client_spectateFrames] = eventHandle(when.spectateFrames)
          eventHandler[utils.packetid.client_startSpectating] = eventHandle(when.startSpectating)
          eventHandler[utils.packetid.client_stopSpectating] = eventHandle(when.stopSpectating)
          eventHandler[utils.packetid.client_matchChangeMods] = eventHandle(when.changeMatchMods)
          eventHandler[utils.packetid.client_matchChangePassword] = eventHandle(when.changeMatchPassword)
          eventHandler[utils.packetid.client_matchChangeSettings] = eventHandle(when.changeMatchSettings)
          eventHandler[utils.packetid.client_cantSpectate] = eventHandle(when.cantSpectate)
          eventHandler[utils.packetid.client_matchChangeSlot] = eventHandle(when.changeSlot)
          eventHandler[utils.packetid.client_createMatch] = eventHandle(when.createMatch)
          eventHandler[utils.packetid.client_joinLobby] = eventHandle(when.joinLobby)
          eventHandler[utils.packetid.client_joinMatch] = eventHandle(when.joinMatch)
          eventHandler[utils.packetid.client_matchChangeTeam] = eventHandle(when.matchChangeTeam)
          eventHandler[utils.packetid.client_matchComplete] = eventHandle(when.matchComplete)
          eventHandler[utils.packetid.client_matchFailed] = eventHandle(when.matchFailed)
          eventHandler[utils.packetid.client_matchScoreUpdate] = eventHandle(when.matchFrames)
          eventHandler[utils.packetid.client_matchHasBeatmap] = eventHandle(when.matchHasBeatmap)
          eventHandler[utils.packetid.client_invite] = eventHandle(when.matchInvite)
          eventHandler[utils.packetid.client_matchLock] = eventHandle(when.matchLock)
          eventHandler[utils.packetid.client_matchNoBeatmap] = eventHandle(when.matchNoBeatmap)
          eventHandler[utils.packetid.client_matchLoadComplete] = eventHandle(when.matchPlayerLoad)
          eventHandler[utils.packetid.client_matchReady] = eventHandle(when.matchReady)
          eventHandler[utils.packetid.client_matchNotReady] = eventHandle(when.matchReady)
          eventHandler[utils.packetid.client_matchSkipRequest] = eventHandle(when.matchSkip)
          eventHandler[utils.packetid.client_matchStart] = eventHandle(when.matchStart)
          eventHandler[utils.packetid.client_matchTransferHost] = eventHandle(when.matchTransferHost)
          eventHandler[utils.packetid.client_partLobby] = eventHandle(when.partLobby)
          eventHandler[utils.packetid.client_partMatch] = eventHandle(when.partMatch)
          eventHandler[utils.packetid.client_setAwayMessage] = eventHandle(when.setAwayMessage)
          eventHandler[utils.packetid.client_friendAdd] = eventHandle(when.friendAdd)
          eventHandler[utils.packetid.client_friendRemove] = eventHandle(when.friendAdd)

          let packetsRestricted = [
            utils.packetid.client_logout,
            utils.packetid.client_requestStatusUpdate,
            utils.packetid.client_userPanelRequest,
            utils.packetid.client_userStatsRequest,
            utils.packetid.client_channelPart,
            utils.packetid.client_channelJoin,
            utils.packetid.client_changeAction
          ]

          if (packetID !== 4) {
            if (packetID in eventHandler) {
              if (!userToken.restricted || (userToken.restricted && packetID in packetsRestricted)) {
                eventHandler[packetID]()
              } else {
                utils.consoleColor.warn(`${reqToken} is restricted so ignored`)
              }
            } else {
              utils.consoleColor.warn(`${reqToken} sended unknown packet id: ${packetID}`)
            }
          }

          pos += dataLength + 7
        }

        resToken = userToken.token
        resData = userToken.queue
        userToken.resetpackets()

        userToken.updatePingTime()

        if (userToken.kicked) {
          share.tokens.removetoken(userToken)
        }
      }
    }

    res.setHeader('cho-token', resToken)
    res.setHeader('cho-protocol', '19')
    res.setHeader('Keep-Alive', 'timeout=5, max=100')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('Content-Type', 'text/html; charset=UTF-8')

    res.write(resData)
    res.end()
  })

const share = require('./share')
const utils = require('./utils')
const when = require('./when/bancho')
