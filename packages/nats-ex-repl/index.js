#!/usr/bin/env node

const {connect, NatsEx, NatsExError, Protocol} = require('nats-ex')
const repl = require('repl')
const loadReplHistory = require('repl.history')
const path = require('path')
const args = require('node-args')
const defaults = require('lodash.defaults')

// init args
const actualArgs = defaults(args, {
  start: true,
  url: 'nats://localhost:4222',
  logger: 'console',
  logMessageEvents: false,
  logMessageErrors: true,
})

// setup logger
let logger = console
if (actualArgs.logger === 'json') logger = require('simple-json-logger')

function errorHandler (err) {
  logger.error(err)
  process.exit(1)
}

function startRepl (extraContext) {
  const server = repl.start({
    prompt: '> '
  })
  Object.assign(server.context, defaultContext, extraContext)
  loadReplHistory(server, path.resolve(process.env.HOME, '.node_history'))
}

const defaultContext = {
  connect,
  NatsEx,
  NatsExError,
  Protocol,
  Date: Date // what the fucking bug! default Date in repl context is not equal to the Date in files!
}

if (actualArgs.start) {
  const {
    url,
    queueGroup,
    logMessageEvents,
    logMessageErrors,
  } = actualArgs
  const options = {
    url,
    queueGroup,
    logger,
    logMessageErrors,
    logMessageEvents,
    reconnectOnStart: true,
    reconnectOnDisconnect: true,
  }
  connect(options).then(natsEx => startRepl({
    emit: natsEx.emit.bind(natsEx),
    call: buildReplCall(natsEx),
    on: natsEx.on.bind(natsEx),
  })).catch(errorHandler)
}
else {
  startRepl()
}

/**
 * async func is not convenient in repl
 * let it receive optional callback
 */
function buildReplCall (natsEx) {
  return function (topic, data, options) {
    let callback = null
    const callbackReceiver = (cb) => {
      callback = cb
      return callbackReceiver.requestId
    }
    const promise = natsEx.call(topic, data, options)
    callbackReceiver.requestId = promise.requestId
    promise.then(x => callback && callback(null, x)).catch(err => {
      if (callback) callback(err)
      else logger.error(err)
    })
    return callbackReceiver
  }
}