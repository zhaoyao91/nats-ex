const {connect, NatsExError, Protocol} = require('../index')
const sleep = require('sleep-promise')

describe('NatsEx', () => {
  let natsEx = null

  beforeEach(async () => {
    natsEx = await connect({
      queueGroup: 'X',
      logNatsEvents: false,
      logMessageEvents: false,
      logMessageErrors: false,
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

  test('call with error', async () => {
    expect.assertions(4)
    natsEx.on('error', () => {
      const error = new Error('Strange Error!')
      error.details = {age: 20}
      throw error
    })
    try {
      await natsEx.call('error')
    }
    catch (err) {
      expect(err).toBeInstanceOf(NatsExError)
      expect(err.message).toBe('Strange Error!')
      expect(err.details).toEqual({age: 20})
      expect(err.code).toBe(Protocol.errorCodes.INTERNAL_ERROR)
    }
  })

  test('call timeout', async () => {
    expect.assertions(1)
    natsEx.on('long-run', () => sleep(100))
    try {
      await natsEx.call('long-run', null, {timeout: 50})
    }
    catch (err) {
      expect(err).toBeInstanceOf(Error)
    }
  })

  test('call for response', async () => {
    natsEx.on('ping', () => 'pong')
    const response = await natsEx.call('ping', null, {returnResponse: true})
    expect(typeof response.version).toBe('number')
    expect(typeof response.id).toBe('string')
    expect(response.data).toBe('pong')
  })

  test('event handler receives all expected args', (done) => {
    natsEx.on('say.*', (data, message, receivedTopic) => {
      expect(data).toBe('Bob')
      expect(message.data).toBe('Bob')
      expect(receivedTopic).toBe('say.bob')
      done()
    })
    natsEx.emit('say.bob', 'Bob')
  })

  test('validator', async () => {
    expect.assertions(5)

    function bobValidator (data) {
      if (data !== 'Bob') throw new NatsExError(
        Protocol.errorCodes.VALIDATION_ERROR,
        'VALIDATION_ERROR: Invalid data',
        data
      )
      else return 'Alice'
    }

    natsEx.on('change-bob', (data) => data, {
      validator: bobValidator
    })
    const alice = await natsEx.call('change-bob', 'Bob')
    expect(alice).toBe('Alice')
    try {
      await natsEx.call('change-bob', 'Lucy')
    }
    catch (err) {
      expect(err).toBeInstanceOf(NatsExError)
      expect(err.code).toBe(Protocol.errorCodes.VALIDATION_ERROR)
      expect(err.message).toBe('VALIDATION_ERROR: Invalid data')
      expect(err.details).toBe('Lucy')
    }
  })

  test('form group', async () => {
    expect.assertions(1)
    natsEx.on('hi', () => expect(1).toBe(1))
    natsEx.on('hi', () => expect(1).toBe(1))
    natsEx.on('hi', () => expect(1).toBe(1))
    natsEx.emit('hi')
    await sleep(10)
  })

  test('not form group', async () => {
    expect.assertions(3)
    natsEx.on('hi', () => expect(1).toBe(1), {formGroup: false})
    natsEx.on('hi', () => expect(1).toBe(1), {formGroup: false})
    natsEx.on('hi', () => expect(1).toBe(1), {formGroup: false})
    natsEx.emit('hi')
    await sleep(10)
  })

  test('graceful close', async () => {
    const natsEx = await connect({
      logNatsEvents: false,
      logMessageEvents: false,
      logMessageErrors: false,
    })
    let flag = false
    natsEx.on('set-flag', async () => {
      await sleep(100)
      flag = true
    })
    natsEx.emit('set-flag')
    await sleep(10)
    await natsEx.close()
    expect(flag).toBe(true)
  })

  test('call return requestId', (done) => {
    let requestId = null
    natsEx.on('check-requestId', (data, request) => {
      expect(typeof requestId).toBe('string')
      expect(request.id).toBe(requestId)
      done()
    })
    const promise = natsEx.call('check-requestId')
    requestId = promise.requestId
  })
})