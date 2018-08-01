const share = require('../share')
const channel = require('./channel')
const fs = require('fs')

module.exports = class {
    constructor() {
        this.channels = {}
    }

    loadChannels() {
        let channelss = fs.readFileSync('../db/channels.json')
        channelss = JSON.parse(channelss)

        Object.keys(channelss).forEach(x => {
            if (!(x in this.channels)) {
                let Read = Boolean(channelss[x]['read'])
                let Write = Boolean(channelss[x]['write'])
            }
        })
    }
}