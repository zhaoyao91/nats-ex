const {connect} = require('../index')

describe('NatsEx', () => {
  let natsEx = null

  beforeEach(async () => {
    natsEx = await connect({
      queueGroup: 'X',
      // logNatsEvents: false,
      // logMessageEvents: false,
    })
  })

  afterEach(async () => {
    await natsEx.close()
    natsEx = null
  })

  test('basic message', (done) => {
    const someData = 'hello world'
    natsEx.on('ping', (data) => {
      expect(data).toEqual(someData)
      done()
    })
    natsEx.emit('ping', someData)
  })

  test('basic request and responds', async () => {
    natsEx.on('ping', () => 'pong')
    const result = await natsEx.call('ping')
    expect(result).toBe('pong')
  })

  test('emit will return messageId', (done) => {
    let messageId = null
    natsEx.on('test-message-id', (data, message) => {
      expect(typeof messageId).toBe('string')
      expect(message.id).toBe(messageId)
      done()
    })
    messageId = natsEx.emit('test-message-id')
  })
})