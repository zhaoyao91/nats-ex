class NatsExError extends Error {
  constructor (code, msg, det) {
    super(msg)
    this.code = code
    this.details = det
  }
}

NatsExError.prototype.name = 'NatsExError'

module.exports = NatsExError