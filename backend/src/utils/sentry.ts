import * as Sentry from '@sentry/node';

export type BackendErrorContext = {
  operation?: string;
  source?: string;
  status?: number;
};

/** Capture server failures without exposing request payloads or credentials. */
export const captureBackendException = (
  error: unknown,
  context: BackendErrorContext = {}
): void => {
  Sentry.withScope((scope) => {
    scope.setTag('runtime', 'backend');
    if (context.source) scope.setTag('error.source', context.source);
    if (context.operation) scope.setTag('error.operation', context.operation);
    if (context.status !== undefined) scope.setTag('http.status_code', String(context.status));

    if (error instanceof Error) {
      Sentry.captureException(error);
      return;
    }

    Sentry.captureMessage(typeof error === 'string' ? error : 'Unknown backend error', 'error');
  });
};
