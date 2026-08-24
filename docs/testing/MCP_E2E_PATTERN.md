# MetaMask-free, MCP-driven E2E testing for a Web3 dApp

**What this is:** a testing pattern with two parts: (1) a fake wallet that
lets browser automation drive a crypto-wallet-connected web app without a
real MetaMask extension, and (2) a methodology for having an AI agent
manually click through the app via that fake wallet, the way a human QA
tester would, instead of writing scripted test code.

Some background for readers unfamiliar with this stack:

- **dApp** ("decentralized app"): a web app that talks to a blockchain. Users
  authorize actions (logging in, sending money, signing approvals) through a
  **wallet** — normally a browser extension like MetaMask — instead of a
  username/password.
- **wagmi**: a widely-used TypeScript library that gives a web app hooks for
  wallet connection, account state, and contract calls. It talks to wallets
  through a **connector** — a pluggable adapter, one per wallet type (a
  MetaMask connector, a WalletConnect connector, etc.).
  [wagmi connector docs](https://wagmi.sh/core/api/connectors).
- **viem**: a lower-level TypeScript library for signing and sending
  Ethereum transactions directly, without a browser wallet.
- **EIP-1193**: the standard interface every Ethereum wallet implements
  under the hood — a single `request({ method, params })` function that
  handles calls like "give me the account," "sign this message," "send this
  transaction."
- **Hardhat**: a local Ethereum blockchain you run on your own machine for
  development/testing — fast, free, fully disposable.
- **SIWE** ("Sign-In with Ethereum") / **EIP-712**: standards for logging in
  or authorizing an action by cryptographically signing a structured message
  with your wallet, instead of a password.
- **Playwright MCP**: an MCP (Model Context Protocol) server that exposes
  browser-automation tools — navigate, click, type, read the page — to an AI
  agent, so the agent can drive a real browser turn by turn.

## 1. The problem

The conventional way to E2E-test a wallet-connected dApp is to automate the
wallet extension itself, using a tool like
[Synpress](https://synpress.io/) (Playwright + real MetaMask extension
automation). That approach carries real costs:

- Tight version coupling between Playwright and Synpress — the two have to
  be pinned to matching compatible releases.
- MetaMask's own extension UI intercepts automated clicks during setup,
  making the initial cache/setup step flaky.
- Every wallet interaction (connect, sign, switch network) round-trips
  through real extension popup UI — slow and brittle to script reliably.
- It's still a fixed, scripted test suite — useful for regression, but
  nobody is going to write a Playwright script per edge case just to
  *explore* whether a feature behaves correctly.

The idea behind this pattern: what if an AI agent could just click through
the app's real UI like a human tester — reading what's on screen, deciding
what to try next, reasoning about whether the result looks right — without
a human needing to babysit a MetaMask popup for every single signature?

## 2. The fix: an in-browser mock wallet connector

Instead of automating the real wallet extension, swap out the wallet
connector itself, but only in test builds. A tiny wagmi connector backed by
a viem local account stands in for MetaMask — no browser extension involved
at all:

```ts
const E2E_PRIVATE_KEY: Hex = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
// Hardhat's well-known account #0 — public test key, safe to commit.

export function e2eMockConnector() {
  const account = privateKeyToAccount(E2E_PRIVATE_KEY)
  return createConnector((config) => ({
    id: 'e2e-mock',
    name: 'E2E Mock Wallet',
    type: 'mock',
    async connect({ chainId }) { /* returns the account immediately, no popup */ },
    async getProvider() {
      return {
        // Implements the same request(method, params) shape a real
        // wallet's EIP-1193 provider exposes — the app can't tell the
        // difference.
        async request({ method, params }) {
          switch (method) {
            case 'eth_requestAccounts': return [account.address]
            case 'personal_sign': /* signs locally with viem, no popup */
            case 'eth_signTypedData_v4': /* signs locally with viem, no popup */
            case 'eth_sendTransaction': /* builds a viem walletClient and sends it directly to the chain */
            case 'wallet_switchEthereumChain': return null
          }
        }
      }
    }
    // ...
  }))
}
```

Registered only in test builds, alongside the real connector used everywhere
else:

```ts
const isE2E = import.meta.env.VITE_E2E === 'true'
export const config = createConfig({
  connectors: isE2E ? [e2eMockConnector()] : [injected() /* MetaMask, etc. */],
  // ...
})
```

Key properties of this approach:

- It's gated behind a build-time flag (`VITE_E2E=true`), wired to a
  dedicated dev script (e.g. `VITE_E2E=true vite`). Regular dev and
  production builds never include this code path.
- Login (SIWE), structured-data signing (EIP-712 — approvals, gasless
  flows), and plain transactions (`eth_sendTransaction`) all work
  identically to a real wallet from the app's point of view. The app code
  under test has no idea it isn't talking to MetaMask — it's just another
  EIP-1193 provider.
- The private key is Hardhat's public, well-known test account #0 — worth
  nothing on any real network, safe to commit to source control.
- `eth_sendTransaction` is the part that matters most: it's what lets write
  flows (creating records, sending funds, signing approvals) actually
  execute against a real local test chain, not just render forms and stop.

The practical effect: driving the wallet stops being a problem at all. The
agent (or any Playwright script) just clicks the app's normal "Connect
Wallet" button; the mock connector auto-approves, and every signature or
transaction after that happens silently in-process, no popup to click
through.

## 3. The methodology: an AI agent as an interactive tester

This is a second, separate track from a conventional scripted E2E suite. An
agent with browser-automation tools (via Playwright MCP) is pointed at the
running app — real frontend, real local chain, real backend — and drives it
turn by turn: navigate, click, read the rendered page, decide what to do
next, exactly like a person manually testing a feature, but able to narrate
findings and cross-reference source code live as it goes.

To make repeat runs (and handoffs to someone else, human or agent) useful
instead of one-off, each testing session should produce durable artifacts,
one set per feature area, numbered in the order they get built out:

- **`NN-<feature>.md`** — a *script*: preconditions, numbered steps, the
  stable selectors to target, and the expected result at each step. Written
  like a manual test case a human QA engineer would follow.
- **`NN-<feature>.results-YYYY-MM-DD.md`** — a *run log*: what actually
  happened during a specific run, including any deviations from the script.
- **`known-issues.md`** — a running bug log, cross-referenced back to the
  run logs. Each entry records where in the code the bug lives, how it was
  found, the root cause (often down to the exact line), a suggested fix,
  and the real-world impact.

This scales well: a dozen-plus feature areas — account/entity setup, several
different transaction-bearing flows, member/permission management,
governance actions, and so on — can each get their own numbered script
without the set becoming unmanageable, since each file is self-contained and
the running `known-issues.md` is the only cross-cutting index.

**Two non-obvious gotchas surfaced by this pattern, worth knowing for any
SPA + mock-wallet setup:**

1. **Session-lock after a hard navigation.** The mock connector's connected
   state lives only in memory (it's just a JS object), while the app's own
   "am I logged in" flag typically persists in `localStorage`. A full page
   navigation or reload leaves the app thinking it's still logged in while
   the wallet has actually reset to disconnected — which can trip a
   "session expired/locked" screen. Fix: after the first login, navigate by
   clicking in-app links/buttons (client-side routing) rather than issuing
   a fresh browser navigation. This applies to any single-page app paired
   with an in-memory mock wallet, regardless of framework.
2. **Reaching a page with no clickable entry point** (e.g. a sub-page that
   only renders conditionally) — instead of a full navigation, trigger a
   client-side route change directly: call `history.pushState(...)` and
   then dispatch a `popstate` event. Client-side routers (Vue Router, React
   Router, etc.) react to `popstate` the same way they react to a real link
   click, so this avoids the reload-triggered session-lock issue above.

## 4. What it finds, in practice

Because an agent is actually reading the rendered UI and reasoning about
whether it looks correct — not just asserting that a fixed selector exists —
it catches bugs a scripted suite typically wouldn't have been written to
check for in the first place. As a worked example, applying this pattern to
a real dApp under active development surfaced bugs like:

- A backend API endpoint that started permanently failing for a given
  account the instant one particular action was taken on it — traced to
  server code calling a smart-contract function under its old, pre-rename
  name (a straightforward but very easy to miss "ABI/call-site drifted out
  of sync with a contract change" bug).
- Several frontend data-reading functions calling nonexistent contract
  functions the same way — silently emptying a whole feature's list views
  on every account, with no visible error to the user. Found, root-caused,
  fixed, and **re-verified live in the same session**, end to end.
- A "Deploy" button that was a complete silent no-op: no network request,
  no console output, no state change at all — not a slow or partially
  broken success path, just nothing. The kind of bug that's easy to miss
  with a scripted assertion that only checks "the button is clickable."
- A form whose default values silently went stale if a user took more than
  a couple of minutes to fill it out, overwriting a value the user had
  explicitly set, with no warning shown.
- A modal that let a user submit an amount over their allowed cap, wasting
  a transaction on a guaranteed on-chain rejection instead of catching it
  client-side with a clear error.

Several of these were fixed and then immediately re-verified against the
running app in the same session — the same interactive loop that found the
bug also confirmed the fix, live, with no separate manual QA pass required.

## 5. What generalizes across stacks

The reusable core of this pattern isn't tied to any one app's features or
even to this exact tech stack:

1. **The mock-connector pattern itself.** Any wallet SDK with a pluggable
   connector/provider abstraction (wagmi, RainbowKit, web3-onboard, or even
   a hand-rolled EIP-1193 provider) can swap in a local-signer-backed mock
   provider behind a build-time flag. The wagmi/viem version shown here is
   one concrete implementation; the same idea ports to other frameworks and
   to non-Ethereum-chain equivalents.
2. **The env-gating convention** — a build-time flag plus a dedicated dev
   script — so the mock path can never leak into a real build.
3. **The AI-agent-driven manual-suite methodology**: numbered script files +
   dated run logs + a running known-issues log. This part is entirely
   stack-agnostic, and arguably the more novel/reusable half of the pattern —
   it's a lightweight way to get an AI agent doing exploratory QA against a
   real running app without writing a single line of test framework code.
4. **The SPA navigation gotchas** (in-memory mock state vs. persisted auth
   state, the `pushState`/`popstate` workaround) — these generalize to any
   single-page app paired with an in-memory-state mock wallet.

Carry a clear, unmissable disclaimer wherever this pattern is used: the
private key involved is a publicly known, funds-free local test-chain
account, and the whole approach is strictly for local/test chains — never
anything holding real value.

## 6. Suggested repo layout

- `README.md` — the pitch: "test your dApp with an AI agent driving a real
  browser, without automating MetaMask."
- `mock-connector/` — a wagmi (and maybe a generic EIP-1193) reference
  implementation, trimmed to the RPC methods that matter, with comments
  explaining each case.
- `docs/methodology.md` — the numbered-script + dated-results + known-issues
  convention, with a small worked example.
- `docs/gotchas.md` — session-lock, the `pushState`/`popstate` trick, and any
  other SPA-specific traps.
- `examples/` — a minimal example dApp (or a fork of a well-known one) wired
  up end-to-end, so someone can clone it and try the pattern in five
  minutes.
