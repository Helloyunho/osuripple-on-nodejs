module.exports = (userToken, packetData) => {
  let userID = userToken.userid

  let matchID = userToken.matchID

  if (matchID === -1) {
    return undefined
  }

  if (!(matchID in share.matches.matches)) {
    return undefined
  }

  let match = share.matches.matches[matchID]
  match.playerFailed(userID)
}

const share = require('../../share')
