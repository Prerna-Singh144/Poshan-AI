## Summary

-

## Checklist

- [ ] I read the relevant project context and followed existing conventions.
- [ ] I tested the affected behavior locally or described why it could not be tested.
- [ ] I updated documentation and configuration where needed.
- [ ] I checked that no secrets or unrelated changes are included.
- [ ] I am ready for review; this PR is not self-merged.

## Security Checklist (Required)

- [ ] **Auth:** Every new API route uses `verifyToken`, or is explicitly marked and documented as public.
- [ ] **IDOR:** Every user-owned resource query scopes by `req.user._id` or verifies ownership before access or mutation.
- [ ] **Validation:** Every POST/PUT request uses Joi validation with `stripUnknown: true`.
- [ ] **Secrets:** No secrets are hardcoded, committed, or exposed through frontend variables or browser bundles.
- [ ] **PII:** Logs and API responses do not expose passwords, tokens, emails, or health data unnecessarily.
- [ ] **Uploads:** Uploaded content is checked by magic bytes/signatures and size limits; files remain private.
- [ ] **Verification:** I ran relevant tests and security checks, or explained why they could not be run.
