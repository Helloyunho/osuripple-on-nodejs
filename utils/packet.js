let types = require('../types')

const struct = require('python-struct')

const uleb128 = require('uleb128')

const encoding = require('encoding')

// By https://stackoverflow.com/a/8273091/9376340
function range (start, stop, step) {
  if (typeof stop === 'undefined') {
    // one param defined
    stop = start
    start = 0
  }

  if (typeof step === 'undefined') {
    step = 1
  }

  if ((step > 0 && start >= stop) || (step < 0 && start <= stop)) {
    return []
  }

  var result = []
  for (var i = start; step > 0 ? i < stop : i > stop; i += step) {
    result.push(i)
  }

  return result
}

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
        // IDK Why but error keep's going on this thing so I maked this to another var
        let encoded = uleb128.encode(x.length)
        result = Buffer.concat([result, Buffer.from('\x0B'), Buffer.from(encoded), encoding.convert(x, 'Latin_1')])
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

const readPacketID = stream => {
  return unpackData(stream.slice(0, 2), types.datatypes.uInt16)
}

const readPacketLength = stream => {
  return unpackData(stream.slice(3, 7), types.datatypes.uInt32)
}

const readPacketData = (stream, structure = null, hasFirstBytes = true) => {
  if (!structure) {
    structure = []
  }

  let data = {}

  let start, end
  if (hasFirstBytes) {
    end = 7
    start = 7
  } else {
    end = 0
    start = 0
  }

  structure.forEach(i => {
    start = end
    let unpack = true
    if (i[1] === types.datatypes.int_list) {
      unpack = false

      let length = unpackData(stream.slice(start, start + 2), types.datatypes.uInt16)

      data[i[0]] = []
      range(0, length).forEach(j => {
        data[i[0]].push(unpackData(stream.slice(start + 2 + (4 * j), start + 2 + (4 * (j + 1))), types.datatypes.sInt32))
      })

      end = start + 2 + (4 * length)
    } else if (i[1] === types.datatypes.string) {
      unpack = false

      if (stream[start] === 0) {
        data[i[0]] = ''
        end = start + 1
      } else {
        let length = uleb128.decode(stream.slice(start + 1))
        end = start + length.value + length.length + 1

        data[i[0]] = ''
        let adsfasdf = stream.slice(start + 1 + length.length, end)
        for (const j of adsfasdf) {
          data[i[0]] += String.fromCharCode(j)
        }
      }
    } else if (i[1] === types.datatypes.byte) {
      end = start + 1
    } else if (i[1] === types.datatypes.uInt16 || i[1] === types.datatypes.sInt16) {
      end = start + 2
    } else if (i[1] === types.datatypes.uInt32 || i[1] === types.datatypes.sInt32) {
      end = start + 4
    } else if (i[1] === types.datatypes.uInt64 || i[1] === types.datatypes.sInt64) {
      end = start + 8
    }

    if (unpack) {
      data[i[0]] = unpackData(stream.slice(start, end), i[1])
    }
  })

  return data
}

const binaryWrite = (structure = undefined) => {
  if (!structure) {
    structure = []
  }
  let packetData = Buffer.from([])
  structure.forEach(i => {
    packetData += packData(i[0], i[1])
  })
  return packetData
}

module.exports = {
  packData: packData,
  buildPacket: buildPacket,
  unpackData: unpackData,
  readPacketID: readPacketID,
  readPacketLength: readPacketLength,
  readPacketData: readPacketData,
  binaryWrite: binaryWrite}
