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
print(natsEx.callMethod('ping'))
```

## Command Options

Several options of [NatsEx.constructor](../nats-ex/docs/api.md#natsex) are supported to be passed as command options:

- start = true - if false, it won't create natsEx automatically. you can use `connect` to connect nats manually in the repl
- url = "nats://localhost:4222"
- reconnect = true
- logEvents = true
- queueGroup

## Repl Context

There are several variables in the repl context:

- [connect](../nats-ex/docs/api.md#connect)
- [NatsEx](../nats-ex/docs/api.md#natsex)
- [NatsExError](../nats-ex/docs/api.md#natsexerror)
- [Protocol](../nats-ex/docs/api.md#protocol)
- natsEx
- print - `(Promise) => String`, receive a promise returned by`natsEx.callMethod`, and print the result when response received. 

## License

MIT