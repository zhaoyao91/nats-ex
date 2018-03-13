const NatsExError = require('./nats-ex-error')
const EJSON = require('ejson')

const version = 1

const errorCodes = {
  'TIMEOUT': 1,
  'PROTOCOL_ERROR': 2,
  'VALIDATION_ERROR': 3,
  'INTERNAL_ERROR': 4,
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
    || (typeof msgObj.rid !== 'string' && typeof msgObj.eid !== 'string')
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
  return {
    version: msgObj.v,
    requestId: msgObj.rid,
    eventId: msgObj.eid,
    timestamp: msgObj.ts,
    data: msgObj.data,
    error: msgObj.err ? {
      code: msgObj.err.code,
      message: msgObj.err.msg,
      details: msgObj.err.det,
    } : undefined
  }
}

/**
 * (messageString) => formattedMessageObject
 */
function parse (msgStr) {
  const msgObj = parseMessageString(msgStr)
  checkMessageObject(msgObj)
  return formatMessageObject(msgObj)
}

function buildRequestMessageString (requestId, data) {
  const msg = {
    v: version,
    ts: (new Date()).getTime(),
    rid: requestId,
    data: data
  }
  return EJSON.stringify(msg)
}

function buildResponseMessageString (requestId, data, error) {
  const msg = {
    v: version,
    ts: (new Date()).getTime(),
    rid: requestId,
    data: data,
    err: error ? {
      code: error.code,
      msg: error.message,
      det: error.details
    } : undefined
  }
  return EJSON.stringify(msg)
}

function buildEventMessageString (eventId, data) {
  const msg = {
    v: version,
    ts: (new Date()).getTime(),
    eid: eventId,
    data: data
  }
  return EJSON.stringify(msg)
}

module.exports = {
  version,
  errorCodes,

  parse,
  buildRequestMessageString,
  buildResponseMessageString,
  buildEventMessageString,
}