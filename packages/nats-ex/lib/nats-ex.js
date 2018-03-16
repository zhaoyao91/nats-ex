const NATS = require('nats')
const NatsExError = require('./nats-ex-error')
const {parseMessage, buildMessage} = require('./protocol')
const clean = require('clean-options')

module.exports = class NatsEx {
  /**
   * (Options) => NatsEx
   *
   * Options ~ {
   *   url: String = nats://localhost:4222,
   *   queueGroup: String = null,
   *   reconnectOnStart: Boolean = false
   *   reconnectOnDisconnect: Boolean = true
   *   logger: Object = console,
   *   logNatsEvents: Boolean = true,
   *   logMessageEvents: Boolean = true,
   *   logMessageErrors: Boolean = true
   *   natsErrorHandler?: (error) => Void
   * }
   */
  constructor (options) {
    this._options = {
      ...defaultOptions,
      ...clean(options)
    }

    // setup nats error handler
    if (!this._options.natsErrorHandler) {
      this._options.natsErrorHandler = (err) => {
        this._options.logger.error(err)
        process.exit(1)
      }
    }

    // setup message event logger
    this._messageEventLogger = this._options.logMessageEvents
      ? this._options.logger
      : dumbLogger

    // setup message error logger
    this._messageErrorLogger = this._options.logMessageErrors
      ? this._options.logger
      : dumbLogger

    this._handlingCounter = new Counter()
    this._subscriptions = []
  }

  connect () {
    return new Promise((resolve, reject) => {
      try {
        const {
          url,
          reconnectOnStart,
          reconnectOnDisconnect,
          logger,
          logNatsEvents,
          natsErrorHandler,
        } = this._options

        const nats = NATS.connect({
          ...parseUrlOption(url),
          ...parseReconnectOption(reconnectOnStart, reconnectOnDisconnect)
        })

        // resolve current promise on connect
        const onConnect = () => {
          nats.removeListener('connect', onConnect)
          resolve()
        }
        nats.on('connect', onConnect)

        if (logNatsEvents) registerLogNatsEventsListeners(nats, logger)

        nats.on('error', natsErrorHandler)

        this._nats = nats
      }
      catch (err) {
        reject(err)
      }
    })
  }

  // gracefully close
  close () {
    // stop all subscriptions
    this._subscriptions.forEach(sid => this._nats.unsubscribe(sid))

    // watch handling count
    // if count === 0, close nats connection
    return new Promise((resolve, reject) => {
      this._handlingCounter.watch(count => {
        if (count === 0) {
          // close in next tick to allow final response to be sent
          setTimeout(() => {
            this._nats.close()
            resolve()
          })
        }
      })
    })
  }

  /**
   * (topic, data, error?) => messageId
   */
  emit (topic, data, error) {
    const nats = this._nats
    const messageEventLogger = this._messageEventLogger
    const message = buildMessage({data, error})
    nats.publish(topic, message.string)
    messageEventLogger.info('message sent', {topic, message: message.object})
    return message.id
  }

  /**
   * (topic, data, Options?) => {requestId} & Promise => Any
   *
   * Options ~ {
   *   timeout: Number = 60000, // default to 1 min
   *   returnResponse: Boolean = false
   * }
   */
  call (topic, data, options) {
    const nats = this._nats
    const messageEventLogger = this._messageEventLogger
    const request = buildMessage({data})
    const {
      timeout = 60000,
      returnResponse = false,
    } = clean(options)
    const promise = new Promise((resolve, reject) => {
      nats.requestOne(topic, request.string, {}, timeout, (responseString) => {
        if (responseString instanceof NATS.NatsError) {
          reject(responseString)
        }
        else {
          let parsedResponse = null
          try {
            parsedResponse = parseMessage(responseString)
          }
          catch (err) {
            return reject(err)
          }
          const {raw: rawResponse, formatted: response} = parsedResponse
          messageEventLogger.info('message received', {type: 'response', requestTopic: topic, message: rawResponse})
          if (returnResponse) {
            resolve(response)
          }
          else {
            if (response.error) {
              const {code, message, details} = response.error
              const error = new NatsExError(code, message, details)
              reject(error)
            }
            else {
              resolve(response.data)
            }
          }
        }
      })
      messageEventLogger.info('message sent', {type: 'request', topic, message: request.object})
    })
    promise.requestId = request.id
    return promise
  }

  /**
   * (topic, Handler, Options?) => Void
   *
   * Handler ~ (data, message, receivedTopic) => Promise => Any
   *
   * Options ~ {
   *   validator: Validator?
   *   formGroup: Boolean = true,
   * }
   *
   * Validator ~ (data) => data // throw NatsExError if validation failed
   */
  on (topic, handler, options) {
    const nats = this._nats
    const messageEventLogger = this._messageEventLogger
    const messageErrorLogger = this._messageErrorLogger
    const subscriptions = this._subscriptions
    const handlingCounter = this._handlingCounter
    const {queueGroup} = this._options
    const {
      validator,
      formGroup = true,
    } = clean(options)
    const sid = nats.subscribe(topic, {queue: formGroup ? queueGroup : undefined}, async (messageString, replyTopic, receivedTopic) => {
      handlingCounter.inc()
      try {
        const parsedMessage = parseMessage(messageString)
        const {raw: rawMessage, formatted: message} = parsedMessage
        messageEventLogger.info('message received', {topic: receivedTopic, message: rawMessage})
        let {data} = message
        if (validator) data = validator(data)
        const result = await handler(data, message, receivedTopic)
        if (replyTopic) {
          this.emit(replyTopic, result)
        }
      }
      catch (err) {
        messageErrorLogger.error(err)
        if (replyTopic) {
          this.emit(replyTopic, undefined, err)
        }
      }
      handlingCounter.dec()
    })
    subscriptions.push(sid)
  }
}

function registerLogNatsEventsListeners (nats, logger) {
  nats.on('error', (err) => logger.error(err))
  nats.on('connect', () => logger.info('nats connected'))
  nats.on('disconnect', () => logger.warn('nats disconnected'))
  nats.on('reconnecting', () => logger.info('nats reconnecting...'))
  nats.on('reconnect', () => logger.info('nats reconnected'))
  nats.on('close', () => logger.info('nats connection closed'))
}

function parseUrlOption (url) {
  const urls = url.split(',')
  if (urls.length === 0) return {url: 'nats://localhost:4222'}
  else if (urls.length === 1) return {url: urls[0]}
  else return {servers: urls}
}

function parseReconnectOption (reconnectOnStart, reconnectOnDisconnect) {
  if (reconnectOnStart && reconnectOnDisconnect) return {
    reconnect: true,
    waitOnFirstConnect: true,
    maxReconnectAttempts: -1,
    reconnectTimeWait: 1000,
  }
  else if (!reconnectOnStart && !reconnectOnDisconnect) return {
    reconnect: false,
    waitOnFirstConnect: false,
    maxReconnectAttempts: 0
  }
  else if (!reconnectOnStart && reconnectOnDisconnect) return {
    reconnect: true,
    waitOnFirstConnect: false,
    maxReconnectAttempts: -1,
    reconnectTimeWait: 1000,
  }
  else throw new TypeError('Do not support reconnectOnStart=true but reconnectOnDisconnect=false')
}

const defaultOptions = {
  url: 'nats://localhost:4222',
  queueGroup: null,
  reconnectOnStart: false,
  reconnectOnDisconnect: true,
  logger: console,
  logNatsEvents: true,
  logMessageEvents: true,
  logMessageErrors: true,
}

class Counter {
  constructor () {
    this._count = 0
    this._listeners = []
  }

  inc () {
    ++this._count
    this._trigger()
  }

  dec () {
    --this._count
    this._trigger()
  }

  watch (listener) {
    this._listeners.push(listener)
    listener(this._count)
  }

  _trigger () {
    this._listeners.forEach(listener => listener(this._count))
  }
}

const emptyFunc = () => {}

const dumbLogger = {
  info: emptyFunc,
  error: emptyFunc,
}