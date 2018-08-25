let types = require('../types')

const struct = require('python-struct')

const uleb128 = require('uleb128')

const encoding = require('encoding')

// here is the begin of code by ripple
const buildPacket = (x, y = []) => {
  let pacData = Buffer.from([])
  let pacLength = 0
  let pacBytes = Buffer.from([])

  y.forEach(i => {
    pacData = Buffer.concat([pacData, packData(i[0], i[1])])
  })

  pacLength = pacData.length

  pacBytes = Buffer.concat([pacBytes, struct.pack('<h', x), Buffer.from('\x00'), struct.pack('<l', pacLength), pacData])
  return pacBytes
}

const packData = (x, y) => {
  let packType
  let result = Buffer.from([])
  let pack = true

  switch (y) {
    case types.datatypes.bbytes:
      pack = false
      result = x
      break
    case types.datatypes.uInt16:
      packType = '<H'
      break
    case types.datatypes.sInt16:
      packType = '<h'
      break
    case types.datatypes.uInt32:
      packType = '<L'
      break
    case types.datatypes.sInt32:
      packType = '<l'
      break
    case types.datatypes.uInt64:
      packType = '<Q'
      break
    case types.datatypes.sInt64:
      packType = '<q'
      break
    case types.datatypes.string:
      pack = false
      if (x.length === 0) {
        result = Buffer.concat([result, Buffer.from('\x00')])
      } else {
        result = Buffer.concat([result, Buffer.from('\x0B'), uleb128.encode(x.length), encoding.convert(x, 'Latin_1')])
      }
      break
    case types.datatypes.ffloat:
      packType = '<f'
      break
    default:
      packType = '<B'
      break
  }

  if (pack) {
    result = Buffer.concat([result, struct.pack(packType, x)])
  }

  return result
}

const unpackData = (x, y) => {
  let unpackType

  switch (y) {
    case types.datatypes.uInt16:
      unpackType = '<H'
      break
    case types.datatypes.sInt16:
      unpackType = '<h'
      break
    case types.datatypes.uInt32:
      unpackType = '<L'
      break
    case types.datatypes.sInt32:
      unpackType = '<l'
      break
    case types.datatypes.uInt64:
      unpackType = '<Q'
      break
    case types.datatypes.sInt64:
      unpackType = '<q'
      break
    case types.datatypes.string:
      unpackType = '<s'
      break
    case types.datatypes.ffloat:
      unpackType = '<f'
      break
    default:
      unpackType = '<B'
      break
  }

  return struct.unpack(unpackType, Buffer.from(x))[0]
}

module.exports = {
  packData: packData,
  buildPacket: buildPacket,
  unpackData: unpackData}
