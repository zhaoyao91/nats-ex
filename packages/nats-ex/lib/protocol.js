const NatsExError = require('./nats-ex-error')
const uuid = require('uuid')

const version = 4

const errorCodes = {
  'PROTOCOL_ERROR': 1,
  'INTERNAL_ERROR': 2,
}

// message string
// message object
// formatted message

/**
 * (messageString) => messageObject
 */
function parseMessageString (msgStr) {
  try {
    return JSON.parse(msgStr)
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
  const valid =
    typeof msgObj === 'object' &&
    msgObj !== null &&
    msgObj.v === version &&
    typeof msgObj.id === 'string' &&
    typeof msgObj.ts === 'number'

  if (!valid) {
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
    id: msgObj.id,
    fromId: msgObj.fid,
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
 * ({data?, error?, fromId?}) => {id, string}
 */
function buildMessage ({data, error, fromId}) {
  const object = {
    v: version,
    ts: (new Date()).getTime(),
    id: uuid.v4(),
    fid: fromId,
    data: data,
    err: !!error ? {
      code: error.code || errorCodes.INTERNAL_ERROR,
      msg: error.message,
      det: error.details
    } : undefined
  }
  const string = JSON.stringify(object)
  return {object, string}
}

module.exports = {
  version,
  errorCodes,

  parseMessage,
  buildMessage,
}