# Signaling Server

A REST api for signaling for a webRTC app.

## API Reference

#### Set an offer for a call

```http
  POST /offer/:id
```

| Parameter | Type     | Description      |
| :-------- | :------- | :--------------- |
| `id`      | `string` | A unique call id |

#### Get an offer for a call

```http
  GET /offer/:id
```

| Parameter | Type     | Description           |
| :-------- | :------- | :-------------------- |
| `id`      | `string` | **Required**. Call id |

#### Set an answer for a call

```http
  POST /answer/:id
```

| Parameter | Type     | Description           |
| :-------- | :------- | :-------------------- |
| `id`      | `string` | **Required**. Call id |

#### Set an offer's ice candidate for a call

```http
  POST /offer/:id/candidate
```

| Parameter | Type     | Description           |
| :-------- | :------- | :-------------------- |
| `id`      | `string` | **Required**. Call id |

#### Set an answer's ice candidate for a call

```http
  POST /answer/:id/candidate
```

| Parameter | Type     | Description           |
| :-------- | :------- | :-------------------- |
| `id`      | `string` | **Required**. Call id |

#### Subscribe to events for a call

```http
  GET /events/:id
```

| Parameter | Type     | Description           |
| :-------- | :------- | :-------------------- |
| `id`      | `string` | **Required**. Call id |
