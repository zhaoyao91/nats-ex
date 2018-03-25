const NatsEx = require('./nats-ex')

module.exports = async function (options) {
  const natsEx = new NatsEx(options)
  await natsEx.connect()
  return natsEx
}