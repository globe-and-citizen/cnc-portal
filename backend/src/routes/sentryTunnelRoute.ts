import express, { Request, Response } from 'express';

const sentryTunnelRoute = express.Router();

/**
 * Sentry tunnel — proxies browser Sentry envelopes through our own backend so
 * that ad-blockers (Brave Shields, uBlock Origin, …) cannot intercept them.
 *
 * Security:
 *  - Only forwards to hosts ending in `.sentry.io`.
 *  - Only forwards envelopes whose DSN project ID matches
 *    SENTRY_FRONTEND_PROJECT_ID (prevents using this endpoint as an open
 *    proxy for other Sentry organizations).
 *
 * The body is received as raw text because Sentry envelopes use the
 * `application/x-sentry-envelope` content-type (newline-delimited JSON).
 *
 * Reference: https://docs.sentry.io/platforms/javascript/troubleshooting/#dealing-with-ad-blockers
 */
sentryTunnelRoute.post(
  '/',
  express.text({ type: '*/*', limit: '5mb' }),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const envelope = req.body as string;
      const header = JSON.parse(envelope.split('\n')[0]) as { dsn?: string };

      if (!header.dsn) {
        res.status(400).json({ error: 'Missing DSN in envelope header' });
        return;
      }

      const { host, pathname } = new URL(header.dsn);

      // Guard: only proxy to Sentry's own ingest infrastructure
      if (!host.endsWith('.sentry.io')) {
        res.status(400).json({ error: 'Invalid DSN host' });
        return;
      }

      // Guard: only proxy for our own frontend Sentry project
      const projectId = pathname.slice(1); // strip leading '/'
      const allowedProjectId = process.env.SENTRY_FRONTEND_PROJECT_ID;
      if (allowedProjectId && projectId !== allowedProjectId) {
        res.status(403).json({ error: 'Project not allowed' });
        return;
      }

      await fetch(`https://${host}/api/${projectId}/envelope/`, {
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
