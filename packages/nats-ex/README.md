# NATS EX

Simplify communications on NATS.

## Features

- EJSON-based message protocol (support transfer `Date` and `Buffer` directly)
- Auto transfer errors
- Input validation
- ES6 async/await api

## Installation

```
npm i nats-ex
```

## Usage

```ecmascript 6
const {connect} = require('nats-ex')

// connect to nats
const natsEx = await connect({
  url: 'nats://localhost:4222',
})

// subscribe a topic
natsEx.on('hello', (name) => {
  console.log(`Welcome ${name}`)
  return `Hello ${name}`
})

// emit an message
natsEx.emit('hello', 'Bob')
// console: Welcome Bob

// request a response
natsEx.call('hello', 'Alice').then(console.log)
// console: Welcome Alice
// console: Hello Alice
```

## API

[API Document](./docs/api.md)

## Protocol

[NATS EX Protocol](./docs/protocol.md)

## License

MIT
