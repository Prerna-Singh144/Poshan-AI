# Security Checklist for Developers

Complete this checklist for every feature or code change that touches the API, user data, authentication, logs, configuration, or file handling. If an item does not apply, mark it N/A and explain why in the pull request.

## Before Opening a Pull Request

- [ ] **Did you protect the route? (Auth)** Every new private API route uses `verifyToken`. Public routes are explicitly identified and documented.
- [ ] **Did you check ownership? (IDOR)** User-scoped queries use the authenticated identity (`req.user._id`) or an equivalent ownership check before returning or changing a resource. Never trust a client-supplied `userId`.
- [ ] **Did you validate input? (Joi)** Every POST/PUT request has a Joi schema, uses `stripUnknown: true`, and rejects invalid input.
- [ ] **Are there any secrets in the code? (No)** Credentials come from server-side environment variables. No real secrets appear in source, examples, frontend `VITE_*` variables, logs, or commits.
- [ ] **Does the response leak PII? (No)** Responses exclude passwords, token hashes, raw OCR text, and unrelated personal or health data.
- [ ] **Are logs free of PII?** Do not log passwords, emails, access/refresh tokens, raw health data, or sensitive error details. Use generic messages and approved redacted metadata.
- [ ] **Are uploads verified?** Check magic bytes/signatures, enforce file and size allowlists, generate safe names, and store files outside public paths.
- [ ] **Are access and abuse controls in place?** Apply authentication, role checks, ownership checks, and rate limits appropriate to the endpoint.
- [ ] **Did you verify the change?** Run relevant tests and checks; record results and any known limitations in the PR.

## Review Rule

Do not submit the PR until every applicable box is checked. Explain any N/A item or unresolved security limitation in the PR description.
