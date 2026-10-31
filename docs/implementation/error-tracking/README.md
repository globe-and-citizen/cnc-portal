# Error Tracking

**Status:** Current

**Last verified:** 2026-10-21

**Scope:** Capture actionable frontend and backend failures in Sentry while keeping expected client responses and cancellations out of
exception tracking.

## Consumers

- Backend API controllers and shared HTTP error responses
- Frontend and dashboard consumers of backend API failures
- Sentry backend project and its configured deployment environments

## Runtime Model

```mermaid
flowchart TD
  frontend[Frontend Axios clients] --> frontendDecision{Failure class}
  frontendDecision -->|expected 4xx or cancellation| frontendResponse[Query or mutation error state]
  frontendDecision -->|network, timeout, 429, or 5xx| frontendCapture[Capture frontend exception]
  frontendCapture --> dashboard[Sentry frontend project]
  web3[Wagmi/viem query or mutation] --> web3Decision{Failure class}
  web3Decision -->|user rejection, wrong chain, or missing wallet| web3Response[UI error state]
  web3Decision -->|RPC, receipt, revert, or unexpected failure| web3Capture[Capture Web3 exception]
  web3Capture --> dashboard
  controller[Backend controller] --> decision{Failure class}
  decision -->|4xx or expected limit| response[Sanitized HTTP response]
  decision -->|5xx or unexpected failure| capture[Capture exception with backend tags]
  capture --> response
  capture --> backendDashboard[Sentry backend project]
  uncaught[Unhandled Express error] --> handler[Sentry Express error handler]
  handler --> backendDashboard
```

## Main Flow

Controllers that use `errorResponse()` report failures with a status of `500` or greater before returning the sanitized response.
Controllers with dedicated `5xx` response paths call the same capture helper directly. CoinGecko captures provider and cache failures with
the operation and HTTP status as tags. The Sentry SDK environment is configured at process startup, and the Express Sentry handler remains
the fallback for errors that are not handled by a controller.

The frontend's internal API client and external provider client share the Axios capture helper. Internal API retries are allowed to finish
before one final failure is captured, while external provider failures are captured at the response interceptor. Vue's global error
instrumentation remains responsible for uncaught JavaScript, promise, and Vue component failures. The shared TanStack Query and Mutation
caches capture handled Wagmi/viem failures from reads and mutations; the MutationCache remains a fallback for mutations without a
specialized Web3 boundary. Contract-write and native-transfer mutations mark their boundaries so their handlers capture once with operation,
contract, function, and chain tags before the generic fallback can run.

## Invariants and Failure Behaviour

- Client errors (`4xx`) are not captured as backend exceptions.
- Expected provider rate limits and health-check dependency failures are not reported as repeated exceptions.
- Backend `5xx` events carry the `runtime:backend` tag and the configured Sentry environment.
- Frontend Axios events carry the `runtime:frontend`, `error.source`, `error.operation`, and HTTP status tags.
- Frontend network failures, timeouts, `429`, and `5xx` responses are captured; expected `401`/`404` responses and cancellations are not.
- Wagmi/viem RPC failures, receipt failures, transaction reverts, and unexpected Web3 errors are captured with `runtime:frontend`,
  `error.source:wagmi`, operation, and error-category tags.
- Specialized contract-write and native-transfer boundaries take capture priority over the shared MutationCache, preserving their Web3
  context without removing the original TanStack mutation error.
- Explicit wallet rejections, wrong-chain states, disconnected accounts, and missing wallet providers remain UI states and are not captured
  as Sentry exceptions.
- Authorization headers are removed before Axios errors are sent to Sentry.
- Capture context contains operation, source, and status tags only; request payloads, credentials, and provider connection details are not
  added by the capture helper.
- Sentry tunnel forwarding failures remain silent so telemetry cannot break the application or recursively report its own outage.

## Known Gaps

The tunnel deliberately acknowledges forwarding failures, so a successful browser request to the tunnel does not by itself prove that Sentry
accepted the event. The Sentry dashboard and a controlled smoke test remain required for end-to-end ingestion validation.

Shared transaction boundaries retain the configured application chain. A rejected network target uses the existing chain-mismatch
classification, so it remains an expected wallet condition rather than an unexpected application failure. Session recovery is owned by the
[Authentication network-lock story](../../features/authentication/README.md#us-auth-004-resume-after-a-wallet-network-change).

## Implementation Evidence

**Implementation evidence reviewed against:** `635eb92ec16d0fa5fca930d458b0e35453af94d2`

- [Backend capture helper](../../../backend/src/utils/sentry.ts), [central error response](../../../backend/src/utils/utils.ts), and
  [Sentry initialization](../../../backend/src/instrument.ts)
- [Frontend Axios capture helper](../../../app/src/lib/sentry.ts), [internal API client](../../../app/src/lib/axios.ts), and
  [external API client](../../../app/src/lib/external.axios.ts)
- [Frontend Web3 capture helper](../../../app/src/lib/sentry.ts), [shared Query/Mutation caches](../../../app/src/queries/queryClient.ts),
  [contract-write mutation](../../../app/src/composables/contracts/useContractWritesV3.ts), and
  [native-transfer mutation](../../../app/src/composables/transactions/useSafeSendTransaction.ts)
- [Express Sentry handler registration](../../../backend/src/config/serverConfig.ts)
- [CoinGecko controller](../../../backend/src/controllers/coingeckoController.ts),
  [storage controller](../../../backend/src/controllers/storageController.ts),
  [upload controller](../../../backend/src/controllers/uploadController.ts), and
  [development controller](../../../backend/src/controllers/devController.ts)
- [Capture and response tests](../../../backend/src/utils/__tests__/utils.test.ts) and
  [tunnel tests](../../../backend/src/routes/__tests__/sentryTunnelRoute.test.ts)
- [Frontend Axios capture tests](../../../app/src/lib/__tests__/axios.spec.ts) and
  [external Axios capture tests](../../../app/src/lib/__tests__/external.axios.spec.ts)
- [Frontend Web3 capture tests](../../../app/src/lib/__tests__/sentry.spec.ts)
- [Shared mutation-cache capture tests](../../../app/src/queries/__tests__/queryClient.spec.ts),
  [contract-write boundary tests](../../../app/src/composables/contracts/__tests__/useContractWritesV3.spec.ts), and
  [native-transfer boundary tests](../../../app/src/composables/transactions/__tests__/useSafeSendTransaction.spec.ts)

## Related Documentation

- [Deployment and Sentry environment configuration](../../platform/deployment.md#error-tracking)
- [Shared Market Data Cache](../market-data-cache/README.md)
- [File Storage](../file-storage/README.md)
- [Implementation Documentation Guide](../../platform/implementation-documentation-guide.md)
