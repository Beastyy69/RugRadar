# RugRadar

RugRadar is a full-stack crypto-address risk scanner. The React client lets
people scan an address and review its risk report and history; the Express API
coordinates requests and persistence; and the FastAPI service assembles the
risk assessment from blockchain and security data sources.

## Repository layout

| Directory | Purpose |
| --- | --- |
| [`client/`](client/README.md) | Vite + React single-page application |
| [`server/`](server/README.md) | Express API and MongoDB-backed scan history |
| [`ml-service/`](ml-service/README.md) | FastAPI address-scoring service |
| [`docs/`](docs/) | Project and deployment documentation |

## Architecture

```text
Browser -> React client -> Express server -> FastAPI ML service -> security and chain providers
                              |
                              -> MongoDB scan history
```

## Local development

Start the services in this order:

```powershell
# terminal 1
cd ml-service
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# terminal 2
cd server
npm install
npm start

# terminal 3
cd client
npm install
npm run dev
```

Copy the `.env.example` file in each applicable component to `.env` before
running it. The checked-in templates contain only safe example values; actual
secrets must remain in the deployment provider's environment-variable settings.

## Deployment

See [Render deployment instructions](docs/RENDER_DEPLOYMENT.md) for the
required service setup, environment variables, health checks, and SPA rewrite.

## Important notes

- The scanner returns risk signals, not financial advice or a guarantee of safety.
- Scan history requires a MongoDB deployment such as MongoDB Atlas.
- Do not commit `.env` files, API keys, or database credentials.
