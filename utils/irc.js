

class Client{}

module.exports = class {
    constructor() {
        this.host = '0.0.0.0'
        this.port = 6667
        this.clients = {}
        this.motd = ['Hello.... um... Here is custom bancho server \\w node.js! Made by Helloyunho and ripple(source code)']
    }

    forceDiscon(username, bancho=true) {
        for (let x of this.clients.values()){
            if (x.ircUsername == username && !bancho) {
                x.disconnect(false)
                break
            }
        }
    }
}