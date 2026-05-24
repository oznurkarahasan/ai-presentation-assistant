# Changelog - May 25, 2026

## Branch
- **Name:** `72-fix-about-security`
- **Base Comparison:** `main...HEAD`
- **Scope:** Security hardening — partial fix of CRITICAL and HIGH severity vulnerabilities identified in a full security audit. This report covers the first 4 fixes applied; 3 HIGH severity issues remain pending.

## Change Summary
- **4 files changed**
- **+20 insertions / -5 deletions**
- Major delivery areas:
  - WebSocket authentication enforcement (backend + frontend)
  - JWT token removed from browser console logs
  - SQLAlchemy SQL logging gated to development environment
  - HTTP security headers added to all frontend responses

## Backend Updates

### 1. SQLAlchemy `echo` Gated to Development (`backend/app/core/database.py`)
- `echo=True` was hardcoded, causing all SQL queries and bind parameters to be written to logs in every environment.
- Changed to `echo=settings.ENV.lower() in ("development", "dev")` so SQL logging is active only in development.
- No behavior change in the current dev environment; in production (`ENV=production`) SQL logs are suppressed.

### 2. WebSocket Authentication Enforcement (`backend/app/api/v1/orchestration.py`)
- The WebSocket endpoint previously accepted connections regardless of whether a valid token was provided. Any unauthenticated client could connect and receive live presentation data.
- Added an early rejection block: if `resolve_user_id_from_token` returns `None`, the connection is accepted and immediately closed with code `4001` (Unauthorized), and a warning is logged.
- Authenticated users are unaffected — their token is resolved and the connection proceeds normally.

## Frontend Updates

### 3. JWT Token Removed from Console Log (`frontend/app/presentation/[id]/page.tsx`)
- The WebSocket URL — which includes the JWT access token as a query parameter (`?token=...`) — was being passed directly to `console.log` on every connection attempt.
- Since the WebSocket handshake is an HTTP GET request, the token was also being captured in backend access logs.
- Changed the log message to reference only `presentationId` and `host`, keeping the token out of all logs.
- Additionally, the `onclose` handler was updated to intercept close code `4001`: instead of attempting to reconnect (which would have caused an infinite retry loop), it now redirects the user to `/login`.

### 4. HTTP Security Headers (`frontend/next.config.js`)
- No security headers were previously set. Added a `headers()` function to `nextConfig` that applies the following headers to all routes:

| Header | Value | Protection |
|---|---|---|
| `X-Frame-Options` | `DENY` | Prevents clickjacking by blocking the app from being embedded in third-party iframes |
| `X-Content-Type-Options` | `nosniff` | Prevents MIME type sniffing by the browser |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limits referrer information sent to third-party origins |
| `Permissions-Policy` | `camera=(), microphone=(self), geolocation=()` | Blocks camera and geolocation access; restricts microphone to this origin only (required for presentation recording) |

## Security Audit Summary

| # | Vulnerability | Severity | Status |
|---|---|---|---|
| H1 | JWT token visible in WebSocket URL console log | HIGH | Fixed |
| H2 | WebSocket endpoint accepted unauthenticated connections | HIGH | Fixed |
| H6 | SQLAlchemy `echo=True` logged all SQL queries in production | HIGH | Fixed |
| M6 | HTTP security headers missing | MEDIUM | Fixed |
| H4 | No rate limiting on `/login` and `/forgot-password` | HIGH | Pending |
| H3 | Password reset token remains valid after use (60 min window) | HIGH | Pending |
| H5 | Uploaded files publicly accessible without authentication | HIGH | Pending |
