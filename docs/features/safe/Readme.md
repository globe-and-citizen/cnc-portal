# Safe Wallet — User Stories

The Safe is the team's shared multi-signature wallet. It is where the team holds funds and where
Safe owners jointly approve actions.

**How to read this document:** start with Setup, then follow the stories in order. Each one says who
can perform the action, what they can do, and what must happen for it to succeed.

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

## Reviewable User Journey

The Safe account follows the same order in the interface and in this document. Each section answers
one user question before presenting the next set of actions.

| Step | User question                                 | Interface section      | Primary next action                                      |
| ---- | --------------------------------------------- | ---------------------- | -------------------------------------------------------- |
| 1    | Does this team already have a Safe?           | Setup                  | Deploy a new Safe or inspect and import an existing Safe |
| 2    | What does the wallet hold, and what can I do? | Overview               | Deposit funds, create a transfer, or open the Safe app   |
| 3    | Who controls the wallet?                      | Funds and control      | Review holdings, owners, and required approvals          |
| 4    | What needs signer attention?                  | Activity and approvals | Approve a proposal or execute one that is ready          |
| 5    | What already happened?                        | Deposits and history   | Review executed actions and incoming transfers           |

The connected wallet's role is stated next to the relevant controls:

- a **team owner** can deploy or import the Safe;
- a **Safe signer** can propose outgoing transfers, propose owner or threshold changes, approve
  transactions, and execute ready transactions;
- a **team member or other connected wallet** can review Safe information and deposit funds, but
  cannot use signer-only controls.

Disabled setup and wallet controls retain a visible explanation of who can use them and what must
happen first. Approval queue rows show only the signer actions currently available; their status and
details explain the next step. Team membership never implies Safe signer permission.

### Transaction state model

The approval queue uses one state model in the desktop table, mobile cards, filters, details, and
action guidance. It opens on the compact **Needs action** filter, while the counted filters expose
transactions awaiting approval, ready to execute, conflicting, executed, and the complete history.

| State             | Meaning                                                    | Next step                                              |
| ----------------- | ---------------------------------------------------------- | ------------------------------------------------------ |
| Pending approvals | The Safe has not collected its required confirmations      | One or more Safe signers approve the proposal          |
| Ready to execute  | The confirmation threshold has been reached                | A Safe signer executes the transaction                 |
| Conflicting       | Another pending transaction may be affected by this action | Review the pending queue before approving or executing |
| Executed          | The Safe completed the transaction                         | No further signer action is required                   |
| Invalid           | The Safe has already passed the transaction's nonce        | Create a new proposal if the action is still needed    |

Approving and executing remain separate actions. Reaching the threshold makes a transaction ready;
it does not execute it automatically. A conflict confirmation explains the consequence before the
existing approval or execution behaviour continues.

### Loading, empty, and error states

- Loading states identify which Safe information is being checked instead of replacing the whole
  account with an unexplained spinner.
- Empty transaction and deposit states explain which user action will populate the section.
- Query errors keep the Safe address and unaffected information visible and offer a local retry.
- Success messages say whether an action is complete or has only created a proposal waiting for
  signer approval.
- Desktop tables become stacked transaction and deposit cards on small screens. Native links,
  buttons, labelled fields, progress semantics, focus styles, and modal controls remain keyboard
  reachable.

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
- [x] A transfer follows the Safe's approval and execution rules; it is not an unrestricted direct
      withdrawal.

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
- [x] A user who is not a Safe owner cannot use these controls.
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

### Acceptance Criteria

- [x] The transaction list shows its method, recipient, value, approval progress, status, last
      update, and available action; details expose the transaction hash when present.
- [x] Counted filters prioritize transactions needing action and expose approval, ready, conflict,
      executed, and complete-history views.
- [x] A team member can open a transaction to inspect its details without being a Safe owner.

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
- [x] Executed and stale-nonce transactions cannot be approved or executed again.
- [x] The portal warns before an approval or execution that conflicts with pending transactions.
- [x] After execution, the portal refreshes the transaction status, Safe details, and balances.

**Priority:** P1 (Critical) · **Status:** ✅ Done · **Dependencies:** US-SAFE-001

---

## Related Documentation

- [SafeDepositRouter contract](../contracts/safe-deposit-router/README.md) — investor deposits
  routed to a Safe; it is not the Safe wallet feature itself.
- [Payroll & Cash Remuneration](../payroll/Readme.md) — payroll funding may use the team's treasury
  flows.

_[← Back to documentation index](../../README.md)_
