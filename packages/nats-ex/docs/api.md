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

## Message

```
{
  version: Number,
  id: String,
  fromId?: String,
  timestamp: Number,
  data?: Any,
  error?: {
    code: Number,
    message?: String,
    details?: Any, 
  }
}
```

## NatsEx

### $.constructor

```
(Options?) => NatsEx

Options ~ {
  url: String = nats://localhost:4222,
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
(topic, data, Options) => messageId

Options ~ {
  error?: Error,
  fromId?: String,
}
```

### $.call

Send a request message and wait for response message.

```
(topic, data, Options?) => {requestId} & Promise => Any | Message

Options ~ {
  fromId?: String,
  timeout: Number = 60000, // default to 1 min
  returnResponse: Boolean = false, // if true, it will return the response message instead of the data of the response
}
```

### $.on

Subscribe some kind of message.

```
(topic, Handler, Options?) => Void

Handler ~ (data, ExtendedMessage, receivedTopic) => Promise => Any

Options ~ {
  validator: Validator?
  queue?: String, // message load balance queue group name 
}

Validator ~ (data) => data // throw NatsExError if validation failed

ExtendedMessage ~ Message & {
  emit: Function, // the same as $.emit, with `fromId` automatically set
  call: Function, // the same as $.call, with `fromId` automatically set
}
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