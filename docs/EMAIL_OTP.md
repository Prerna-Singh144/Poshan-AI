# Email OTP API

Import `docs/postman/PoshanAI-Email-OTP.postman_collection.json` into Postman.

Set the collection variables `baseUrl` and `email`, then set `purpose` to one of:

- `login`
- `reset-password`
- `verify-email`

Run **Request OTP**, then **Verify OTP**. In development, the request test captures `dev_otp` automatically. In production, enter the code received by email. For password reset, verify the code first, then run **Complete Password Reset**; the reset token is single-use and expires after ten minutes.

The API returns a generic request response whether or not an eligible account exists. OTP records contain only a bcrypt hash, expire after `OTP_EXPIRY_MINUTES` (default 5), and are limited to `OTP_MAX_ATTEMPTS` (default 3) incorrect attempts. OTP routes are rate-limited to five requests per IP per 15 minutes.

For local delivery, configure `GMAIL_USER` and a Gmail app password in `GMAIL_PASS`. Production uses Resend and requires `RESEND_API_KEY` and a verified sender configured as `RESEND_FROM`. Never commit `.env` values.
