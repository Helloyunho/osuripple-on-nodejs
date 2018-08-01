const colors = require('colors')

module.exports.log = (x) => {
    console.log(x)
}

module.exports.ok = (x) => {
    console.log(x.green)
}

module.exports.error = (x) => {
    console.log(x.red)
}

module.exports.warn = (x) => {
    console.log(x.yellow)
}