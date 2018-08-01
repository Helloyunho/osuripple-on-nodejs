const utils = require('.././utils')
const slice = require('slice.js')

module.exports = (req) => {
    let resTokenString = "ayy"
    let resData = Buffer.from([])

    let reqIP = req.ip

    // Login Part
    let loginInfo = req.body.toString('utf8').split('\n')

    utils.console_color.log(`'${loginInfo[0]}' is trying to login with IP: ${reqIP}`)

    let username = loginInfo[0]
    // Get Something IMPORTANT Info
    let closerInfo = loginInfo[2].split('|')
    let clientVersion = closerInfo[0]
    let clientTimeOffset = Number(closerInfo[1])
    let clientData = slice.default(closerInfo[3].split(':'))[':5']

    let userID = utils.user.getIdFromUsername(username)
    if (!userID) {
        utils.console_color.error('Error: wrong password or username')
        resData = Buffer.concat([resData, utils.packets.loginFailed()])
        return resTokenString, resData
    }
    let userPasswordCorrect = utils.user.checkLoginIsOk(userID, loginInfo[1])
    if (!userPasswordCorrect) {
        utils.console_color.error('Error: wrong password or username')
        resData = Buffer.concat([resData, utils.packets.loginFailed()])
        return resTokenString, resData
    }

    utils.console_color.log('Test OK')
    return resTokenString, resData

}
