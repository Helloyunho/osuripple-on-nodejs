module.exports += class loginError extends Error {
    constructor(...args) {
        super(...args)
        Error.captureStackTrace(this, loginError)
    }
}
