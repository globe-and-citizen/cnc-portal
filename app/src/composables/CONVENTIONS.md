# Mutation composable conventions

The default shape for any write-side composable in this app is:

1. **A pure async function** that does the work (RPC calls, validation, transforms). No Vue scope, no toasts, no query invalidation. Trivially unit-testable.
2. **A TanStack `useMutation` wrapper** that exposes `mutateAsync`, `isPending`, `error`, `data`, plus opinionated side effects (basic toast + narrow invalidation).
3. **Optional orchestrator composables** that compose wrappers into multi-step flows (e.g. `useOfficerRedeploy`) and own flow-level state, toasts, and invalidation.

Canonical examples:

- `app/src/composables/contracts/useOfficerDeployment.ts` — `deployOfficer()` + `useDeployOfficer()`
- `app/src/composables/investor/useShareholderMigration.ts` — `migrateShareholders()` + `useMigrateShareholders()` + `InconsistentSupplyError`
- `app/src/composables/contracts/useOfficerRedeploy.ts` — orchestrator over the two above + `useCreateOfficerMutation`

The rules below are the **review-time checklist**. The longer rationale lives in [#1776](https://github.com/globe-and-citizen/cnc-portal/issues/1776).

---

## 1. Toast ownership

> Wrappers toast **low-level atomic outcomes**. Orchestrators / call sites toast **business-flow outcomes**.

- A wrapper's `onSuccess` may emit a short success toast describing its own effect (e.g. `"Officer contract deployed successfully"`).
- A wrapper's `onError` should **not** toast. Leave the error on `mutation.error` so callers can render it inline (UAlert) or react with `classifyError` + a contextual toast.
- When composing wrappers in an orchestrator, **silence the wrapper toasts** that would duplicate the orchestrator's own outcome toast. Use the wrapper's `options.onSuccess` / `options.onError` overrides, or pass `options.silent: true` if available.
- Review check: _"For any user-facing action, exactly one toast per logical outcome — never two."_

## 2. Invalidation ownership

> Wrappers invalidate **only the query keys strictly scoped to their own effect**. Orchestrators flush everything at the end.

- A wrapper that deploys a contract may invalidate the contracts list. It should **not** also invalidate team detail / team list keys that downstream steps will hit anyway.
- Orchestrators call a single `invalidateOfficerQueries()` (or equivalent) at the end of the workflow.
- Wrappers used inside orchestrators should accept `options.skipInvalidation: true` so the caller can opt out cleanly.
- Use the key factories (`teamKeys`, `contractKeys`, …) — string-literal keys silently miss when the schema changes.

## 3. Workflow state belongs to the orchestrator

- Per-mutation state (`isPending`, `data`, `error`) lives in TanStack, never duplicated in a local `ref`.
- Cross-call state (addresses to retry with, "we are between step 2 and step 3" flags) lives in the orchestrator as plain `ref`s.
- Derive whatever you can: `isRunning = a.isPending || b.isPending || c.isPending`, `failedAt = computed(() => firstWithError)`. Manual refs only for genuinely multi-call state.

## 4. Side-effect contract header

Every wrapper file declares its side-effect contract at the top:

```ts
/**
 * Side effects:
 *   - onSuccess: success toast "<message>", invalidates [<keys>]
 *   - onError:   no toast (caller renders mutation.error via UAlert)
 * Invalidation: <which keys, and why these specifically>
 * Options:     onSuccess? / onError? / skipInvalidation? — set when composing
 *              inside an orchestrator to avoid double-firing effects.
 */
```

Callers reading this header should know, without opening `onSuccess`, what they have to suppress or extend.

## 5. Typed errors

- Recoverable / actionable failures should be thrown as `class extends Error` subclasses (e.g. `InconsistentSupplyError`). Plain `new Error("msg")` is fine for "this is just an RPC failure" cases.
- **Never catch-and-rethrow a typed error as a plain `Error`.** Preserve the chain: `throw new WrapperError(msg, { cause: originalTypedError })`.
- Consumers that branch on type should use `instanceof` — never message string matching.
- Every typed error class needs a regression test proving `mutation.error.value instanceof TypedError` survives the wrapper. See `app/src/composables/investor/__tests__/useShareholderMigration.pipeline.spec.ts`.

## 6. Throw vs return

> Throw for conditions that require user intervention or are unrecoverable in this run (inconsistent state, RPC failure, user rejection). Return a discriminated `kind` for outcomes that completed without needing a transaction (`noop-empty`, `noop-already-migrated`).

When adding a new outcome, decide which side it belongs on against this rule **before** writing the code path.

## 7. Argument plumbing

- Pure function signatures stay strict and narrow: `Address`, `bigint`, never `Ref<Address>`. Refs are unwrapped at the call site.
- TanStack's `mutateAsync` argument is typed from the pure function — keep it that way so a ref leaking in becomes a tsc error.

---

## Review checklist

Before merging a PR that touches a mutation wrapper or orchestrator:

- [ ] Each call path emits at most one toast per logical action.
- [ ] Each wrapper invalidates only its own keys; the orchestrator owns the final flush.
- [ ] No string-literal query keys — only key factories.
- [ ] Wrapper file has the side-effect contract header (§4).
- [ ] New typed errors come with an `instanceof`-survives-pipeline test.
- [ ] Pure-function argument types are not `Ref<…>`.
