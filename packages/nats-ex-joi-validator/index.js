const Joi = require('joi')
const {NatsExError, Protocol} = require('nats-ex')

module.exports = function validate (schema, options) {
  schema = Joi.compile(schema)
  return function validator (data) {
    const {error, value} = schema.validate(data, options)
    if (error) {
      throw new NatsExError(
        Protocol.errorCodes.VALIDATION_ERROR,
        'VALIDATION_ERROR: Invalid data',
        error.details
      )
    }
    return value
  }
}