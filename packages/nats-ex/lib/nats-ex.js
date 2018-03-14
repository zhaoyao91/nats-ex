const NATS = require('nats')
const uuid = require('uuid')
const NatsExError = require('./nats-ex-error')
const Protocol = require('./protocol')
const clean = require('clean-options')

module.exports = class NatsEx {
  /**
   * (Options) => NatsEx
   *
   * Options ~ {
   *   url: String = nats://localhost:4222,
   *   reconnect: Boolean = false,
   *   queueGroup: String = null,
   *   logger: Object = console,
   *   logEvents: Boolean = true,
   *   methodErrorHandler?: (error) => Void
   *   eventErrorHandler?: (error) => Void
   *   natsErrorHandler?: (error) => Void
   * }
   */
  constructor (options) {
    this._options = {
      ...defaultOptions,
      ...clean(options)
    }

    // setup default error handlers

    if (!this._options.methodErrorHandler) {
      this._options.methodErrorHandler = (err) => this._options.logger.error(err)
    }
    if (!this._options.eventErrorHandler) {
      this._options.eventErrorHandler = (err) => this._options.logger.error(err)
    }
    if (!this._options.natsErrorHandler) {
      this._options.natsErrorHandler = (err) => {
        this._options.logger.error(err)
        process.exit(1)
      }
    }
  }

  connect () {
    return new Promise((resolve, reject) => {
      const {
        url,
        reconnect,
        logger,
        logEvents,
        natsErrorHandler,
      } = this._options

      const nats = NATS.connect({
        ...parseUrlOption(url),
        ...parseReconnectOption(reconnect)
      })

      // resolve current promise on connect
      const onConnect = () => {
        resolve()
        nats.removeListener('connect', onConnect)
      }
      nats.on('connect', onConnect)

      if (logEvents) registerLogEventListeners(nats, logger)

      nats.on('error', natsErrorHandler)

      this._nats = nats
    })
  }

  close () {
    return this._nats.close()
  }

  /**
   * (name, Handler)
   * (name, Validator, Handler)
   * => Void
   *
   * Validator ~ (data) => data // throw NatsExError if validation failed
   *
   * Handler ~ (data, msg) => Promise => Any
   */
  registerMethod (name, validator, handler) {
    if (!name) throw new TypeError('`name` cannot be empty')
    if (!handler) [validator, handler] = [handler, validator]

    const {queueGroup, methodErrorHandler} = this._options
    const nats = this._nats

    const topic = `method.${name}`

    nats.subscribe(topic, {queue: queueGroup}, async (reqStr, replyTo) => {
      let requestId = ''
      try {
        const req = Protocol.parse(reqStr)
        requestId = req.requestId
        let {data} = req
        if (validator) data = validator(data)
        const result = await handler(data, req)
        if (replyTo) {
          const resStr = Protocol.buildResponseMessageString(requestId, result)
          nats.publish(replyTo, resStr)
        }
      }
      catch (err) {
        methodErrorHandler(err)
        if (replyTo) {
          const resStr = Protocol.buildResponseMessageString(requestId, undefined, {
            code: err.code || Protocol.errorCodes.INTERNAL_ERROR,
            message: err.message,
            details: err.details
          })
          nats.publish(replyTo, resStr)
        }
      }
    })
  }

  /**
   * (name, data, Options?) => Promise & {requestId} => Any
   *
   * Options ~ {
   *   timeout: Number = 60000, // default to 1 min
   *   returnData: Boolean = true
   * }
   */
  callMethod (name, data, options) {
    const requestId = genId()
    const promise = new Promise((resolve, reject) => {
      const {
        timeout = 60000,
        returnData = true,
      } = clean(options)
      const nats = this._nats
      const reqStr = Protocol.buildRequestMessageString(requestId, data)
      const topic = `method.${name}`
      nats.requestOne(topic, reqStr, {}, timeout, (msgStr) => {
        if (msgStr instanceof NATS.NatsError) {
          const natsError = msgStr
          if (natsError.code === NATS.REQ_TIMEOUT) {
            const error = new NatsExError(Protocol.errorCodes.TIMEOUT, `TIMEOUT: Method request timed out`, {
              name: name,
              data: data,
              options: options,
            })
            reject(error)
          }
          else {
            reject(natsError)
          }
        }
        else {
          let response = null
          try {
            response = Protocol.parse(msgStr)
          }
          catch (err) {
            return reject(err)
          }
          if (returnData) {
            if (response.error) {
              const {code, message, details} = response.error
              const error = new NatsExError(code, message, details)
              reject(error)
            }
            else {
              resolve(response.data)
            }
          }
          else {
            resolve(response)
          }
        }
      })
    })
    promise.requestId = requestId
    return promise
  }

  /**
   * (name, data?) => requestId
   */
  callMethodAndForget (name, data) {
    const nats = this._nats
    const requestId = genId()
    const reqStr = Protocol.buildRequestMessageString(requestId, data)
    const topic = `method.${name}`
    nats.publish(topic, reqStr)
    return requestId
  }

  /**
   * (name, data?) => eventId
   */
  emitEvent (name, data) {
    const nats = this._nats
    const eventId = genId()
    const event = Protocol.buildEventMessageString(eventId, data)
    const topic = `event.${name}`
    nats.publish(topic, event)
    return eventId
  }

  /**
   * (name, Handler)
   * (name, Validator, Handler)
   * => Void
   *
   * Validator ~ (data) => data // throw NatsExError if validation failed
   *
   * Handler ~ (data, msg) => Promise => Void
   */
  listenEvent (name, validator, handler) {
    if (!name) throw new TypeError('`name` cannot be empty')
    if (!handler) [validator, handler] = [handler, validator]

    const {eventErrorHandler, queueGroup} = this._options
    const nats = this._nats

    const topic = `event.${name}`

    nats.subscribe(topic, {queue: queueGroup}, async (msgStr) => {
      try {
        const msg = Protocol.parse(msgStr)
        let {data} = msg
        if (validator) data = validator(data)
        await handler(data, msg)
      }
      catch (err) {
        eventErrorHandler(err)
      }
    })
  }

  /**
   * (name, Handler)
   * (name, Validator, Handler)
   * => Void
   *
   * Validator ~ (data) => data // throw NatsExError if validation failed
   *
   * Handler ~ (data, msg) => Promise => Void
   */
  listenBroadcastEvent (name, validator, handler) {
    if (!name) throw new TypeError('`name` cannot be empty')
    if (!handler) [validator, handler] = [handler, validator]

    const {eventErrorHandler} = this._options
    const nats = this._nats

    const topic = `event.${name}`

    nats.subscribe(topic, async (msgStr) => {
      try {
        const msg = Protocol.parse(msgStr)
        let {data} = msg
        if (validator) data = validator(data)
        await handler(data, msg)
      }
      catch (err) {
        eventErrorHandler(err)
      }
    })
  }
}

function registerLogEventListeners (nats, logger) {
  nats.on('error', (err) => logger.error(err))
  nats.on('connect', () => logger.info('nats connected'))
  nats.on('disconnect', () => logger.warn('nats disconnected'))
  nats.on('reconnecting', () => logger.info('nats reconnecting...'))
  nats.on('reconnect', () => logger.info('nats reconnected'))
  nats.on('close', () => logger.info('nats closed'))
}

function parseUrlOption (url) {
  const urls = url.split(',')
  if (urls.length === 0) return {url: 'nats://localhost:4222'}
  else if (urls.length === 1) return {url: urls[0]}
  else return {servers: urls}
}

function parseReconnectOption (reconnect) {
  if (reconnect) return {
    reconnect: true,
    waitOnFirstConnect: true,
    maxReconnectAttempts: -1,
    reconnectTimeWait: 1000,
  }
  else return {
    reconnect: false,
    waitOnFirstConnect: false,
    maxReconnectAttempts: 0,
    reconnectTimeWait: 0,
  }
}

const defaultOptions = {
  logger: console,
  url: 'nats://localhost:4222',
  reconnect: false,
  logEvents: true,
  queueGroup: null,
}

const genId = uuid.v4