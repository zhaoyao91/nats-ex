# NATS EX Protocol

## Status

- Version: 2
- Based on: 
  - NATS
  - EJSON

## Message Schema

```
{
  v: 2, // protocol version
  id: String, // message id,
  ts: Number, // timestamp
  data?: Any, // payload
  err?: {
    code: String,
    msg: String?, // error message
    det: Any?, // error details
  } 
}
```

## Error Codes

- 1 - PROTOCOL_ERROR
- 2 - VALIDATION_ERROR
- 3 - INTERNAL_ERROR
