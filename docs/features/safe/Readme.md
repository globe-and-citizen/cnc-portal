# Safe Wallet — User Stories

The Safe is the team's shared multi-signature wallet. It is where the team holds funds and where
Safe owners jointly approve actions.

**How to read this document:** follow the stories in the same order as the Safe account: setup,
overview, funds and control, then activity. Each story says who can perform the action, what they
can do, and what must happen for it to succeed.

### What the Safe feature lets a team do

1. **Set up a Safe** by deploying a new wallet or importing an existing one.
2. **See Safe details**: balance, tokens, address, owners, threshold, and deposits.
3. **Manage funds** by depositing assets and transferring assets from the Safe.
4. **Manage signers and threshold** so the right people control the wallet.
5. **Manage transactions**: follow, approve, and execute the team's pending actions.

### Key words

- **Safe owner / signer:** a wallet address allowed to approve Safe transactions. A team member is
  not automatically a Safe owner.
- **Threshold:** the number of signer approvals required before a Safe transaction can execute.
- **Deploy:** create a brand-new Safe wallet for the team.
- **Import:** attach an already-deployed Safe to the team. Importing does not change that Safe's
  owners, threshold, assets, or on-chain configuration.

---

## Status Overview

| User Story  | What the user can do                          | Main actor          | Status | Priority |
| ----------- | --------------------------------------------- | ------------------- | :----: | :------: |
| US-SAFE-001 | Set up a Safe: deploy a new one or import one | Team owner          |   ✅   |    P1    |
| US-SAFE-002 | Display Safe details                          | Team member         |   ✅   |    P1    |
| US-SAFE-003 | Manage funds: deposit and transfer            | Team owner / signer |   ✅   |    P1    |
| US-SAFE-004 | Manage signers and threshold                  | Safe owner          |   ✅   |    P2    |
| US-SAFE-005 | Review Safe transactions                      | Team member         |   ✅   |    P2    |
| US-SAFE-006 | Approve and execute a Safe transaction        | Safe owner          |   ✅   |    P1    |

---

## US-SAFE-001: Set Up a Safe

**As a** team owner **I want to** deploy a new Safe or import an existing Safe **so that** my team
has one shared wallet in CNC.

### How it works

1. After creating a team, the portal offers an optional Safe setup step. The team owner can also
   open the team's Safe account later if they skip this step.
2. Choose one of the two setup options:
   - **Deploy a new Safe** for a new team wallet.
   - **Import an existing Safe** already controlled by the team.
3. Confirm the wallet action or the import.
4. Once registered, the portal opens the team's Safe account.

### Acceptance Criteria

- [x] When the team has no Safe, the Safe account offers both **Deploy a new Safe** and **Import an
      existing Safe**.
- [x] During team creation, the team owner can choose the **Deploy a new Safe** or **Import an
      existing Safe** setup tab, or select **Set up Safe later** to continue without a Safe.
- [x] Only the team owner can deploy or import a Safe. Other team members can inspect a Safe but
      cannot attach one to the team.
- [x] Deploying creates a Safe with the team owner as the initial signer and a threshold of **1 of
      1**.
- [x] The new Safe is registered to the team after the on-chain deployment succeeds.
- [x] Importing asks for a Safe address, checks it on the active network, and shows its address,
      owners, threshold, and version before confirmation.
- [x] Importing only registers the existing Safe with CNC. It does not send an on-chain transaction
      or change the Safe's configuration.
- [x] If registration fails after deployment, the portal keeps the deployed address visible and lets
      the owner retry registration instead of deploying another Safe.
- [x] While the team and its contracts are loading, the portal shows a Safe loading state and does
      not briefly display setup before confirming that the team has no Safe.
- [x] Setup controls that the connected wallet cannot use remain accompanied by an explanation of
      the required team-owner role.
- [x] An archived team cannot deploy, import, or retry Safe registration.

**Priority:** P1 (Critical) · **Status:** ✅ Done

---

## US-SAFE-002: Display Safe Details

**As a** team member **I want to** see the Safe's current details **so that** I understand the
team's wallet and who controls it.

### What I can see

- The Safe address and a link to open it in the Safe application.
- The total balance and local-currency equivalent.
- The token holdings in the Safe.
- The current owners and the number of signatures required.
- Recent deposits, including sender, amount, date, type, and transaction hash.

### Acceptance Criteria

- [x] The Safe account displays the address, balance, token holdings, owner count, and threshold.
- [x] The owners list identifies the connected signer when applicable.
- [x] Incoming native-token, ERC-20, and ERC-721 transfers are displayed as deposits.
- [x] A user can inspect this information without being a Safe owner.
- [x] Loading states identify the Safe information being checked, while query errors keep the Safe
      address and unaffected information visible and provide a local retry.
- [x] Empty deposit states explain which action will populate the section.
- [x] Deposit history becomes stacked cards on small screens without removing keyboard access to
      links, buttons, or transaction details.

**Priority:** P1 (Critical) · **Status:** ✅ Done · **Dependencies:** US-SAFE-001

---

## US-SAFE-003: Manage Funds

**As a** team owner or Safe owner **I want to** deposit assets into the Safe and transfer assets
from it **so that** the team can fund and use its shared treasury.

### How it works

1. Deposit native tokens or supported tokens into the Safe to fund the team wallet.
2. Choose a Safe-held token and create a transfer when the team needs to pay or move funds.
3. Complete the transaction through the Safe approval flow in US-SAFE-006.

### Acceptance Criteria

- [x] The Safe account offers a deposit flow for native tokens and supported tokens.
- [x] The balance and token holdings reflect funds held by the Safe.
- [x] Only a connected Safe owner can start a transfer from the Safe.
- [x] Signer-only transfer controls explain the required role when the connected wallet cannot use
      them; team membership alone does not grant signer permission.
- [x] A transfer follows the Safe's approval and execution rules; it is not an unrestricted direct
      withdrawal.
- [x] Success feedback distinguishes a completed action from a proposal that still needs signer
      approvals.

**Priority:** P1 (Critical) · **Status:** ✅ Done · **Dependencies:** US-SAFE-001, US-SAFE-006

---

## US-SAFE-004: Manage Signers and Threshold

**As a** Safe owner **I want to** add or remove signers and set the threshold **so that** the Safe's
approval rules match the team that controls it.

### How it works

1. Open the owners card in the Safe account.
2. Add a signer, remove a signer, or choose a new threshold.
3. Approve and execute the resulting Safe transaction according to the current threshold, as
   described in US-SAFE-006.
4. The updated owners and threshold appear in the Safe details.

### Acceptance Criteria

- [x] The Safe account lets a Safe owner add a signer, remove a signer, or update the threshold.
- [x] A user who is not a Safe owner cannot use these controls and sees why signer permission is
      required.
- [x] Signer and threshold changes use the same approval flow as other Safe transactions.
- [x] The portal refreshes the owner list and required-signature count after a successful change.

**Priority:** P2 (High) · **Status:** ✅ Done · **Dependencies:** US-SAFE-006

---

## US-SAFE-005: Review Safe Transactions

**As a** team member **I want to** review Safe transactions **so that** I understand which actions
are pending and which ones the team has already completed.

### What I can see

- The action, recipient, value, approval progress, status, last update, and available action.
- The transaction details, including its on-chain hash when available, when more context is needed.
- Transactions needing action by default, or a counted status filter and the complete history.
- The current state and its next step:
  - **Pending approvals:** the Safe still needs signer confirmations.
  - **Ready to execute:** the threshold has been reached and a signer can execute the transaction.
  - **Conflicting:** another pending transaction may be affected and should be reviewed first.
  - **Executed:** the Safe completed the transaction and no further signer action is required.
  - **Invalid:** the Safe has passed the transaction nonce; a new proposal is required if the action
    is still needed.

### Acceptance Criteria

- [x] The transaction list shows its method, recipient, value, approval progress, status, last
      update, and available action; details expose the transaction hash when present.
- [x] Counted filters prioritize transactions needing action and expose approval, ready, conflict,
      executed, and complete-history views.
- [x] A team member can open a transaction to inspect its details without being a Safe owner.
- [x] Desktop rows, mobile cards, filters, details, and action guidance use the same transaction
      statuses and approval progress.
- [x] Empty and error states explain how to populate the queue or retry the affected request without
      hiding unrelated Safe information.
- [x] Transaction rows become stacked cards on small screens, while links, buttons, labelled fields,
      progress information, focus styles, and modal controls remain keyboard reachable.

**Priority:** P2 (High) · **Status:** ✅ Done · **Dependencies:** US-SAFE-001

---

## US-SAFE-006: Approve and Execute a Safe Transaction

**As a** Safe owner **I want to** approve a pending transaction and execute it once enough owners
agree **so that** the team can carry out an action safely.

### How it works

1. Review a pending transaction and approve it if you agree with the action.
2. Other Safe owners approve it until the Safe threshold is reached.
3. Execute the transaction once it has the required number of approvals.
4. Review the resulting status and refreshed balances.

### Acceptance Criteria

- [x] Only Safe owners can approve or execute a transaction.
- [x] A signer cannot approve the same transaction twice.
- [x] A transaction can execute only when it has the required number of confirmations.
- [x] Reaching the threshold marks a transaction as ready; approval and execution remain separate
      actions.
- [x] Executed and stale-nonce transactions cannot be approved or executed again.
- [x] The portal warns before an approval or execution that conflicts with pending transactions.
- [x] Approval queue entries show only the actions currently available to the connected signer, and
      their status explains the next step.
- [x] After execution, the portal refreshes the transaction status, Safe details, and balances.

**Priority:** P1 (Critical) · **Status:** ✅ Done · **Dependencies:** US-SAFE-001

---

## Related Documentation

- [SafeDepositRouter contract](../../contracts/features/safe-deposit-router/README.md) — investor
  deposits routed to a Safe; it is not the Safe wallet feature itself.
- [Payroll & Cash Remuneration](../payroll/README.md) — payroll funding may use the team's treasury
  flows.

_[← Back to documentation index](../../README.md)_
