# NATS EX Protocol

## Status

- Version: 3
- Based on: 
  - NATS
  - EJSON

## Message Schema

```
{
  v: 3, // protocol version
  id: String, // message id,
  fid?: String, // from message id  
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
