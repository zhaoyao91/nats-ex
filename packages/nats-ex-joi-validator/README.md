# NATS EX Joi Validator

Validate [NATS EX](https://github.com/zhaoyao91/nats-ex) data using [Joi](https://github.com/hapijs/joi).

## Installation

`npm i nats-ex-joi-validator`

## Usage

```ecmascript 6
const Joi = require('joi')
const validate = require('nats-ex-joi-validator')

const validator = validate({
  name: Joi.string().required()
})

natsEx.registerMethod('hello', validator, ({name}) => `Hello ${name}`)
```

## License

MIT