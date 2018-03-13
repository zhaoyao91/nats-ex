# NATS EX

Simplify communications on NATS.

## Features

- RR method and event communication modes
- EJSON-based message protocol (support transfer `Date` and `Buffer` directly)
- Auto transfer errors
- Input validation
- ES6 async/await api

## Installation

```
npm i -S nats-ex
```

## Usage

```ecmascript 6
const {connect} = require('nats-ex')

// connect to nats
const natsEx = await connect({
  url: 'nats://localhost:4222',
  queueGroup: 'X'
})

// register a method
natsEx.registerMethod('sum', null, ({a, b}) => a + b)

// call a method
const sum = await natsEx.callMethod('sum', {a: 1, b: 2})
// sum is 3

// listen to an event
natsEx.listenEvent('hi', null, ({name}) => console.log(`Hello ${name}`))

// emit an event
natsEx.emitEvent('hi', {name: 'Bob'})
// console: Hello Bob
```

## API

[API Document](./docs/api.md)

## Protocol

[NATS EX Protocol](./docs/protocol.md)

## License

MIT