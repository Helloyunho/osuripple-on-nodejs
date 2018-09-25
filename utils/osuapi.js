const request = require('request')
const deasync = require('deasync')

module.exports.osuApiRequest = (req, params, getFirst = true) => {
  if (!share.config.osuapi.enable) {
    consoleColor.warn('osu! api is disabled')
    return undefined
  }
  let resp
  let done = false
  let finalURL = `${share.config.osuapi.apiurl}/api/${req}?k=${share.config.osuapi.apikey}&${params}`
  request(finalURL, (err, res, body) => {
    if (err) {
      console.error(err)
      done = true
      return undefined
    }

    let data = JSON.parse(body)
    if (getFirst) {
      if (data.length >= 1) {
        resp = data[0]
      } else {
        resp = undefined
      }
    } else {
      resp = data
    }
    done = true
  })

  deasync.loopWhile(() => {
    return !done
  })

  consoleColor.debug(`Here's the response of ${finalURL} : ${resp}`)
  return resp
}

module.exports.getOsuFileFromName = (fileName) => {
  if (!share.config.osuapi.enable) {
    consoleColor.warn('osu! api is disabled')
    return undefined
  }

  let response
  let done = false
  let URL = `${share.config.osuapi.apiurl}/web/maps/${encodeURI(fileName)}`
  request(URL, (err, res, body) => {
    if (err) {
      console.error(err)
      done = true
      return undefined
    }
    response = body
    done = true
  })

  deasync.loopWhile(() => {
    return !done
  })
  return response
}

module.exports.getOsuFileFromID = (beatmapID) => {
  if (!share.config.osuapi.enable) {
    consoleColor.warn('osu! api is disabled')
    return undefined
  }

  let response
  let done = false
  let URL = `${share.config.osuapi.apiurl}/osu/${beatmapID}`
  request(URL, (err, res, body) => {
    if (err) {
      console.error(err)
      done = true
      return undefined
    }
    response = body
    done = true
  })

  deasync.loopWhile(() => {
    return !done
  })
  return response
}

const share = require('../share')
const consoleColor = require('./consoleColor')
