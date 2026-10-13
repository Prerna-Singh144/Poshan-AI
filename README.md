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
3. To run the JS apps directly, install dependencies in the root, `poshanai-backend`, and `poshanai-frontend`; run MongoDB and Redis locally, set `MONGODB_URI=mongodb://127.0.0.1:27017/poshanai` and `REDIS_URL=redis://127.0.0.1:6379` in `poshanai-backend/.env`, then run `npm run dev` at the root.

## Current implementation

The frontend is a responsive landing page. The Express API connects to MongoDB and includes health endpoints, Helmet, restricted CORS, request-size limits, Mongo operator sanitization, API rate limiting, JWT authentication, and report upload/ownership endpoints. Report OCR uses Tesseract.js through a Redis-backed queue; IFCT retrieval, Gemini meal-plan generation, and other application data routes remain planned. The `ai-service` directories are extension points only.

PoshanAI is intended for nutrition awareness and food suggestions. It must not diagnose or replace advice from a qualified healthcare professional.

## Report upload API

Report endpoints require an access token in `Authorization: Bearer <accessToken>`. Upload a single PDF, JPEG, or PNG (maximum 10 MB) using multipart field `file`:

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/api/reports/upload` | Upload a report and enqueue OCR; returns `202` with `ocrStatus: "pending"`. |
| `GET` | `/api/reports` | List the authenticated user's reports. |
| `GET` | `/api/reports/:id` | Get one of the authenticated user's reports, including OCR text. |
| `DELETE` | `/api/reports/:id` | Delete an owned report and its stored file. |

The upload is also accepted at `POST /api/reports` for compatibility with the existing frontend API client. To test in Postman:

1. Set `baseUrl` to `http://localhost:4000` for Docker Compose or `http://localhost:5000` for direct local development.
2. Send `POST {{baseUrl}}/api/auth/login` with raw JSON credentials. Save `data.accessToken` from the response as an `accessToken` environment variable.
3. Send `POST {{baseUrl}}/api/reports/upload` with Bearer token `{{accessToken}}`. Choose **Body → form-data**, add key `file`, change its type to **File**, and select a PDF or image. Save `data.report.id` as `reportId`; the response is `202 Accepted`.
4. Send `GET {{baseUrl}}/api/reports` and `GET {{baseUrl}}/api/reports/{{reportId}}` with the same Bearer token. Poll the single-report request until `ocrStatus` is `completed` or `failed`.
5. Send `DELETE {{baseUrl}}/api/reports/{{reportId}}` to verify deletion of the report and its stored file.

OCR jobs require Redis (`REDIS_URL`); Docker Compose configures the Redis service and persists uploads in a local folder or named volume. The backend downloads Tesseract's English model when it first processes a report, so network access is needed for first use.
