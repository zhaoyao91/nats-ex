const validate = require('./index')
const {connect, Protocol} = require('nats-ex')
const Joi = require('joi')

describe('validate', function () {
  let natsEx = null

  const schema = {
    name: Joi.string().required(),
    age: Joi.number().required(),
  }

  beforeAll(async () => {
    natsEx = await connect({
      methodErrorHandler: () => {}
    })
    natsEx.registerMethod('validate', validate(schema), (data) => data)
  })

  afterAll(() => {
    natsEx.close()
  })

  it('should pass', async () => {
    const data = {
      name: 'Bob',
      age: '20'
    }
    const result = await natsEx.callMethod('validate', data)
    expect(result.name).toBe('Bob')
    expect(result.age).toBe(20)
  })

  it('should failed', async () => {
    expect.assertions(2)
    const data = {
      name: 'Bob',
      age: 'Twenty'
    }
    try {
      const result = await natsEx.callMethod('validate', data)
    }
    catch (err) {
      expect(err.name).toBe('NatsExError')
      expect(err.code).toBe(Protocol.errorCodes.VALIDATION_ERROR)
    }
  })
})