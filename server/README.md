# server

Express backend for the crypto scam-token risk scorer. It's a thin proxy in
front of the Python `ml-service`: the React frontend calls this server, this
server calls `ml-service`, and every successful scan gets saved to MongoDB
so a history view is possible later.

```
React (client/) -> Express (server/) -> FastAPI (ml-service/) -> GoPlus API
                          |
                          v
                       MongoDB (scan history)
```

## Setup

```bash
cd server
npm install
cp .env.example .env
```

`ml-service` must be running (see `../ml-service/README.md`) for `/api/scan`
to work.

## Run

```bash
npm start
```

Or with auto-restart on file changes (Node's built-in `--watch`, no extra
dependency needed):

```bash
npm run dev
```

## Test

With the server running:

```bash
curl http://localhost:4000/
curl http://localhost:4000/health
```

Expected responses:

```json
{"message": "Scam Token Risk Scorer backend is running"}
{"status": "ok"}
```

## API contract (for the React app)

`GET /api/scan?address=0x...&chain_id=1` - identical response shape to
`ml-service`'s `/scan` (this just proxies it and adds history-saving):

```json
{
  "address": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
  "score": 10,
  "level": "low",
  "reasons": ["..."],
  "features": { "is_honeypot": false, "...": "..." }
}
```

Error responses (`400` invalid address, `404` token not found, `502`
ml-service unreachable) are forwarded from `ml-service` as-is. CORS is open
(`origin: "*"`) so the React dev server can call this directly.

`GET /api/history?limit=20` - past scans, newest first (`limit` capped at 100):

```json
{
  "count": 2,
  "scans": [
    { "address": "0x...", "score": 10, "level": "low", "reasons": [...], "features": {...}, "createdAt": "..." }
  ]
}
```

Run the end-to-end checks (needs `ml-service` running first):

```bash
node test/test-step3-scan-proxy.js
node test/test-step4-history.js
```

## Project status

- [x] Step 1: Project setup + health endpoint
- [x] Step 2: MongoDB connection + Scan model
- [x] Step 3: `/api/scan` proxy endpoint + CORS
- [x] Step 4: `/api/history` endpoint + end-to-end test

## Database setup

You need a MongoDB instance - a local install, Docker, or a free
[MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster all work. Put
the connection string in `MONGODB_URI` in your `.env` (never commit this
file - it contains your password).

Test the connection and the `Scan` model without touching your real data:

```bash
node test/test-step2-db.js
```

This creates one throwaway document, verifies it, then deletes it.
