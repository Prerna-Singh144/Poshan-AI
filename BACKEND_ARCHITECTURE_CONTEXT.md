# PoshanAI Backend — Architecture, Features & Implementation Context

> **Audience:** AI Coding Assistants, Core Contributors, Engineering Reviewers.  
> **Status:** Production-ready foundation with integrated OCR, IFCT RAG, Gemini AI meal planning, dual storage, and multi-session auth.  
> **Repository Grounding:** Verified against active backend codebase (`poshanai-backend/src`).

---

## 1. System Overview & Technology Stack

| Layer | Technology | Details |
|---|---|---|
| **Runtime** | Node.js (ES Modules) | ES2022 syntax with `import`/`export`, Node 18+ |
| **Framework** | Express 4.21.2 | Layered routing, async controllers, centralized error handling |
| **Database** | MongoDB 8.9.5 + Mongoose | Schema validation, indexed foreign keys, lean queries |
| **Queue / Cache** | BullMQ 6.3.13 + Redis (ioredis 6.0) | Background OCR worker with exponential backoff & synchronous dev fallback |
| **File Storage** | Dual: Local Disk + AWS S3 | S3 SDK v3 presigned URLs, quota enforcement, path traversal protection |
| **OCR Pipeline** | Tesseract.js 7.0.0 + PDF.js + Canvas | Multi-page PDF rasterization, lab report regex parser (SRL, Apollo, Dr Lal) |
| **AI / RAG** | ICMR-NIN IFCT 2017 + Google Gemini | Indian Food Composition Tables semantic retrieval + OmniRoute meal generation |
| **Security** | Helmet, JWT, Bcrypt (12 rounds), Joi | Magic-byte upload validation, rate limiting, IP+email hash brute-force defense |

---

## 2. Directory Structure

```text
poshanai-backend/
├── src/
│   ├── config/
│   │   ├── constants.js          # Rate limits, auth settings, upload/OCR constants
│   │   ├── db.js                 # Mongoose connection with retry & graceful shutdown
│   │   └── env.js                # Environment variable validation & safe defaults
│   ├── controllers/
│   │   ├── authController.js     # Register, login, refresh, logout, logoutAll
│   │   ├── mealPlanController.js # Generate, list, getById, updateStatus
│   │   └── reportController.js   # Upload, list (paginated), getById, remove (with quota)
│   ├── jobs/
│   │   ├── queue.js              # BullMQ queue definition & connection options
│   │   └── worker.js             # Dedicated OCR processing background worker
│   ├── middleware/
│   │   ├── authMiddleware.js     # JWT Bearer token authentication
│   │   ├── errorHandler.js       # Production-safe error formatting & status mapping
│   │   ├── requestLogger.js      # Winston request tracing with x-request-id
│   │   └── uploadMiddleware.js   # Multer, magic-byte checking & safe file cleanup
│   ├── models/
│   │   ├── MealPlan.js           # 7-day meal plan schema with IFCT nutrients & status
│   │   ├── Report.js             # Lab report schema with biomarkers & OCR status
│   │   └── User.js               # User credentials, roles, quota counters, refresh hashes
│   ├── rag/
│   │   └── ragService.js         # ICMR-NIN IFCT 2017 food composition dataset & filters
│   ├── routes/
│   │   ├── authRoutes.js         # /api/auth/* endpoints with rate limits & validators
│   │   ├── mealPlanRoutes.js     # /api/mealplans/* endpoints
│   │   └── reportRoutes.js       # /api/reports/* endpoints
│   ├── services/
│   │   ├── aiService.js          # OmniRoute/Gemini prompt synthesis & meal-plan builder
│   │   ├── healthService.js      # Deep health checks (Mongo ping, Redis ping, uptime)
│   │   ├── ocrProcessor.js       # OCR execution orchestration & timeout handling
│   │   ├── ocrService.js         # Tesseract.js image & PDF OCR engine
│   │   ├── reportParser.js       # Dr Lal, Apollo, SRL lab table & biomarker parsing
│   │   └── storageService.js     # Local filesystem & AWS S3 adapter with presigned URLs
│   ├── utils/
│   │   ├── asyncHandler.js       # Express async route wrapper
│   │   ├── httpError.js          # Structured HTTP errors with status codes & codes
│   │   ├── logger.js             # Winston logger with timestamp, levels, and file transport
│   │   └── validationError.js    # Joi validation error formatter
│   ├── validators/
│   │   └── authValidators.js     # Joi schemas for register, login, refresh, logout
│   ├── app.js                    # Express app configuration & middleware pipeline
│   └── server.js                 # HTTP server bootstrap, worker startup, graceful shutdown
└── tests/
    ├── fixtures/                 # Sample text & OCR report data
    ├── mealPlanModel.test.js     # MealPlan schema validation & 7-day coverage tests
    ├── ocrService.test.js        # Lab report regex parsing & biomarker tests
    ├── ragService.test.js        # IFCT food retrieval, regional & allergen tests
    └── reportModel.test.js       # Report schema & ownership index tests
```

---

## 3. Database Models & Schemas

### 3.1 User (`src/models/User.js`)
- **Fields:**
  - `name`: String (2–80 chars, trimmed, required)
  - `email`: String (lowercase, trimmed, unique, indexed, required)
  - `passwordHash`: String (bcrypt salt rounds: 12, `select: false`)
  - `role`: Enum `['user', 'admin']` (default: `'user'`)
  - `refreshTokens`: Array of session objects (`hash`, `deviceInfo`, `createdAt`, `lastUsedAt`), `select: false` (supports up to 5 concurrent devices)
  - `uploadCount`: Number (default: 0, user quota tracking)
  - `uploadSizeBytes`: Number (default: 0, user quota tracking)
  - `uploadQuotaInitialized`: Boolean (`select: false`)
- **Indexes:** Unique index on `email`.

### 3.2 Report (`src/models/Report.js`)
- **Fields:**
  - `userId`: ObjectId reference to `User` (indexed, required)
  - `fileUrl`: String (storage key or relative path, required)
  - `fileSizeBytes`: Number (required, min: 0)
  - `fileType`: Enum `['application/pdf', 'image/jpeg', 'image/png']`
  - `ocrStatus`: Enum `['pending', 'processing', 'completed', 'failed']` (default: `'pending'`, indexed)
  - `ocrError`: String (error code if failed)
  - `processingStartedAt`: Date (tracks lock/timeout)
  - `rawOcrText`: String (full extracted text from document)
  - `extractedValues`: Array of parsed biomarker objects:
    - `nutrient`: Enum `['Vitamin D', 'Vitamin B12', 'Iron', 'Calcium', 'Hemoglobin']`
    - `value`: Number
    - `unit`: String or null
    - `referenceRange`: String or null
    - `flag`: Enum `['normal', 'low', 'high', 'unknown']`
  - `uploadedAt`: Date (default: `Date.now`)
  - `processedAt`: Date or null
- **Indexes:** Compound index on `{ userId: 1, uploadedAt: -1 }`.

### 3.3 MealPlan (`src/models/MealPlan.js`)
- **Fields:**
  - `userId`: ObjectId reference to `User` (indexed, required)
  - `reportId`: ObjectId reference to `Report` (indexed, required)
  - `title`: String (default: `'Personalized Meal Plan'`)
  - `preferences`: Object (dietType, allergies, region, activityLevel)
  - `targetDeficiencies`: Array of String (e.g. `['Iron', 'Vitamin D']`)
  - `planDurationDays`: Number (default: 7, min: 1, max: 30)
  - `meals`: Array of 7 day meal blocks. **Validator enforces that all 7 days are covered**.
    - Each meal has: `day` (1-7), `mealType` (`breakfast`, `lunch`, `dinner`, `snack`), `items`:
      - `foodName`: String
      - `ifctCode`: String (e.g. `'C033'` for Spinach)
      - `quantityGrams`: Number (1–2000g)
      - `nutrients`: `calories`, `protein`, `carbs`, `fat`, `iron`, `calcium`, `vitaminD`, `vitaminB12` (nullable)
  - `aiModelUsed`: String (e.g. `'gemini-2.5-flash'` or `'omniroute-default'`)
  - `ragSourcesUsed`: Array of IFCT codes referenced
  - `disclaimer`: String (mandatory non-medical disclaimer)
  - `status`: Enum `['draft', 'active', 'completed']` (default: `'active'`)
  - `generatedAt`: Date (default: `Date.now`)
- **Indexes:** `{ userId: 1 }`, `{ reportId: 1 }`, `{ status: 1 }`.

---

## 4. API Endpoints & Contracts

### 4.1 Authentication (`/api/auth`)
| Method | Endpoint | Auth | Rate Limit | Description |
|---|---|---|---|---|
| `POST` | `/register` | Public | 5 req / 15m | Name, email, password (8-128 chars). Returns JWT access token (15m) + sets HTTP-only refresh cookie (7d). |
| `POST` | `/login` | Public | 5 failed / 15m (IP+Email) | Authenticates credentials, adds device session hash, returns access token + refresh cookie. |
| `POST` | `/refresh` | Cookie | General | Rotates current device refresh token; returns fresh access token. |
| `POST` | `/logout` | Cookie | General | Invalidates current device session hash and clears cookie. |
| `POST` | `/logout-all` | Bearer | General | Invalidates all active refresh sessions across all devices for user. |

### 4.2 Blood Reports & OCR (`/api/reports`)
| Method | Endpoint | Auth | Request | Description |
|---|---|---|---|---|
| `POST` | `/upload` or `/` | Bearer | `multipart/form-data` (`file`) | Validates PDF/PNG/JPEG magic bytes, checks user quotas (max 50 files / 500 MB). Returns `202 Accepted` (queued BullMQ job) or `201 Created` (synchronous dev fallback). |
| `GET` | `/` | Bearer | Query: `?page=1&limit=10` | Returns paginated list of user's reports. Projects out heavy `rawOcrText` for speed. |
| `GET` | `/:id` | Bearer | Params: 24-char hex ID | Returns report details with extracted biomarkers, reference ranges, flags, raw text, and S3 presigned download URL. |
| `DELETE` | `/:id` | Bearer | Params: 24-char hex ID | Deletes report document from MongoDB, removes file from S3/disk, and releases user upload quota. |

### 4.3 Meal Plans & AI Suggestions (`/api/mealplans`)
| Method | Endpoint | Auth | Request Body | Description |
|---|---|---|---|---|
| `POST` | `/generate` | Bearer | `{ reportId, preferences: { dietType, allergies, region, activityLevel } }` | Checks report is completed, extracts `'low'` biomarkers, queries IFCT RAG database, queries Gemini AI, saves 7-day meal plan with nutrients. Returns `201 Created`. |
| `GET` | `/` | Bearer | Query: `?page=1&limit=20` | Returns paginated list of user's generated meal plans. |
| `GET` | `/:id` | Bearer | Params: 24-char hex ID | Returns detailed 7-day meal plan with foods, quantities, nutrients, and disclaimers. |
| `PATCH` | `/:id/status` | Bearer | `{ status: "active" \| "completed" }` | Updates plan status. |

### 4.4 System Health (`/health`)
| Method | Endpoint | Auth | Response |
|---|---|---|---|
| `GET` | `/health` | Public | Status `200` (`"ok"`) or `503` (`"degraded"`). Checks MongoDB connection (`db.command({ ping: 1 })`), Redis ping (`PONG`), and process uptime. |

---

## 5. Core Services & Workflows

### 5.1 OCR Processing Pipeline
1. **Upload Validation:** `multer` receives single file; `uploadMiddleware` verifies magic bytes (`%PDF-`, `\xFF\xD8\xFF`, `\x89PNG\r\n\x1a\n`).
2. **Quota Check:** Ensures user has `< 50` reports and `< 500 MB` total uploads.
3. **Storage:** Stored locally in `uploads/reports/` or streamed to AWS S3.
4. **Queueing:**
   - **Production / Redis:** BullMQ job is enqueued (`extract-report-text`). Dedicated worker processes job with concurrency `2`.
   - **Development / Fallback:** If Redis is down, triggers `processReportWithTimeout(reportId)` synchronously (with 60-second guard).
5. **PDF & Image Rasterization:** Single images processed directly; multi-page PDFs (up to 25 pages) rendered to in-memory canvases using `pdfjs-dist` and `@napi-rs/canvas`.
6. **Tesseract.js Engine:** Runs English OCR.
7. **Biomarker Extraction (`reportParser.js`):**
   - Matches regex patterns for Vitamin D, Vitamin B12, Iron, Calcium, Hemoglobin.
   - Parses observed values, units (ng/mL, pg/mL, g/dL, etc.), reference ranges (`10 - 30`, `< 20`, `> 100`).
   - Flags values as `low`, `normal`, `high`, or `unknown`.
   - Sets report status to `completed` and records `processedAt`.

### 5.2 RAG Engine (`src/rag/ragService.js`)
- **Dataset:** ICMR-NIN (National Institute of Nutrition) Indian Food Composition Tables (IFCT 2017).
- **Nutritional Mapping:** Converted per 100g edible portion (Energy in kcal, minerals in mg, vitamins in mcg).
- **Multi-Factor Filtering:**
  - **Diet:** Filtered by `veg`, `eggetarian`, `nonveg`.
  - **Allergies:** Excludes allergens (`nuts`, `dairy`, `gluten`, `legumes`, `soy`, `fish`, `shellfish`, `eggs`).
  - **Regions:** Prioritizes regional ingredients (`Uttarakhand`, `North`, `South`, `East`, `West`, `Pan-India`).
  - **Deficiencies:** Prioritizes foods rich in target nutrients (Iron, Calcium, Vitamin D, Protein).

### 5.3 Generative AI Service (`src/services/aiService.js`)
- **Model:** Google Gemini via OmniRoute gateway (`env.omniRouteModel`, default: `gemini-2.5-flash`).
- **Prompt Engineering:**
  - Injects target nutrient deficiencies found in user's blood report.
  - Injects retrieved IFCT foods with their exact portion sizes and IFCT codes.
  - Formats strict JSON instructions for 7 days (breakfast, lunch, dinner, snack).
  - Enforces mandatory medical disclaimer: *"PoshanAI provides nutrition awareness and food suggestions. It does not diagnose, treat, or replace professional medical advice."*
- **Validation:** Validates that the AI returned foods with valid IFCT codes, calculates exact nutrient sums per portion size, and saves to MongoDB.

---

## 6. Security & Hardening Controls

1. **IP Forwarding Behind Reverse Proxy:** `app.set('trust proxy', 1)` correctly parses client IP behind Nginx.
2. **Brute Force Protection:**
   - 100 requests per 15 min globally.
   - 5 failed login attempts per 15 min per composite key `req.ip:sha256(email)`. Successful logins bypass the penalty.
3. **Session Management:** Refresh tokens stored as SHA-256 hashes with device fingerprints. Supports up to 5 concurrent devices per user with automated session pruning.
4. **Data Isolation:** All database queries for reports and meal plans explicitly enforce `{ userId: req.user._id }`. Client-supplied IDs in bodies cannot alter resource ownership.
5. **Sanitization:** `express-mongo-sanitize` strips `$` and `.` operators to prevent NoSQL injection.
6. **Path Traversal Defense:** `storageService.js` validates all storage keys against strict regex `/^(?:reports|uploads\/reports)\/[a-f\d-]+\.(?:pdf|jpg|png)$/i` and ensures resolved paths stay inside the uploads directory.

---

## 7. Verification & Test Evidence

All 12 backend test suites pass with 100% success:

```text
✔ defines indexed ownership references, requested meal fields, and status (1.2095ms)
✔ validates a seven-day plan and keeps unavailable vitamin B12 nullable (10.7453ms)
✔ rejects a plan that does not cover all seven days (3.3976ms)
✔ extracts report values and flags from a sample Dr Lal, Apollo, and SRL report (8.173ms)
✔ leaves the flag unknown when the report does not provide a reference range (0.4051ms)
✔ parses a table where the observed value and range are on following lines (0.3064ms)
✔ rejects a missing report path with a structured error (caps uploads at 10 MB)
✔ rejects a missing report path with a structured error
✔ provides IFCT records with serving size and preserves unreported vitamin B12 as null (11.0414ms)
✔ filters IFCT records by vegetarian diet, allergy, and Uttarakhand region (0.3039ms)
✔ builds a prompt from validated preferences and includes the required disclaimer provider (0.3787ms)
✔ defines the report ownership index and requested schema fields (0.838ms)

Total: 12 passed, 0 failed.
```
