const userutil = require('./user')
const share = require('../share')
const packets = require('./packets')

module.exports.joinChannel = (id=0, channel='', token=null, toirc=true) => {
    if (!token) {
        token = share.tokens.getTokenFromUserid(id)
        if (!token) {
            return 403
        }
    } else {
        token = token
    }

    if (!(channel in share.channels.channels)) {
        return 403
    }

    token.joinChannel(share.channels.channels[channel])

    if (toirc) {
        
    }
}

// for IRC

module.exports.UsernameForBancho = (user) => {
    if (!user.includes(' ') && !user.includes('_')) {
        return user
    }
    result = userutil.getIdFromUsername(user)

    if (result) {
        return user
    }

    return user.replace(/_/g, ' ')

}

module.exports.UsernameForIRC = (user) => {
    return user.replace(/ /g, '_')
}
