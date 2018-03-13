# NATS EX Repl

Repl for [NATS EX](https://github.com/zhaoyao91/nats-ex).

## Installation

```
npm i -g nats-ex-repl
```

## Usage

Enter repl:

```
nats-ex-repl --url nats://localhost:4222
```

Then in the repl:

```
print(natsEx.callMethod('ping'))
```

## Command Options

Several options of [NatsEx.constructor](../nats-ex/docs/api.md#natsex) are supported to be passed as command options:

- url - if specified, repl will try to connect NATS before start
- reconnect
- queueGroup
- logEvents

## Repl Context

There are several variables in the repl context:

- [connect](../nats-ex/docs/api.md#connect)
- [NatsEx](../nats-ex/docs/api.md#natsex)
- [NatsExError](../nats-ex/docs/api.md#natsexerror)
- [Protocol](../nats-ex/docs/api.md#protocol)
- natsEx - exists only if `url` option is specified
- print - `(Promise) => String`, receive a promise returned by`natsEx.callMethod`, and print the result when response received. 

## License

MIT