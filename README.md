# Bellring — Server

**Bellring** is a whitelabel SaaS for sales-team celebration notifications — the sales-floor
bell-ringing ritual, online: closing a deal fires unmissable, team-wide popups. This repo is the
**backend half** (`bellring-server`); the browser surface lives in the paired
[`bellring-extension`](https://github.com/Cramraika/bellring-extension) repo.

It is a *Node.js / Express* application that:

- receives CRM webhooks (currently LeadSquared) and broadcasts them to connected extension
  clients in real time over *WebSocket*,
- issues OTP-based authentication (email OTP → **JWT** token), and
- sends OTP emails via *SendGrid*.

> **Reference customer:** the live deployment serves ~300 Business Development Executives (BDEs)
> at **Coding Ninjas**, with the OTP allowlist scoped to `@codingninjas.com`. The whitelabel /
> multi-tenant pivot is tracked in `CLAUDE.md` (Roadmap).

The backend is deployed on **Render** (`https://sales-notification-backend.onrender.com`),
auto-deploying on `main` push via the `Procfile`. (Bellring-branded URL pending domain choice.)

## Features

- **Real-Time Notifications**
  - Receives webhook payloads at `/webhook` and broadcasts them to connected clients via WebSocket.
  - Supports three notification types:
    - **`sale_made`** — sale notifications with BDE name, product, and manager name.
    - **`notification`** — general announcements.
    - **`private`** — private messages targeted to a specific user (by email).
- **User Authentication**
  - Generates and sends OTPs to `@codingninjas.com` emails (`/request-otp`).
  - Verifies OTPs and issues a signed **JWT** token (`/verify-otp`).
- **Security**
  - Webhook endpoint secured with a **Bearer token** (`WEBHOOK_TOKEN`).
  - API endpoints and WebSocket connections secured with **JWT** authentication.
  - **CORS** and WebSocket origin validation restricted to the Chrome extension's origin.
  - **Rate limiting** on API endpoints and per-IP WebSocket connection limiting.

## Files

| File           | Description                                                          |
|----------------|---------------------------------------------------------------------|
| `server.js`    | Main backend application — Express, WebSocket, API endpoints (single-file monolith). |
| `package.json` | Dependencies and scripts.                                           |
| `Procfile`     | Render deployment entrypoint (`web: node server.js`).               |
| `.env.example` | Template for environment variables (copy to `.env` for local dev — never committed). |

## Dependencies

- **`express`** — web framework.
- **`ws`** — WebSocket library for real-time communication.
- **`@sendgrid/mail`** — SendGrid client for sending OTP emails.
- **`jsonwebtoken`** — signs and verifies JWT auth tokens.
- **`cors`** — CORS middleware with origin restrictions.
- **`express-rate-limit`** — API rate limiting.
- **`@sentry/node`** — error reporting.
- **`dotenv`** — loads environment variables from `.env` (local development).

## Setup

### Prerequisites

- **Node.js** ≥ 16 (CI runs on Node 20).
- A **SendGrid** account with an API key (for OTP emails).
- A **LeadSquared** account (or other CRM) to send webhook notifications.
- A **Render** account for deployment (optional for local dev).

### Local Development

1. **Clone:**
   ```bash
   git clone https://github.com/Cramraika/bellring-server.git
   cd bellring-server
   ```
2. **Install:**
   ```bash
   npm install
   ```
3. **Configure environment** — copy `.env.example` to `.env` and fill in:
   - **`SENDGRID_API_KEY`** — your SendGrid API key.
   - **`WEBHOOK_TOKEN`** — secure token for CRM webhook authentication.
   - **`EXTENSION_ID`** — your Chrome extension ID (for CORS).
   - **`JWT_SECRET`** — secret used to sign/verify JWT tokens.
   - **`PORT`** — port to run on (default `3000`).
4. **Run:**
   ```bash
   npm start      # production
   npm run dev    # with nodemon (auto-reload)
   ```
   The server listens on `http://localhost:3000`.

### Deployment on Render

The repo auto-deploys on `main` push via the `Procfile` (`web: node server.js`). Set the same
environment variables (`SENDGRID_API_KEY`, `WEBHOOK_TOKEN`, `EXTENSION_ID`, `JWT_SECRET`, `PORT`)
in the Render service's **Environment** tab.

### Configure the CRM Webhook (LeadSquared)

Point your CRM webhook at:

- **URL:** `https://sales-notification-backend.onrender.com/webhook`
- **Method:** POST
- **Headers:** `Authorization: Bearer <WEBHOOK_TOKEN>`, `Content-Type: application/json`
- **Payload examples:**
  ```json
  { "type": "sale_made", "bdeName": "Jane Doe", "product": "Job Bootcamp", "managerName": "Sales Team" }
  ```
  ```json
  { "type": "notification", "message": "Team meeting at 3 PM" }
  ```
  ```json
  { "type": "private", "email": "user@codingninjas.com", "message": "Submit your report" }
  ```

## API Endpoints

### `POST /request-otp`
Generates and sends an OTP to a `@codingninjas.com` email.
- **Body:** `{ "email": "user@codingninjas.com" }`
- **Responses:** `200` OTP sent · `400` invalid email · `500` send failure.

### `POST /verify-otp`
Verifies the OTP and returns a signed JWT token.
- **Body:** `{ "email": "user@codingninjas.com", "otp": "123456" }`
- **Responses:** `200` `{ "token": "<jwt>", ... }` · `400` invalid/expired OTP.

### `POST /webhook`
Receives CRM notifications and broadcasts them to WebSocket clients.
- **Headers:** `Authorization: Bearer <WEBHOOK_TOKEN>`
- **Responses:** `200` received · `400` missing `type` · `401` unauthorized.

### `GET /health`
Health check.

### `GET /ping`
Keepalive (keeps the Render free-tier instance awake). Returns `{ "status": "alive" }`.

### `GET /stats`
Admin-only connection/notification stats (Bearer-gated).

## WebSocket

- **URL:** `wss://sales-notification-backend.onrender.com/ws?token=<jwt>`
- **Auth:** requires a `token` (JWT) query parameter, obtained from `/verify-otp`.
- **Messages:** the client sends `{ "type": "ping" }` periodically and receives `{ "type": "pong" }`;
  the backend broadcasts `/webhook` payloads (`sale_made`, `notification`, `private`).

## Security Features

- **JWT authentication** — API endpoints and WebSocket connections require a JWT issued by `/verify-otp`.
- **Webhook authentication** — `WEBHOOK_TOKEN` sent as `Bearer <WEBHOOK_TOKEN>`.
- **CORS / origin validation** — restricted to `chrome-extension://${EXTENSION_ID}`.
- **Rate limiting** — API endpoints limited to 100 requests per IP per 15 minutes; WebSocket
  connections limited per IP.
- **Environment variables** — all secrets supplied via env vars, never hardcoded.

## Limitations

- OTPs are stored in-memory and lost on restart; tokens are file-backed (`tokens.json`). A database
  (e.g. Postgres) is planned for the multi-tenant pivot — see `CLAUDE.md` Roadmap.
- Rate limiting is IP-based, which may affect users behind shared/corporate IPs.

## License

Proprietary — © 2026 Vagary Labs. All rights reserved. See [LICENSE](LICENSE).
