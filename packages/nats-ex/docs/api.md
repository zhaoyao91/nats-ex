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
  url: String = nats://localhost:4222, // you could use ',' to join several server addresses
  reconnect: Boolean = false, // if true, the client will try to reconnect to NATS server every second if it is disconnected
  queueGroup: String = null, // define and join a queue group. methods and events of the same name in a queue group will be load balanced between all group members
  logger: Object = console,
  logEvents: Boolean = true,
  methodErrorHandler?: (error) => Void // default behavior is to log the error
  eventErrorHandler?: (error) => Void // default behavior is to log the error
  natsErrorHandler?: (error) => Void // default behavior is to log the error
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

### $.registerMethod

Register a method and prepare to handle the requests.

The returned value of the handler will be sent back to the caller.

Any error will be thrown to the caller too, with `code`, `message`, `details` fields. 

```
(name, Handler)
(name, Validator, Handler)
=> Void

Validator ~ (data: Any) => data: Any // throw NatsExError if validation failed

Handler ~ (data: Any?, requestMessage) => Promise => Any
```

### $.callMethod

Call a method and wait for response.

If request handler throw an error, this method will throw a `NatsExError` and wrap `code`, `message`, `details` in it.

```
(name: String, data: Any, Options?) => Promise & {requestId: String} => Any

Options ~ {
  timeout: Number = 60000, // default to 1 min
  returnData: Boolean = true, // if false, it will return the whole response message
}
```

### $.callMethodAndForget

Call a method and forget the response.

```
(name: String, data: Any?) => requestId: String
```

### $.emitEvent

Emit an event.

```
(name: String, data: Any?) => eventId: String
```

### $.listenEvent

Listen to and prepare to handle the event.

```
(name, Handler)
(name, Validator, Handler)
=> Void

Validator ~ (data: Any) => data: Any // throw NatsExError if validation failed

Handler ~ (data: Any?, eventMessage: Object) => Promise => Void
```

### $.listenBroadcastEvent

Listen to and prepare to handle the event.

Unlike `listenEvent`, call this method will register a listener which will not join the queue group.

```
(name, Handler)
(name, Validator, Handler)
=> Void

Validator ~ (data: Any) => data: Any // throw NatsExError if validation failed

Handler ~ (data: Any?, eventMessage: Object) => Promise => Void
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