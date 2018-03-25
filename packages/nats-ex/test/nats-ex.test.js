const {connect, NatsExError, Protocol} = require('../index')
const sleep = require('sleep-promise')

describe('NatsEx', () => {
  let natsEx = null

  beforeEach(async () => {
    natsEx = await connect({
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

  test('form queue group', async () => {
    const count = {
      x: 0,
      y: 0,
      void: 0,
    }
    natsEx.on('hi', () => count.x++, {queue: 'x'})
    natsEx.on('hi', () => count.x++, {queue: 'x'})
    natsEx.on('hi', () => count.y++, {queue: 'y'})
    natsEx.on('hi', () => count.y++, {queue: 'y'})
    natsEx.on('hi', () => count.void++)
    natsEx.on('hi', () => count.void++)
    natsEx.emit('hi')
    await sleep(10)
    expect(count.x).toBe(1)
    expect(count.y).toBe(1)
    expect(count.void).toBe(2)
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

  test('emit with from id', (done) => {
    const fakeFromMessage = '123'
    natsEx.on('ping', (data, message) => {
      expect(message.fromId).toBe(fakeFromMessage)
      done()
    })
    natsEx.emit('ping', undefined, {fromId: fakeFromMessage})
  })

  test('call with from id', async () => {
    const fakeFromMessage = '123'
    natsEx.on('echo', (data, message) => {
      return message.fromId
    })
    const result = await natsEx.call('echo', undefined, {fromId: fakeFromMessage})
    expect(result).toBe(fakeFromMessage)
  })

  test('call response with from id', async () => {
    natsEx.on('ping', () => {
      return 'pong'
    })
    const promise = natsEx.call('ping', undefined, {returnResponse: true})
    const {requestId} = promise
    const response = await promise
    expect(response.data).toBe('pong')
    expect(response.fromId).toBe(requestId)
  })

  test('using message.emit will attach the from id automatically', (done) => {
    let firstMessageId = null
    natsEx.on('e1', (data, message) => {
      message.emit('e2')
    })
    natsEx.on('e2', (data, message) => {
      expect(message.fromId).toBeTruthy()
      expect(message.fromId).toBe(firstMessageId)
      done()
    })
    firstMessageId = natsEx.emit('e1')
  })

  test('using message.call will attach the from id automatically', (done) => {
    let firstMessageId = null
    natsEx.on('e1', (data, message) => {
      message.call('e2')
    })
    natsEx.on('e2', (data, message) => {
      expect(message.fromId).toBeTruthy()
      expect(message.fromId).toBe(firstMessageId)
      done()
    })
    firstMessageId = natsEx.call('e1').requestId
  })
})