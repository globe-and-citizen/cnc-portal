// Import with `import * as Sentry from "@sentry/node"` if you are using ESM
import Sentry from "@sentry/node";

Sentry.init({
  dsn: "https://72c5559d0cfcd7e76719dc98a3900caa@o4504664101552128.ingest.us.sentry.io/4510022347653120",
  // Setting this option to true will send default PII data to Sentry.
  // For example, automatic IP address collection on events
  sendDefaultPii: true,
});