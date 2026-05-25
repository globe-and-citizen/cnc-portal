import express, { Request, Response } from 'express';

/**
 * Sentry tunnel — proxies browser Sentry envelopes through our own backend so
 * that ad-blockers (Brave Shields, uBlock Origin, …) cannot intercept them.
 *
 * Security:
 *  - The fetch destination URL is computed ONCE at startup from the server-side
 *    env var SENTRY_FRONTEND_DSN. Client-supplied data is never used to build
 *    the URL, eliminating any SSRF risk.
 *  - The envelope's project ID is still validated against SENTRY_FRONTEND_PROJECT_ID
 *    to prevent the endpoint from being used as an open proxy for other Sentry orgs.
 *
 * Required env vars:
 *  SENTRY_FRONTEND_DSN          — DSN of the frontend Sentry project
 *  SENTRY_FRONTEND_PROJECT_ID   — project ID extracted from the DSN (optional but recommended)
 *
 * Reference: https://docs.sentry.io/platforms/javascript/troubleshooting/#dealing-with-ad-blockers
 */

// Pre-compute the ingest URL once from trusted server-side config.
// No client input ever reaches URL construction.
const SENTRY_INGEST_URL = (() => {
  const dsn = process.env.SENTRY_FRONTEND_DSN;
  if (!dsn) return null;
  try {
    const { host, pathname } = new URL(dsn);
    if (!host.endsWith('.sentry.io')) return null;
    const projectId = pathname.slice(1); // strip leading '/'
    return `https://${host}/api/${projectId}/envelope/`;
  } catch {
    return null;
  }
})();

const ALLOWED_PROJECT_ID = process.env.SENTRY_FRONTEND_PROJECT_ID ?? null;

const sentryTunnelRoute = express.Router();

sentryTunnelRoute.post(
  '/',
  express.text({ type: '*/*', limit: '5mb' }),
  async (req: Request, res: Response): Promise<void> => {
    if (!SENTRY_INGEST_URL) {
      // Tunnel not configured — fail silently so the app keeps working
      res.status(200).end();
      return;
    }

    try {
      const envelope = req.body as string;

      // Validate the envelope's project ID against our allowed project
      // to prevent forwarding envelopes from other Sentry organisations.
      if (ALLOWED_PROJECT_ID) {
        const header = JSON.parse(envelope.split('\n')[0]) as { dsn?: string };
        if (!header.dsn) {
          res.status(400).json({ error: 'Missing DSN in envelope header' });
          return;
        }
        const projectId = new URL(header.dsn).pathname.slice(1);
        if (projectId !== ALLOWED_PROJECT_ID) {
          res.status(403).json({ error: 'Project not allowed' });
          return;
        }
      }

      // URL is fully server-controlled — no client data in the destination
      await fetch(SENTRY_INGEST_URL, {
        method: 'POST',
        body: envelope,
        headers: { 'Content-Type': 'application/x-sentry-envelope' },
      });

      res.status(200).end();
    } catch {
      // Fail silently — a Sentry outage must never break the app
      res.status(200).end();
    }
  }
);

export default sentryTunnelRoute;
