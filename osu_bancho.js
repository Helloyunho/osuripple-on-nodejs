const slice = require('slice.js')
const http = require('http')
const crypto = require('crypto')
const md5_gen = (x) => {
    return crypto.createHash('md5').update(x).digest('hex');
}
const when = require('./when')
const express = require('express')
let app = express()
const server = http.createServer(app)
const body_parser = require('body-parser')
const compression = require('compression')
app.use(compression())
const rawBodySaver = (req, res, buf, encoding) => {
    if (buf && buf.length) {
        req.rawBody = buf.toString(encoding || 'utf8');
    }
}
  

app.use(body_parser.raw({verify: rawBodySaver, type: () => { return true }}))
app.set('port', 5001)

server.listen(app.get('port'), () => {
    console.log('Welcome to osu! server!')
})

app.route('/')
.get((req, res) => {
    res.end('Hello, and here is custom bancho server. So... get the fu** off!')
})
.post((req, res) => {
    let reqToken = req.get('osu-token')
    
    let resToken = 'ayy'
    let resData = Buffer.from([])

    if (!reqToken) {
        resToken, resData = when.login(req)
    }

    res.setHeader('cho-token', resToken)
    res.setHeader('cho-protocol', '19')
    res.setHeader('Keep-Alive', 'timeout=5, max=100')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('Content-Type', 'text/html; charset=UTF-8')

    res.write(resData)
    res.end()
})