# NATS EX Protocol

## Status

- Version: 4
- Based on: 
  - NATS
  - JSON

## Message Schema

```
{
  v: 4, // protocol version
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
- 2 - INTERNAL_ERROR
