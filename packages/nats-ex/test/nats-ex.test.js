const sleep = require('sleep-promise')
const uuid = require('uuid')

function emptyFunc () {}

describe('nats-ex', function () {
  const {NatsEx, NatsExError, Protocol} = require('../index')

  let natsEx = null
  let natsEx2 = null
  let natsEx3 = null

  beforeAll(async () => {
    natsEx = new NatsEx({
      logMethodError: false,
      logEvents: false,
      methodErrorHandler: emptyFunc,
      eventErrorHandler: emptyFunc,
    })
    natsEx2 = new NatsEx({
      logMethodError: false,
      logEvents: false,
      queueGroup: 'X',
      methodErrorHandler: emptyFunc,
      eventErrorHandler: emptyFunc,
    })
    natsEx3 = new NatsEx({
      logMethodError: false,
      logEvents: false,
      queueGroup: 'X',
      methodErrorHandler: emptyFunc,
      eventErrorHandler: emptyFunc,
    })

    await Promise.all([
      natsEx.connect(),
      natsEx2.connect(),
      natsEx3.connect(),
    ])
  })

  afterAll(() => {
    natsEx.close()
    natsEx2.close()
    natsEx3.close()
  })

  describe('method', function () {
    it('should call ping pong', async () => {
      const name = uuid.v4()
      natsEx.registerMethod(name, null, () => 'pong')
      const result = await natsEx.callMethod(name)
      expect(result).toBe('pong')
    })

    it('should receive method input data', async () => {
      expect.assertions(2)
      const name = uuid.v4()
      const echoData = 'Hello World'
      natsEx.registerMethod(name, null, (data) => {
        expect(data).toBe(echoData)
        return data
      })
      const result = await natsEx.callMethod(name, echoData)
      expect(result).toBe(echoData)
    })

    describe('validator', function () {
      const bobValidator = (data) => {
        if (data !== 'Bob') {
          throw new NatsExError(
            Protocol.errorCodes.VALIDATION_ERROR,
            'VALIDATION_ERROR: You are not Bob',
            {data}
          )
        }
      }

      it('should allow Bob data', async () => {
        const name = uuid.v4()
        natsEx.registerMethod(name, bobValidator, () => 'welcome Bob')
        const result = await natsEx.callMethod(name, 'Bob')
        expect(result).toBe('welcome Bob')
      })

      it('should not allow Alice data', async () => {
        expect.assertions(4)
        const name = uuid.v4()
        natsEx.registerMethod(name, bobValidator, () => 'welcome Bob')
        try {
          await natsEx.callMethod(name, 'Alice')
        }
        catch (err) {
          expect(err instanceof NatsExError).toBe(true)
          expect(err.code).toBe(Protocol.errorCodes.VALIDATION_ERROR)
          expect(err.message).toBe('VALIDATION_ERROR: You are not Bob')
          expect(err.details).toEqual({data: 'Alice'})
        }
      })
    })

    it('should transfer error to client', async () => {
      const name = uuid.v4()
      expect.assertions(4)
      natsEx.registerMethod(name, null, () => {
        throw new Error('my error')
      })
      try {
        await natsEx.callMethod(name)
      }
      catch (err) {
        expect(err instanceof NatsExError).toBe(true)
        expect(err.message).toBe('my error')
        expect(err.code).toBe(Protocol.errorCodes.INTERNAL_ERROR)
        expect(err.details).toBeUndefined()
      }
    })

    it('should timeout', async () => {
      expect.assertions(2)
      const name = uuid.v4()
      natsEx.registerMethod(name, null, () => {
        return new Promise((resolve, reject) => {
          setTimeout(resolve, 100)
        })
      })
      try {
        await natsEx.callMethod(name, null, {timeout: 10})
      }
      catch (err) {
        expect(err instanceof NatsExError).toBe(true)
        expect(err.code).toBe(Protocol.errorCodes.TIMEOUT)
      }
    })

    it('should find requestId in the returned promise of callMethod', async () => {
      expect.assertions(1)
      const name = uuid.v4()
      natsEx.registerMethod(name, null, (data, msg) => {
        expect(msg.requestId).toBe(promise.requestId)
      })
      const promise = natsEx.callMethod(name)
      await promise
    })

    it('should return the whole response', async () => {
      const name = uuid.v4()
      natsEx.registerMethod(name, null, () => 'pong')
      const result = await natsEx.callMethod(name, null, {returnData: false})
      expect(result.version).toBe(Protocol.version)
      expect(typeof result.requestId).toBe('string')
    })

    test('there should be only one handler in a group to handle the method', async () => {
      expect.assertions(1)
      const name = uuid.v4()
      natsEx2.registerMethod(name, null, () => {
        expect(true).toBe(true)
      })
      natsEx3.registerMethod(name, null, () => {
        expect(true).toBe(true)
      })
      await sleep(10)
      await natsEx.callMethod(name)
    })

    it('should call and forget', (done) => {
      expect.assertions(2)
      const pingData = 'Hello'
      const name = uuid.v4()
      natsEx.registerMethod(name, null, (data, msg) => {
        expect(data).toBe(pingData)
        expect(msg.requestId).toBe(requestId)
        done()
      })
      const requestId = natsEx.callMethodAndForget(name, pingData)
    })
  })

  describe('event', function () {
    it('should emit a simple event', (done) => {
      const eventData = 'Bob'
      const name = uuid.v4()
      natsEx.listenEvent(name, null, (data) => {
        expect(data).toBe(eventData)
        done()
      })
      natsEx.emitEvent(name, eventData)
    })

    it('should return eventId after emitting event', (done) => {
      const name = uuid.v4()
      natsEx.listenEvent(name, null, (data, msg) => {
        expect(msg.eventId).toBe(eventId)
        expect(typeof msg.eventId).toBe('string')
        done()
      })
      const eventId = natsEx.emitEvent(name)
    })

    test('only one listener should receive the event', async () => {
      expect.assertions(1)
      const name = uuid.v4()
      natsEx2.listenEvent(name, null, () => {
        expect(true).toBe(true)
      })
      natsEx3.listenEvent(name, null, () => {
        expect(true).toBe(true)
      })
      await sleep(10)
      natsEx.emitEvent(name)
      await sleep(10)
    })

    test('all listeners will receive broadcast event', async () => {
      expect.assertions(2)
      const name = uuid.v4()
      const eventData = 'Yes'
      natsEx2.listenBroadcastEvent(name, null, (data) => {
        expect(data).toBe(eventData)
      })
      natsEx3.listenBroadcastEvent(name, null, (data) => {
        expect(data).toBe(eventData)
      })
      await sleep(10)
      natsEx.emitEvent(name, eventData)
      await sleep(10)
    })
  })
})