import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  // Tag every event with the runtime environment so prod/staging/dev
  // errors can be filtered independently in the Sentry dashboard.
  environment: process.env.NODE_ENV ?? 'development',
  // Sample 10% of backend transactions for distributed tracing.
  // Must be > 0 to link frontend traces to backend spans.
  tracesSampleRate: 0.1,
  // Setting this option to true will send default PII data to Sentry.
  // For example, automatic IP address collection on events.
  sendDefaultPii: true,
});
