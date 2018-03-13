const NatsEx = require('./nats-ex')

module.exports = async function connect(options) {
  const natsEx = new NatsEx(options)
  await natsEx.connect()
  return natsEx
}