const NatsExError = require('./nats-ex-error')
const EJSON = require('ejson')
const uuid = require('uuid')
const clean = require('clean-options')

const version = 2

const errorCodes = {
  'PROTOCOL_ERROR': 1,
  'VALIDATION_ERROR': 2,
  'INTERNAL_ERROR': 3,
}

// message string
// message object
// formatted message

/**
 * (messageString) => messageObject
 */
function parseMessageString (msgStr) {
  try {
    return EJSON.parse(msgStr)
  }
  catch (err) {
    throw new NatsExError(
      errorCodes.PROTOCOL_ERROR,
      'PROTOCOL_ERROR: Invalid message string',
      msgStr
    )
  }
}

/**
 * (messageObject) => void
 */
function checkMessageObject (msgObj) {
  if (
    typeof msgObj !== 'object'
    || msgObj === null
    || msgObj.v !== version
    || typeof msgObj.id !== 'string'
    || typeof msgObj.ts !== 'number'
  ) {
    throw new NatsExError(
      errorCodes.PROTOCOL_ERROR,
      'PROTOCOL_ERROR: Invalid message object',
      msgObj
    )
  }
}

/**
 * (messageObject) => formattedMessageObject
 */
function formatMessageObject (msgObj) {
  return clean({
    version: msgObj.v,
    messageId: msgObj.id,
    timestamp: msgObj.ts,
    data: msgObj.data,
    error: msgObj.err ? clean({
      code: msgObj.err.code,
      message: msgObj.err.msg,
      details: msgObj.err.det,
    }) : undefined
  })
}

/**
 * (messageString) => {raw, formatted}
 */
function parseMessage (msgStr) {
  const msgObj = parseMessageString(msgStr)
  checkMessageObject(msgObj)
  return {
    raw: msgObj,
    formatted: formatMessageObject(msgObj)
  }
}

/**
 * ({data?, error?}) => {id, string}
 */
function buildMessage ({data, error}) {
  const id = uuid.v4()
  const object = clean({
    v: version,
    ts: (new Date()).getTime(),
    id,
    data: data,
    err: !!error ? clean({
      code: error.code || errorCodes.INTERNAL_ERROR,
      msg: error.message,
      det: error.details
    }) : undefined
  })
  const string = EJSON.stringify(object)
  return {id, object, string}
}

module.exports = {
  version,
  errorCodes,

  parseMessage,
  buildMessage,
}