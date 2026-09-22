# Deploying RugRadar on Render

RugRadar has three deployable pieces. Deploy the ML service first, the
Express server second, and the static client last. Keep the two web services
in the same Render region.

| Component | Render service type | Root directory | Build command | Start / publish setting |
| --- | --- | --- | --- | --- |
| Client | Static Site | `client` | `npm ci && npm run build` | Publish directory: `dist` |
| Server | Web Service | `server` | `npm ci` | `npm start` |
| ML service | Web Service | `ml-service` | `pip install -r requirements.txt` | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |

## 1. Deploy the ML service

Create a **Web Service** from this repository with `ml-service` as its root
directory. Use the table's build and start commands.

- Health-check path: `/health`
- Runtime: Python 3
- The service must be publicly reachable by the server unless you replace its
  URL below with a Render private-network address.

Optional environment variables, set only if you have the keys:

| Variable | Why it is used |
| --- | --- |
| `ETHERSCAN_API_KEY` | Enhances transaction-history and contract-creation lookups |
| `CHAINABUSE_API_KEY` | Enables limited community scam-report checks |
| `GOPLUS_APP_KEY` / `GOPLUS_APP_SECRET` | Optional GoPlus credentials, if your plan requires them |

`DEFAULT_CHAIN_ID` is documented in `ml-service/.env.example`, but the app's
normal scan route uses automatic chain detection.

After it deploys, copy its URL, for example:

```text
https://rugradar-ml-service.onrender.com
```

## 2. Deploy the Express server

Create another **Web Service** with `server` as its root directory. Set:

| Variable | Required | Value |
| --- | --- | --- |
| `ML_SERVICE_URL` | Yes | Public ML-service URL from step 1, without a trailing slash |
| `MONGODB_URI` | Recommended | Connection string for a MongoDB Atlas (or other reachable MongoDB) database |
| `PORT` | No | Omit it: Render supplies this automatically |

Use `/health` as the health-check path. The service runs without
`MONGODB_URI`, but it will not store scan history. Render does not provide a
managed MongoDB product, so MongoDB Atlas is the straightforward choice.

Once deployed, copy the server URL, for example:

```text
https://rugradar-api.onrender.com
```

## 3. Deploy the React client

Create a **Static Site** with `client` as root directory. Before the build,
add this environment variable:

| Variable | Value |
| --- | --- |
| `VITE_API_BASE_URL` | The Express server URL from step 2, without a trailing slash |

Vite embeds `VITE_*` values during the build, so save the variable and
trigger a new deploy whenever the server URL changes.

### SPA routing rewrite

The app has client-side routes such as `/scan` and `/history`. In the static
site's **Redirects/Rewrites** settings, add this rewrite:

| Source | Destination | Action |
| --- | --- | --- |
| `/*` | `/index.html` | Rewrite |

Without it, directly opening or refreshing `/scan` or `/history` will return
a 404 page from the host.

## Post-deploy checks

1. Open `https://<server>/health` and `https://<ml-service>/health`; both
   should return `{"status":"ok"}`.
2. Open the client home page, then try a scan.
3. Confirm the browser network request goes to
   `https://<server>/api/scan?...`, rather than `localhost:4000`.
4. If scan history is needed, perform a scan and open `/history`.

## Production notes

- The current server and ML-service CORS configuration permits all origins.
  That is compatible with this deployment, but should be restricted before a
  production launch with authentication or cookies.
- Never put private keys or MongoDB credentials in Git. Add them in Render's
  environment-variable UI.
- Free Render services can sleep when idle, so the first request may be slow.
