# Project Structure

PoshanAI is maintained as a small monorepo. Keep application code in the owning app, shared operational configuration at the repository root, and contributor documentation under `docs/`.

```text
.
├── poshanai-frontend/       # React 18 + Vite browser application
├── poshanai-backend/        # Express API, MongoDB models, jobs, and tests
├── ai-service/              # Reserved extension points for OCR, RAG, and pose services
├── nginx/                   # Reverse proxy configuration
├── docs/
│   ├── architecture/        # System and implementation references
│   ├── SECURITY_CHECKLIST.md
│   └── PROJECT_STRUCTURE.md
├── .github/                 # Pull request guidance and CI workflows
├── docker-compose.yml       # Local multi-service development
├── docker-compose.prod.yml  # Production-oriented container topology
└── AI_CONTEXT.json          # Repository-grounded contributor context
```

## Conventions

- Keep generated build output (`dist/`), installed dependencies (`node_modules/`), runtime logs, and local `.env` files out of source control.
- Keep real environment values local or in the deployment secret store. Commit only `.env.example` templates.
- Treat `.worktrees/` as local Git checkouts. It is not an application source directory; each worktree has its own branch and repository state.
- Store durable contributor and architecture documentation in `docs/`, grouped by topic.
- Keep frontend and backend dependencies in their respective app manifests. The root manifest is for repository-level scripts only.
- Avoid moving modules across frontend/backend boundaries unless their runtime and ownership genuinely change; each app already uses feature-appropriate `src/` layers.
