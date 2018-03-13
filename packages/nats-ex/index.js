const Protocol = require('./lib/protocol')
const NatsEx = require('./lib/nats-ex')
const NatsExError = require('./lib/nats-ex-error')
const connect = require('./lib/connect')

module.exports = {
  connect,
  Protocol,
  NatsEx,
  NatsExError,
}