const http = require('http')
const express = require('express')
let app = express()
const server = http.createServer(app)
const compression = require('compression')
const queryString = require('query-string')
const multer = require('multer')
const upload = multer({storage: multer.memoryStorage()})

const deasync = require('deasync')
app.use(compression())

const request = require('request')
app.set('port', 5002)

server.listen(app.get('port'), () => {
  console.log('Welcome to osu! server!')
})

app.route('/web/bancho_connect.php').get((req, res) => {
  let ip = req.get('X-Real-IP')
  utils.consoleColor.log(`${ip} is connecting with url: ${req.url}`)

  if (!req.query.u || !req.query.h) {
    return
  }

  let username = req.query.u
  let userID = utils.user.getIdFromUsername(username)
  if (!userID) {
    res.write('error: pass\n')
    res.end()
    return undefined
  }

  if (!utils.user.checkLoginIsOk(userID, req.query.h)) {
    res.write('error: pass\n')
    res.end()
    return undefined
  }

  let userPer = utils.user.getPermission(userID)
  if (userPer & permission.banned) {
    return
  }

  utils.user.updateLatestActivity(userID)

  let done = false
  let data = null
  let row = share.db.prepare('select country from user_status where id = ?').get([userID])
  data = row.country
  res.write(data)
  res.end()
})

app.route('/web/osu-checktweets.php').get((req, res) => {
  res.write('Not yet')
  res.end()
})

app.route('/web/lastfm.php').get((req, res) => {
  res.write('Not yet')
  res.end()
})

app.route('/web/check-updates.php').get((req, res) => {
  try {
    let args = {}

    Object.keys(req.query).forEach(i => {
      args[i] = req.query[i]
    })

    if (args.action.toLowerCase() === 'put') {
      res.write('nope')
      res.end()
      return null
    }

    let done = false
    let data = null
    request(`${share.config.osuapi.apiurl}/web/check-updates.php?${queryString.stringify(args)}`, (err, req, body) => {
      if (err) {
        console.error(err)
        done = true
      }
      data = body
      done = true
    })

    deasync.loopWhile(() => {
      return !done
    })
    res.write(data)
    res.end()
  } catch (e) {
    console.error(e)
    res.write('')
    res.end()
  }
})

app.route('/web/osu-osz2-getscores.php').get((req, res) => {
  let ip = req.get('X-Real-IP')
  utils.consoleColor.log(`${ip} is connecting with url: ${req.url}`)
  when.getScores(req, res)
})

app.route('/web/osu-submit-modular.php').post(upload.any(), (req, res) => {
  let ip = req.get('X-Real-IP')
  utils.consoleColor.log(`${ip} is connecting with url: ${req.url}`)
  let ok = when.submitModular(req, res)
  if (!ok) {
    res.sendStatus(408)
    res.end()
  }
})

app.route('*').all((req, res) => {
  let ip = req.get('X-Real-IP')
  utils.consoleColor.log(`${ip} is connecting with url: ${req.url}`)
})

const permission = require('./permission')
const share = require('./share')
const utils = require('./utils')
const when = require('./when/score')
