const http = require('http')
const express = require('express')
let app = express()
const server = http.createServer(app)
const bodyParser = require('body-parser')
const compression = require('compression')
const sqlite3 = require('sqlite3').verbose()
const queryString = require('query-string')

const deasync = require('deasync')
let db = new sqlite3.Database('./db/osu.db', (err) => {
  if (err) {
    return console.error(err.message)
  }
})
app.use(compression())
const rawBodySaver = (req, res, buf, encoding) => {
  if (buf && buf.length) {
    req.rawBody = buf.toString(encoding || 'utf8')
  }
}

const request = require('request')

app.use(bodyParser.raw({limit: '50mb', verify: rawBodySaver, type: () => { return true }}))
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
  }

  if (!utils.user.checkLoginIsOk(userID, req.query.h)) {
    res.write('error: pass\n')
    res.end()
  }

  let userPer = utils.user.getPermission(userID)
  if (userPer & permission.banned) {
    return
  }

  utils.user.updateLatestActivity(userID)

  let done = false
  let data = null
  db.each('select country from user_status where id = ?', [userID], (err, row) => {
    if (err) {
      console.error(err)
      done = true
      return
    }
    console.log(row)
    data = row.country
    done = true
  })
  deasync.loopWhile(() => {
    return !done
  })
  console.log(data)
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
    request(`https://osu.ppy.sh/web/check-updates.php?${queryString.stringify(args)}`, (err, req, body) => {
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

app.route('*').get((req, res) => {
  let ip = req.ip
  utils.consoleColor.log(`${ip} is connecting with url: ${req.url}`)
})

process.on('exit', () => {
  db.close((err) => {
    if (err) {
      return console.error(err)
    }
  })
})

const permission = require('./permission')
const share = require('./share')
const utils = require('./utils')
