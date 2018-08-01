const slice = require('slice.js')

const http = require('http')

const server = http.createServer()

server.listen(5001, () => {
    console.log('Welcome to osu! server!')
})

server.on('request', (req, res) => {
    console.log(`url: ${req.url}, headers: ${JSON.stringify(req.headers)}, body: ${res}`)

    let body = ''

    req.on('data', (data) => {
        body += data
    })
    req.on('end', () => {
        body = body.split('\n')[2].split('|')
        console.log(`body: ${body}`)
    })
})
