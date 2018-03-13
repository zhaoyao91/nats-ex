const NatsEx = require('./nats-ex')

module.exports = function connect(options) {
  const natsEx = new NatsEx(options)
  return natsEx.connect()
}