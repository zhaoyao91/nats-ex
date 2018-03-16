# NATS EX Repl

Repl for [NATS EX](https://github.com/zhaoyao91/nats-ex).

## Installation

```
npm i -g nats-ex-repl
```

## Usage

Enter repl:

```
nats-ex-repl
```

Then in the repl:

```
emit('hello')

call('echo', 'my input')((err, data) => {...}) 
```

## Command Options

- start = true - if false, it won't create natsEx automatically. you can use `connect` to connect nats manually in the repl
- url = "nats://localhost:4222"
- queueGroup: String?
- logger: 'console' | 'json' = 'console'
- logMessageEvents = false
- logMessageErrors = true

## Repl Context

There are several variables in the repl context:

- [connect](../nats-ex/docs/api.md#connect)
- [NatsEx](../nats-ex/docs/api.md#natsex)
- [NatsExError](../nats-ex/docs/api.md#natsexerror)
- [Protocol](../nats-ex/docs/api.md#protocol)
- [on](../nats-ex/docs/api.md#$.on)
- [emit](../nats-ex/docs/api.md#$.emit)
- [call](../nats-ex/docs/api.md#$.call) - the return value are different for repl convenient
  ```
  (topic, data, options) => CallbackReceiver
  
  CallbackReceiver ~ {requestId} & (Callback) => Void
  
  Callback ~ (error, data) => requestId
  ```

## License

MIT