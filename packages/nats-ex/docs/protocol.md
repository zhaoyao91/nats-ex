# NATS EX Protocol

## Status

- Version: 1
- Based on: 
  - NATS
  - EJSON

## Schemas  

### Topic

`method.${methodName}`

or

`event.${eventName}`

### Method Request

```
{
  v: 1, // protocol version
  rid: String, // request id
  ts: Number, // timestap
  data: Any?, // payload
}
```

### Method Response 

```
{
  v: 1, // protocol version
  rid: String, // request id
  ts: Number, // timestamp
  data: Any?, // payload
  err?: {
    code: String,
    msg: String?, // error message
    det: Any?, // error details
  } 
}
```

#### error code

- 1 - TIMEOUT
- 2 - PROTOCOL_ERROR
- 3 - VALIDATION_ERROR
- 4 - INTERNAL_ERROR

### Event Message

```
{
  v: 1, // protocol version
  eid: String, // event id
  ts: Number, // timestamp
  data: Any?, // payload
}
```