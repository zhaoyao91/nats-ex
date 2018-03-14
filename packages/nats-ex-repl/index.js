#!/usr/bin/env node

const {connect, NatsEx, NatsExError, Protocol} = require('nats-ex')
const repl = require('repl')
const colors = require('colors')
const util = require('util')
const loadReplHistory = require('repl.history')
const path = require('path')
const args = require('node-args')
const pick = require('lodash.pick')
const defaults = require('lodash.defaults')

function errorHandler (err) {
  console.error(err)
  process.exit(1)
}

function startRepl (extraContext) {
  const server = repl.start({
    prompt: '> '
  })
  Object.assign(server.context, defaultContext, extraContext)
  loadReplHistory(server, path.resolve(process.env.HOME, '.node_history'))
}

function print (methodPromise) {
  const {requestId} = methodPromise
  methodPromise.then(result => {
    console.log(`response: ${requestId}`.cyan)
    console.log(util.inspect(result).cyan)
  }).catch(err => {
    console.error(`error: ${requestId}`.red)
    console.error(util.inspect(err).red)
  })
  return requestId
}

const defaultContext = {
  connect,
  NatsEx,
  NatsExError,
  Protocol,
  print,
  Date: Date // what the fucking bug! default Date in repl context is not equal to the Date in files!
}

const actualArgs = defaults(args, {
  start: true,
  url: 'nats://localhost:4222',
  reconnect: true,
  logEvents: true,
})

if (actualArgs.start) {
  const options = pick(actualArgs, 'url', 'reconnect', 'queueGroup', 'logEvents')
  connect(options).then(natsEx => startRepl({natsEx})).catch(errorHandler)
}
else {
  startRepl()
}
