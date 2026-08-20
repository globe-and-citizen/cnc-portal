# Safe Wallet — User Stories

**Format:** User Story | Acceptance Criteria (tester checklist) | Priority (P1–P5) | Effort
(XS/S/M/L/XL) **Last updated:** 2026-08-20

These stories describe the team **Safe wallet** as it is currently built, plus the one planned
creation-flow step. The acceptance criteria are written as a **testing checklist**: completed
stories document observable behaviour; the pending story is the agreed target behaviour.

### Lifecycle (test in this order)

1. A team exists. Today, the creation wizard can deploy its Investor/Officer contracts, but does
   **not** deploy a Safe automatically.
2. The team owner opens the Safe account. If no Safe is registered, they deploy one manually.
3. The portal calls the Safe Proxy Factory directly, then reads the deployed proxy address from the
   confirmation event.
4. The portal registers the address as the team's `Safe` contract. The Safe account then displays
   its balance, assets, owners, outgoing transactions, and deposits.
5. Safe owners fund it, propose or approve transactions, and execute a transaction once its
   confirmation threshold is reached.
6. Safe owners can add or remove signers and adjust the threshold without leaving the portal.
7. The planned team-creation step deploys and registers the same Safe automatically while keeping
   the manual route available as recovery.

### Terminology

- **Safe:** the team's on-chain multi-signature wallet. It is distinct from the
  **SafeDepositRouter**, which routes eligible investor deposits to a configured Safe.
- **Deployment:** creating the Safe proxy on-chain through `SafeProxyFactory`.
- **Registration:** persisting that proxy address as a `TeamContract` with type `Safe`, so the
  portal can retrieve it for the team.
- **Owner:** a Safe signer. It is not necessarily every team member. A freshly deployed Safe has
  the team owner as its sole signer and a threshold of 1.
- **Confirmation threshold:** the number of Safe-owner approvals required before an eligible
  transaction can be executed.

---

## Status Overview

| User Story  | Title                                                   | Actor       | Status | Priority | Effort |
| ----------- | ------------------------------------------------------- | ----------- | :----: | :------: | ------ |
| US-SAFE-001 | Deploy a team Safe manually                             | Team owner  |   ✅   |    P1    | M      |
| US-SAFE-002 | Register and open the deployed Safe                     | Team owner  |   ✅   |    P1    | S      |
| US-SAFE-003 | View and fund the Safe                                  | Team member |   ✅   |    P1    | M      |
| US-SAFE-004 | Approve and execute Safe transactions                   | Safe owner  |   ✅   |    P1    | L      |
| US-SAFE-005 | Manage Safe owners and the confirmation threshold       | Safe owner  |   ✅   |    P2    | M      |
| US-SAFE-006 | Deploy and register a Safe during team creation         | Team owner  |   ⏳   |    P1    | M      |

> **Status key:** ✅ Done is implemented on `develop`; ⏳ Planned is documented target behaviour,
> not behaviour a tester can expect in the current application.

---

## US-SAFE-001: Deploy a Team Safe Manually

**As a** team owner **I want to** deploy a Safe from my team's Safe account **so that** the team
has an on-chain multi-signature wallet.

**Acceptance Criteria:**

- [x] When a team has no registered Safe, its Safe account shows a "Deploy Team Safe" card instead
      of wallet data.
- [x] Only the connected team owner with a valid wallet address can use "Deploy Safe Wallet"; it is
      disabled for any other connected account and for an archived team.
- [x] The card clearly shows the initial configuration: the connected team owner and threshold
      **1 of 1**.
- [x] Deployment calls `SafeProxyFactory.createProxyWithNonce` through the maintained typed ABI,
      rather than using the Safe SDK to create the proxy.
- [x] The Safe initializer uses the selected owners and threshold, with no module, guard, payment,
      or setup delegate call.
- [x] The deployed proxy address is read from the `ProxyCreation` event in the confirmed
      transaction receipt.
- [x] A missing wallet, invalid owner list, invalid owner address, or threshold above the owner
      count stops the deployment before a valid Safe is reported.
- [x] If the wallet transaction is rejected, registration is not attempted and the portal reports
      transaction approval rejection.
- [x] If the confirmation receipt has no `ProxyCreation` event, the portal reports that it could
      not extract the deployed Safe address.

**Priority:** P1 (Critical) · **Effort:** M · **Status:** ✅ Done · **Dependencies:** deployed Safe
infrastructure for the active network

---

## US-SAFE-002: Register and Open the Deployed Safe

**As a** team owner **I want to** register a deployed Safe with my team **so that** the portal can
open and manage that wallet.

**Acceptance Criteria:**

- [x] After a successful deployment, the portal sends the team id, proxy address, and
      `contractType: "Safe"` to `POST /contract`.
- [x] The registration endpoint validates the request, requires the caller to own the target team,
      and rejects writes for an archived team.
- [x] Registration stores the Safe in the existing team-contract model; it is not attached to an
      Officer deployment.
- [x] Once registration succeeds, the Safe account navigates to the deployed address and displays
      the Safe view.
- [x] If deployment succeeds but registration fails, the portal warns that on-chain deployment
      succeeded while registration failed; team creation is not involved or rolled back.
- [x] The manual deployment card remains the recovery path for teams without a registered Safe.

**Priority:** P1 (Critical) · **Effort:** S · **Status:** ✅ Done · **Dependencies:** US-SAFE-001

---

## US-SAFE-003: View and Fund the Safe

**As a** team member **I want to** view the Safe's balances, assets, and deposits **so that** I can
understand the funds available to the team.

**Acceptance Criteria:**

- [x] The Safe account displays the total balance, local-currency equivalent, Safe address,
      number of required signatures, and owner count.
- [x] The account displays token holdings alongside the balance.
- [x] Users can open a deposit flow for native-token and supported token funding, subject to the
      team write guard.
- [x] The account lists recent incoming native-token, ERC-20, and ERC-721 transfers with sender,
      amount, date, and transaction hash.
- [x] The incoming-transfer view requests at most 50 records at a time.
- [x] The account provides a link to open the same Safe in the Safe application.

**Priority:** P1 (Critical) · **Effort:** M · **Status:** ✅ Done · **Dependencies:**
US-SAFE-002

---

## US-SAFE-004: Approve and Execute Safe Transactions

**As a** Safe owner **I want to** approve and execute Safe transactions from the portal **so that**
the team can move funds according to its multi-signature rules.

**Acceptance Criteria:**

- [x] The Safe account lists transactions with method, recipient, value, execution status,
      transaction hash, and confirmation count.
- [x] Users can filter transactions between all, pending, and executed states; the list is
      paginated.
- [x] A connected account that is not a Safe owner cannot approve, execute, transfer from, or
      change the Safe through the owner-only controls.
- [x] A Safe owner can approve an unexecuted transaction only once.
- [x] A transaction with a stale nonce cannot be approved or executed.
- [x] A transaction becomes executable only after it has at least the Safe's configured number of
      confirmations.
- [x] Executing a transaction refreshes the Safe's information, transaction list, and balances.
- [x] The portal warns before an approval or execution that conflicts with pending transactions.

**Priority:** P1 (Critical) · **Effort:** L · **Status:** ✅ Done · **Dependencies:**
US-SAFE-002, US-SAFE-005

---

## US-SAFE-005: Manage Safe Owners and the Confirmation Threshold

**As a** Safe owner **I want to** manage signers and the confirmation threshold **so that** the
Safe's governance reflects the team that controls it.

**Acceptance Criteria:**

- [x] The Safe account lists each owner and identifies the connected owner.
- [x] A connected Safe owner can open the controls to add a signer, remove a signer, or update the
      confirmation threshold.
- [x] Non-owners cannot use those controls.
- [x] Owner-management transactions use the Safe transaction lifecycle in US-SAFE-004, including
      its confirmation and execution rules.
- [x] After a threshold change, the portal refreshes the Safe information before rendering the new
      required-signature count.

**Priority:** P2 (High) · **Effort:** M · **Status:** ✅ Done · **Dependencies:** US-SAFE-004

---

## US-SAFE-006: Deploy and Register a Safe During Team Creation

**As a** team owner **I want to** receive a Safe while creating a team **so that** a new team does
not start without its treasury wallet.

**Status:** ⏳ Planned — tracked by [#2217](https://github.com/globe-and-citizen/cnc-portal/issues/2217).

**Acceptance Criteria:**

- [ ] After the team and its existing Investor/Officer step are available, the creation wizard
      attempts Safe deployment as part of that flow.
- [ ] The creation flow reuses the deployment mutation from US-SAFE-001; it does not duplicate
      factory or initializer logic in the form.
- [ ] It deploys with exactly one owner, the team owner, and threshold 1.
- [ ] It registers the resulting address through `POST /contract` with `contractType: "Safe"` and
      the new team id.
- [ ] The registered Safe appears in the team's Safe account immediately after successful creation.
- [ ] A deployment or registration failure does **not** roll back the already-created team.
- [ ] The user receives a clear failure state and can use manual deployment afterward.
- [ ] Existing manual Safe deployment and Investor/Officer deployment flows remain functional.
- [ ] Tests cover success, deployment failure, registration failure, and the owner/threshold
      payload.

**Priority:** P1 (Critical) · **Effort:** M · **Status:** ⏳ Planned · **Dependencies:**
US-SAFE-001, US-SAFE-002

---

## How to Use These User Stories

1. **For QA:** run US-SAFE-001 through US-SAFE-005 in lifecycle order. Treat US-SAFE-006 as a
   regression checklist once it is implemented.
2. **For Development:** preserve the separation between deployment, registration, and Safe
   transaction management. A change to the team-creation wizard must reuse the shared deployment
   path.
3. **For Product:** prioritize US-SAFE-006 next; it removes the current gap between team creation
   and Safe availability without removing the manual recovery path.

## Related Documentation

- [SafeDepositRouter contract](../contracts/safe-deposit-router/README.md) — investor deposits
  routed to a Safe; it is not the Safe wallet feature itself.
- [Payroll & Cash Remuneration](../payroll/Readme.md) — payroll funding depends on the Bank and may
  use a team's treasury flows.
- [Roadmap](../../ROADMAP.md) — broader Safe-backed treasury, payroll, and expense-account work.

_[← Back to documentation index](../../README.md)_
