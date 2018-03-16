# API Document

This package exposes following modules:

- [connect](#connect)
- [NatsEx](#natsex)
- [NatsExError](#natsexerror)
- [Protocol](#protocol)

## connect

Create a NatsEx instance and connect it to NATS server.

```
(Options?) => Promise => NatsEx

Options ~ see NatsEx.constructor.options
```

## NatsEx

### $.constructor

```
(Options?) => NatsEx

Options ~ {
  url: String = nats://localhost:4222,
  queueGroup: String = null,
  reconnectOnStart: Boolean = false
  reconnectOnDisconnect: Boolean = true
  logger: Object = console,
  logNatsEvents: Boolean = true,
  logMessageEvents: Boolean = true,
  natsErrorHandler?: (error) => Void
}
```

### $.connect

Connect to NATS server.

```
() => Promise => Void
```

### $.close

Gracefully disconnect from the NATS server.

```
() => Promise => Void
```

### $.emit

Emit a message.

```
(topic, data, error?) => messageId
```

### $.call

Send a request message and wait for response message.

```
(topic, data, Options?) => Promise => Any

Options ~ {
  timeout: Number = 60000, // default to 1 min
  returnResponse: Boolean = false, // if true, it will return the response message instead of the data of the response
}
```

### $.on

Subscribe some kind of message.

```
(topic, Handler, Options?) => Void

Handler ~ (data, message, receivedTopic) => Promise => Any

Options ~ {
  validator: Validator?
  formGroup: Boolean = true, // if true listeners on this natsEx (queueGroup) will form a queue group so listeners of same topics will be load balanced 
}

Validator ~ (data) => data // throw NatsExError if validation failed
```

## NatsExError

### $.constructor

```
(code, message, details?) => NatsExError
```

## Protocol

### version

```
Number
```

### errorCodes

```
{String => Number}
```