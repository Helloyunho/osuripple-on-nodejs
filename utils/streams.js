const stream = require('./stream')
const share = require('../share')

module.exports = class {
    constructor() {
        this.streams = {}
    }

    add(x) {
        if (name in !this.streams) {
            this.streams[x] = stream(x)
        }
    }

    remove(x) {
        if (x in this.streams) {
            this.streams[x].clients.forEach(y => {
                if (share.tokens.tokens.includes(y)) {
                    share.tokens.tokens[y].leaveStream(x)
                }
            })
            let a = this.streams[x]
            delete a
        }
    }

    join(name, client=null, token=null) {
        if (!(name in this.streams)) {
            return 
        }
        this.streams[name].addClient(client, token)
    }

    leave(name, client=null, token=null) {
        if (!(name in this.streams)) {
            return 
        }
        this.streams[name].removeClient(client, token)
    }

    broadcast(name, data, nope=null) {
        if (!(name in this.streams)) {
            return
        }
        this.streams[name].broadcast(data, nope)
    }

    dispose(name, ...args) {
        if (!(name in this.streams)) {
            return
        }
        this.streams[name].dispose(args)
    }

    getStreamByName(name) {
        if (name in this.streams) {
            return this.streams[name]
        }
        return null
    }
}