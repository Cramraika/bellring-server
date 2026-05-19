// Sentry SDK init for bellring-server (Glitchtip-compatible).
// Wired 2026-05-19 per OW-106 Glitchtip activation (project pid created 2026-05-19;
// reconcile output reported In-sync=10).
// DSN comes from env var SENTRY_DSN, sourced via Infisical path:
//   main-host:/host-page/BELLRING_SERVER_GLITCHTIP_DSN
// Must be required FIRST in server.js, before other instrumentation.

const Sentry = require('@sentry/node');

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'production',
    release: process.env.SENTRY_RELEASE || undefined,
    tracesSampleRate: 0,
    // Glitchtip ignores some advanced features; keep init minimal.
  });
} else {
  // Silent no-op when DSN absent (local dev, CI). Sentry calls become safe no-ops.
  console.warn('[sentry] SENTRY_DSN not set — error reporting disabled.');
}

module.exports = Sentry;
