# PoshanAI

Starter monorepo for an Indian-context nutrition awareness and meal-planning platform.

## Folder structure

```text
PoshanAI/
├── poshanai-frontend/     # React + Vite + Tailwind frontend (Member 1)
├── poshanai-backend/      # Express API and MongoDB connection (Member 2)
├── ai-service/            # Optional Python OCR/RAG/pose service (Member 3)
├── docker-compose.yml     # Local development stack (Member 4)
├── docker-compose.prod.yml
├── nginx/nginx.conf
├── .env.example
└── README.md
```

## Run locally

1. Copy `.env.example` to `.env`. Replace the example JWT secrets before implementing authentication; never commit `.env`.
2. Run `docker compose up --build` and open `http://localhost:8080`. API health is available at `http://localhost:4000/health`.
3. To run the JS apps directly, install dependencies in the root, `poshanai-backend`, and `poshanai-frontend`; run MongoDB locally and set `MONGODB_URI=mongodb://127.0.0.1:27017/poshanai` in `poshanai-backend/.env`. Set `REDIS_URL=redis://127.0.0.1:6379` only if you want OCR to use the Redis queue; without Redis, uploads run OCR synchronously. Then run `npm run dev` at the root.

## Production Compose

Copy `.env.production.example` to `.env`, replace every `CHANGEME` value with unique credentials, set `CLIENT_ORIGIN` to the deployed frontend origin, and ensure the MongoDB and Redis URLs use the same passwords as their service settings. Generate separate JWT secrets of at least 32 characters. Do not commit `.env`. Provide `nginx/certs/fullchain.pem` and `nginx/certs/privkey.pem` from Let's Encrypt before starting the production stack with `docker compose -f docker-compose.prod.yml up -d`. Renew certificates with Certbot on the host and reload nginx after renewal.

For local Compose TLS, place a self-signed certificate and key at those same paths (for example, generate them with OpenSSL using `openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout nginx/certs/privkey.pem -out nginx/certs/fullchain.pem -subj "/CN=localhost" -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"`). The local web container is available at `https://localhost`; HTTP requests redirect to HTTPS. Browsers will warn until the local certificate is trusted.

## Current implementation

The frontend is a responsive landing page. The Express API connects to MongoDB and includes health endpoints, Helmet, restricted CORS, request-size limits, Mongo operator sanitization, API rate limiting, JWT authentication, and ownership-checked report and meal-plan endpoints. Report OCR uses Tesseract.js, with an optional Redis-backed queue and synchronous fallback. Meal plans use a replaceable IFCT RAG stub and an OpenAI-compatible OmniRoute gateway configured with `OMNIROUTE_URL`, `OMNIROUTE_MODEL`, and optional `OMNIROUTE_API_KEY`. Nutrient amounts shown in a plan are calculated from the selected IFCT records and serving weights; the current RAG catalog is a development stub, not a complete food database. The `ai-service` directories remain extension points.

PoshanAI is intended for nutrition awareness and food suggestions. It must not diagnose or replace advice from a qualified healthcare professional.

## Report upload API

Report endpoints require an access token in `Authorization: Bearer <accessToken>`. Upload a single PDF, JPEG, or PNG (maximum 10 MB) using multipart field `file`:

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/api/reports/upload` | Upload a report; with Redis returns `202` and `ocrStatus: "pending"`, without Redis runs OCR synchronously and returns `201` with extracted values. |
| `GET` | `/api/reports` | List the authenticated user's reports. |
| `GET` | `/api/reports/:id` | Get one of the authenticated user's reports, including OCR text. |
| `DELETE` | `/api/reports/:id` | Delete an owned report and its stored file. |

The upload is also accepted at `POST /api/reports` for compatibility with the existing frontend API client. To test in Postman:

1. Set `baseUrl` to `http://localhost:4000` for Docker Compose or `http://localhost:5000` for direct local development.
2. Send `POST {{baseUrl}}/api/auth/login` with raw JSON credentials. Save `data.accessToken` from the response as an `accessToken` environment variable.
3. Send `POST {{baseUrl}}/api/reports/upload` with an `Authorization: Bearer {{accessToken}}` header. Choose **Body → form-data**, add key `file`, change its type to **File**, and select a PDF or image. Save `data.report.id` as `reportId`; with Redis, the response is `202 Accepted` and OCR is pending; without Redis, it is `201 Created` with extracted values.
4. Send `GET {{baseUrl}}/api/reports` and `GET {{baseUrl}}/api/reports/{{reportId}}` with the same bearer token. Poll the single-report request only when the upload response reports `ocrStatus: "pending"`.
5. Send `DELETE {{baseUrl}}/api/reports/{{reportId}}` to verify deletion of the report and its stored file.

Redis is optional. When Redis is available (`REDIS_URL`), report OCR is queued and the upload returns immediately with `ocrStatus: "pending"`. If Redis is not configured or unavailable, the API logs a warning and runs OCR during the upload request, returning the completed report and extracted values. Docker Compose configures Redis and persists uploads in a local folder or named volume. The backend downloads Tesseract's English model when it first processes a report, so network access is needed for first use.

## Meal-plan API

Meal-plan endpoints require a bearer access token. `POST /api/mealplans/generate` accepts a completed, owned `reportId` and optional `preferences` (`dietType`, `allergies`, `region`, and `activityLevel`). The list, detail, and status endpoints return only plans owned by the authenticated user:

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/api/mealplans/generate` | Generate and save a seven-day meal plan from an owned, OCR-complete report. |
| `GET` | `/api/mealplans` | List the authenticated user's plans. |
| `GET` | `/api/mealplans/:id` | Get one owned plan. |
| `PATCH` | `/api/mealplans/:id/status` | Set `status` to `active` or `completed`. |

Every plan response includes the disclaimer: “PoshanAI provides nutrition awareness and suggestions. It does not diagnose, treat, or replace advice from a qualified healthcare professional.” If OmniRoute is unavailable or returns an invalid plan, generation fails with a structured API error rather than returning a fabricated plan. The initial replaceable RAG stub uses a small selection of IFCT 2017 data published by ICMR-NIN ([official tables](https://www.nin.res.in/ebooks/IFCT2017.pdf)); unavailable B12 values remain `null`. Configure the model and any gateway credential only in the backend environment.
