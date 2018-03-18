#!/usr/bin/env node

const {connect, NatsEx, NatsExError, Protocol} = require('nats-ex')
const repl = require('repl')
const loadReplHistory = require('repl.history')
const path = require('path')
const args = require('node-args')
const defaults = require('lodash.defaults')
const util = require('util')
const colors = require('colors')

// init args
const actualArgs = defaults(args, {
  start: true,
  url: 'nats://localhost:4222',
  logMessageEvents: false,
  logMessageErrors: true,
})

// setup logger
let logger = console

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
    call: natsEx.call.bind(natsEx),
    justCall: buildJustCall(natsEx),
    on: natsEx.on.bind(natsEx),
  })).catch(errorHandler)
}
else {
  startRepl()
}

function buildJustCall (natsEx) {
  return function (topic, data, options) {
    const promise = natsEx.call(topic, data, options)
    const requestId = promise.requestId
    promise.then(data => {
      logger.info(requestId.cyan)
      logger.info(util.inspect(data, {depth: null}).cyan)
    }).catch(err => {
      logger.error(requestId.red)
      logger.error(util.inspect(err, {depth: null}).red)
    })
    return requestId
  }
}