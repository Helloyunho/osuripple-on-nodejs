module.exports = (userToken, packetData, has) => {
  let userID = userToken.userid

  let matchID = userToken.matchID

  if (matchID === -1) {
    return undefined
  }

  if (!(matchID in share.matches.matches)) {
    return undefined
  }

  let match = share.matches.matches[matchID]
  match.userHasBeatmap(userID, has)
}

const share = require('../../share')
