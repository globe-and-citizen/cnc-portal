# CNC Portal - User Stories & Acceptance Criteria

**Version:** 1.0.0  
**Date:** March 12, 2026  
**Format:** User Story | Acceptance Criteria | Priority (P1–P5) | Effort (XS/S/M/L/XL)

---

## Table of Contents

1. [Epic Overview](#epic-overview)
2. [Authentication & User Management](#authentication--user-management)
3. [Team Management](#team-management)
4. [Payroll & Cash Remuneration](#payroll--cash-remuneration)
5. [Claims & Expenses](#claims--expenses)
6. [Governance](#governance)
7. [Token Management & Vesting](#token-management--vesting)
8. [Analytics & Reporting](#analytics--reporting)

---

## Epic Overview

### Project Epics & Effort Estimation

| Epic              | Status         | User Stories   | Total Effort   |
| ----------------- | -------------- | -------------- | -------------- |
| Authentication    | ✅ Done        | 3 stories      | 13 points      |
| User Management   | 🔄 In Progress | 4 stories      | 15 points      |
| Team Management   | ✅ Done        | 5 stories      | 21 points      |
| Payroll           | ✅ Done        | 6 stories      | 34 points      |
| Claims & Expenses | 🔄 In Progress | 5 stories      | 28 points      |
| Governance        | 🔄 In Progress | 6 stories      | 42 points      |
| Vesting           | ✅ Done        | 4 stories      | 21 points      |
| Analytics         | 🔄 In Progress | 4 stories      | 26 points      |
| **Total**         | -              | **37 stories** | **200 points** |

### Effort Estimation (T-Shirt Sizes)

- **XS (1 pt):** < 1 hour (simple display, basic validation)
- **S (3 pts):** 1–2 hours (standard CRUD, basic logic)
- **M (5 pts):** 1 day (form with validation, business logic)
- **L (8 pts):** 2–3 days (module with multiple views, API calls)
- **XL (13 pts):** 1+ weeks (complex feature, integrations, smart contracts)

---

## Authentication & User Management

### US-AUTH-001: SIWE Login

**As a** new user  
**I want to** sign in with my Ethereum wallet  
**So that** I can access the CNC Portal without managing a separate password

**Acceptance Criteria:**

- [ ] SIWE login button displayed on login page
- [ ] Clicking button opens wallet connector modal (MetaMask, WalletConnect, Coinbase)
- [ ] User selects wallet and confirms signature request
- [ ] Backend validates signature and creates session
- [ ] User redirected to dashboard after successful login
- [ ] Wallet address stored in user profile
- [ ] Error messages shown if signature validation fails

**Priority:** P1 (Critical)  
**Effort:** M (5 points)  
**Status:** ✅ Done  
**Dependencies:** None

---

### US-AUTH-002: Session Persistence

**As a** logged-in user  
**I want to** remain logged in across browser sessions
**So that** I don't need to sign in every time I visit the portal

**Acceptance Criteria:**

- [ ] Access token stored in localStorage
- [ ] Refresh token sent to backend for token refresh
- [ ] App checks token validity on load
- [ ] If token expired, refresh token automatically
- [ ] If refresh fails, user redirected to login
- [ ] Logout clears all stored tokens

**Priority:** P1 (Critical)  
**Effort:** M (5 points)  
**Status:** ✅ Done  
**Dependencies:** US-AUTH-001

---

### US-AUTH-003: Logout

**As a** logged-in user  
**I want to** log out of my account
**So that** I can end my session and protect my account

**Acceptance Criteria:**

- [ ] Logout button in header/menu
- [ ] Clicking logout clears tokens and redirects to login page
- [ ] Backend invalidates refresh token
- [ ] Confirmation toast shown: "You have been logged out"

**Priority:** P1 (Critical)  
**Effort:** S (3 points)  
**Status:** ✅ Done  
**Dependencies:** US-AUTH-001

---

## Team Management

### US-TEAM-001: Create Team (CNC)

**As a** user  
**I want to** create a new team (CNC)
**So that** I can set up a blockchain-based organization

**Acceptance Criteria:**

- [ ] Team creation form has fields: name, description, image (optional)
- [ ] Name required (min 3 characters, max 100)
- [ ] Description optional (max 500 characters)
- [ ] Image upload supported (PNG, JPG, max 5MB)
- [ ] User automatically becomes team admin/owner
- [ ] Smart contract deployed for team on-chain
- [ ] Team page created and accessible
- [ ] Confirmation toast: "Team created successfully"

**Priority:** P1 (Critical)  
**Effort:** XL (13 points)  
**Status:** ✅ Done  
**Dependencies:** US-AUTH-001

---

### US-TEAM-002: View Team Details

**As a** team member  
**I want to** see all information about my team
**So that** I understand the team structure and current status

**Acceptance Criteria:**

- [ ] Team page displays: name, description, image, member count
- [ ] Member list shown with roles (Admin, Member)
- [ ] Team stats displayed: active members, total claims, treasury balance
- [ ] Owner/admin badges visible
- [ ] Contract address displayed (with link to explorer)
- [ ] Edit button visible for admins

**Priority:** P1 (Critical)  
**Effort:** M (5 points)  
**Status:** ✅ Done  
**Dependencies:** US-TEAM-001

---

### US-TEAM-003: Invite Members

**As a** team admin  
**I want to** invite other users to join my team
**So that** I can grow my team and delegate responsibilities

**Acceptance Criteria:**

- [ ] Invite button on team page (admin only)
- [ ] Search for users by name/address
- [ ] Create invitation with optional message
- [ ] Invited user receives notification
- [ ] User can accept/decline invitation
- [ ] Accepted users appear in member list
- [ ] Declined invitations don't add member
- [ ] Admin can view pending invitations

**Priority:** P1 (Critical)  
**Effort:** L (8 points)  
**Status:** 🔄 In Progress  
**Dependencies:** US-TEAM-001, US-AUTH-001

---

### US-TEAM-004: Manage Team Members

**As a** team admin  
**I want to** manage team members (add, remove, change roles)
**So that** I can control who has access and responsibilities

**Acceptance Criteria:**

- [ ] Admin can remove members from team
- [ ] Admin can promote member to admin
- [ ] Admin can demote admin to member (if not sole admin)
- [ ] Confirmation required before removing member
- [ ] Member list shows current roles
- [ ] Cannot demote self if sole admin
- [ ] Removed member loses access to team
- [ ] Audit log records all changes

**Priority:** P2 (High)  
**Effort:** M (5 points)  
**Status:** ✅ Done  
**Dependencies:** US-TEAM-003

---

### US-TEAM-005: Leave Team

**As a** team member  
**I want to** leave a team
**So that** I can remove myself from teams I'm no longer part of

**Acceptance Criteria:**

- [ ] Leave button on team page
- [ ] Confirmation required
- [ ] Cannot leave if sole admin (error message)
- [ ] Member removed from team
- [ ] User redirected to teams list
- [ ] Confirmation toast: "You left the team"

**Priority:** P2 (High)  
**Effort:** S (3 points)  
**Status:** ✅ Done  
**Dependencies:** US-TEAM-001

---

## Payroll & Cash Remuneration

### US-PAYROLL-001: Set Member Wage

**As a** team admin  
**I want to** set wage rates for each team member
**So that** they can submit claims for fair compensation

**Acceptance Criteria:**

- [ ] Wage form shows member name and address
- [ ] Can set rates in multiple currencies: Native token, USDC, SHER
- [ ] Each rate is a per-hour amount
- [ ] Can set maximum hours per week
- [ ] Save button disabled until all required fields are filled
- [ ] Wage stored on-chain
- [ ] Success toast: "Wage set for [Member Name]"
- [ ] Admin can edit/update wages for existing members

**Priority:** P1 (Critical)  
**Effort:** M (5 points)  
**Status:** ✅ Done  
**Dependencies:** US-TEAM-001

---

### US-PAYROLL-002: Deposit Funds to Bank Account

**As a** team admin  
**I want to** deposit funds (USDC, native token) into the team bank account
**So that** the team has funds available for paying claims

**Acceptance Criteria:**

- [ ] Bank account address displayed
- [ ] Deposit amount input field
- [ ] Currency selector (USDC, native token)
- [ ] Confirm button shows transaction details
- [ ] User signs transaction in wallet
- [ ] Transaction submitted to blockchain
- [ ] Balance updated when transaction confirmed
- [ ] Success notification with transaction hash

**Priority:** P1 (Critical)  
**Effort:** M (5 points)  
**Status:** ✅ Done  
**Dependencies:** US-PAYROLL-001, US-TEAM-001

---

### US-PAYROLL-003: Submit Weekly Claim

**As a** team member  
**I want to** submit work claims for the past week
**So that** I can request compensation for my work

**Acceptance Criteria:**

- [ ] Claim form shows: week start date, hours worked per day, memo
- [ ] Max 24 hours can be submitted per claim
- [ ] Daily breakdown shown with hours input for each day
- [ ] Hours cannot exceed member's wage maximum
- [ ] Submit button calculates total hours
- [ ] Error if > 24 hours: "Max 24 hours per submission"
- [ ] Error if > max weekly hours: "Exceeds weekly maximum of X hours"
- [ ] On submit: claim created with "pending" status
- [ ] Confirmation: "Claim submitted for approval"

**Priority:** P1 (Critical)  
**Effort:** M (5 points)  
**Status:** ✅ Done  
**Dependencies:** US-PAYROLL-001

---

### US-PAYROLL-004: Approve Weekly Claims

**As a** team admin  
**I want to** review and approve member claims
**So that** I can process accurate compensation payments

**Acceptance Criteria:**

- [ ] Admin claims approval page lists all pending claims
- [ ] Claim shows: member name, hours, amounts by currency
- [ ] Admin can view claim details (daily breakdown, memo)
- [ ] Approve button: transfers funds to member, marks as approved
- [ ] Reject button: resets claim to draft, allows member to edit
- [ ] Admin can bulk-approve multiple claims
- [ ] Audit log records who approved which claim and when
- [ ] Confirmation: "X claims approved, Y transferred"

**Priority:** P1 (Critical)  
**Effort:** L (8 points)  
**Status:** ✅ Done  
**Dependencies:** US-PAYROLL-003

---

### US-PAYROLL-005: Withdraw Payment

**As a** team member  
**I want to** withdraw my approved claims
**So that** I receive my compensation in my wallet

**Acceptance Criteria:**

- [ ] Member payments page shows: approved claim amount by currency
- [ ] Withdraw button enabled only for approved claims
- [ ] Clicking withdraw shows transaction confirmation
- [ ] User signs withdrawal transaction
- [ ] Funds transfer to member wallet
- [ ] Claim marked as withdrawn
- [ ] Transaction hash displayed
- [ ] Confirmation: "Payment withdrawn to your wallet"

**Priority:** P1 (Critical)  
**Effort:** M (5 points)  
**Status:** ✅ Done  
**Dependencies:** US-PAYROLL-004

---

### US-PAYROLL-006: View Payment History

**As a** team member  
**I want to** see my complete payment history
**So that** I can verify all compensation received

**Acceptance Criteria:**

- [ ] History page shows: claim date, hours, amounts by currency, status
- [ ] Filter by date range
- [ ] Sort by claim date, amount, status
- [ ] Export to CSV option
- [ ] Total earned YTD displayed
- [ ] Search by week/month

**Priority:** P2 (High)  
**Effort:** M (5 points)  
**Status:** 🔄 In Progress  
**Dependencies:** US-PAYROLL-005

---

## Claims & Expenses

### US-EXPENSES-001: Configure Expense Limits

**As a** team admin  
**I want to** set expense account limits
**So that** I can control spending and prevent unauthorized expenses

**Acceptance Criteria:**

- [ ] Expense configuration form accessible from team settings
- [ ] Configurable limits:
  - No limit (unlimited spending)
  - Max transaction count per period
  - Max total amount per period
  - Max per-transaction amount
- [ ] Can apply to individual members or group
- [ ] Save updates on-chain
- [ ] Error messages if invalid combinations
- [ ] Confirmation: "Expense limits updated"

**Priority:** P2 (High)  
**Effort:** M (5 points)  
**Status:** ⏳ Pending  
**Dependencies:** US-TEAM-001

---

### US-EXPENSES-002: Submit Expense Claim

**As a** team member  
**I want to** submit an expense claim
**So that** I can request reimbursement

**Acceptance Criteria:**

- [ ] Expense form: amount, description, category, receipt (optional)
- [ ] Validation against configured limits
- [ ] Error if transaction count exceeded
- [ ] Error if total amount exceeded
- [ ] Error if per-transaction limit exceeded
- [ ] Submit creates expense with "pending" status
- [ ] Member can view/edit pending expenses before approval

**Priority:** P2 (High)  
**Effort:** M (5 points)  
**Status:** ⏳ Pending  
**Dependencies:** US-EXPENSES-001

---

### US-EXPENSES-003: Approve Expenses

**As a** team admin  
**I want to** review and approve expense claims
**So that** I can control spending

**Acceptance Criteria:**

- [ ] Admin expenses page lists pending claims
- [ ] Show: member, amount, description, submission date
- [ ] Approve/Reject buttons
- [ ] Rejection: expense reverts to draft for member to edit
- [ ] Approval: marks as approved, schedules reimbursement
- [ ] Bulk approval option

**Priority:** P2 (High)  
**Effort:** M (5 points)  
**Status:** ⏳ Pending  
**Dependencies:** US-EXPENSES-002

---

### US-EXPENSES-004: Process Expense Reimbursement

**As a** team admin  
**I want to** process approved expense reimbursements
**So that** members are reimbursed for expenses

**Acceptance Criteria:**

- [ ] Reimbursement initiated from approved expenses
- [ ] Funds transferred to member wallet
- [ ] Transaction hash logged
- [ ] Expense marked as reimbursed
- [ ] Bulk reimbursement option

**Priority:** P2 (High)  
**Effort:** M (5 points)  
**Status:** ⏳ Pending  
**Dependencies:** US-EXPENSES-003

---

### US-EXPENSES-005: Expense Report

**As a** team admin  
**I want to** view expense reports
**So that** I can track spending by member, category, and period

**Acceptance Criteria:**

- [ ] Reports page shows expense breakdown
- [ ] Filter by member, category, date range
- [ ] Total by category and member
- [ ] Export to CSV/PDF
- [ ] Charts/visualizations of spending trends

**Priority:** P3 (Medium)  
**Effort:** L (8 points)  
**Status:** ⏳ Pending  
**Dependencies:** US-EXPENSES-004

---

## Governance

### US-GOVERNANCE-001: Create Proposal

**As a** team member  
**I want to** create a proposal
**So that** I can suggest actions for the team to vote on

**Acceptance Criteria:**

- [ ] Proposal form: title, description, proposal type (action, policy, etc.)
- [ ] Voting period selector (7, 14, 30 days)
- [ ] Execute-on-approval toggle
- [ ] Title required (min 10, max 200 chars)
- [ ] Description required (max 2000 chars)
- [ ] Submit button creates proposal on-chain
- [ ] Proposal enters "voting" state
- [ ] Confirmation: "Proposal created and voting has begun"

**Priority:** P1 (Critical)  
**Effort:** L (8 points)  
**Status:** ✅ Done  
**Dependencies:** US-TEAM-001

---

### US-GOVERNANCE-002: Vote on Proposal

**As a** team member  
**I want to** vote on active proposals
**So that** I can participate in team decisions

**Acceptance Criteria:**

- [ ] Proposals list shows active voting proposals
- [ ] Proposal detail page shows: title, description, voting period, current votes
- [ ] Vote buttons: Yes, No, Abstain (if supported)
- [ ] Member can see their vote status
- [ ] Vote counted immediately
- [ ] Vote confirmed on-chain
- [ ] Cannot change vote after casting
- [ ] Voting period shown with countdown timer

**Priority:** P1 (Critical)  
**Effort:** M (5 points)  
**Status:** ✅ Done  
**Dependencies:** US-GOVERNANCE-001

---

### US-GOVERNANCE-003: Execute Approved Proposal

**As a** team member  
**I want to** execute proposals that have passed
**So that** the team's decisions are implemented

**Acceptance Criteria:**

- [ ] Proposal page shows execution status
- [ ] Execute button available when voting complete and approved
- [ ] Execute triggers on-chain action (e.g., add member, transfer funds)
- [ ] Wait for blockchain confirmation
- [ ] Status updated to "executed"
- [ ] Audit log records execution details

**Priority:** P1 (Critical)  
**Effort:** M (5 points)  
**Status:** ✅ Done  
**Dependencies:** US-GOVERNANCE-002

---

### US-GOVERNANCE-004: Board of Directors Election

**As a** team member  
**I want to** participate in BOD elections
**So that** I can help choose team leadership

**Acceptance Criteria:**

- [ ] Election form: set candidates and number of seats
- [ ] Voting period selector
- [ ] Each member votes for up to N candidates
- [ ] Results shown after voting period ends
- [ ] Tie-breaking: if tied for final seat, secondary vote or admin decides
- [ ] Top N candidates become BOD members
- [ ] BOD status updated on-chain
- [ ] Roles updated for board members

**Priority:** P1 (Critical)  
**Effort:** L (8 points)  
**Status:** ✅ Done  
**Dependencies:** US-GOVERNANCE-002

---

### US-GOVERNANCE-005: Tie-Breaking in Elections

**As a** team admin  
**I want to** resolve ties in BOD elections
**So that** all board seats are filled fairly

**Acceptance Criteria:**

- [ ] System detects if a tie exists for final seat
- [ ] Tie-breaking options:
  - Admin override (admin votes for tied candidate)
  - Secondary vote (only tied candidates voted again)
  - Seniority/tenure (longest member wins)
- [ ] Mechanism configurable per team
- [ ] Result applied on-chain
- [ ] All members notified of tie-breaker outcome

**Priority:** P2 (High)  
**Effort:** M (5 points)  
**Status:** 🔄 In Progress  
**Dependencies:** US-GOVERNANCE-004

---

### US-GOVERNANCE-006: View Governance History

**As a** team member  
**I want to** see all past proposals and elections
**So that** I can understand the team's decision history

**Acceptance Criteria:**

- [ ] History page lists all proposals (passed, failed, executed)
- [ ] Filter by status, date, type
- [ ] View past election results
- [ ] View vote breakdown for each proposal
- [ ] Search proposals by keyword

**Priority:** P3 (Medium)  
**Effort:** M (5 points)  
**Status:** ⏳ Pending  
**Dependencies:** US-GOVERNANCE-003

---

## Token Management & Vesting

### US-TOKEN-001: Mint Team Token

**As a** team owner  
**I want to** create and mint a custom token for my team
**So that** I can distribute equity or rewards to members

**Acceptance Criteria:**

- [ ] Token creation form: name, symbol, initial supply, decimals
- [ ] Deploy token contract
- [ ] Initial tokens minted to team treasury
- [ ] Token address displayed and linked to explorer
- [ ] Team can use token for voting or equity

**Priority:** P2 (High)  
**Effort:** M (5 points)  
**Status:** ✅ Done  
**Dependencies:** US-TEAM-001

---

### US-TOKEN-002: Distribute Tokens

**As a** team admin  
**I want to** distribute tokens to team members
**So that** members have a stake in the team

**Acceptance Criteria:**

- [ ] Distribution form: select members, amount per member
- [ ] Preview total distribution
- [ ] Execute distribution transaction
- [ ] Tokens transferred to member wallets
- [ ] Vesting schedule applied if configured
- [ ] Confirmation with transaction hash

**Priority:** P2 (High)  
**Effort:** M (5 points)  
**Status:** ✅ Done  
**Dependencies:** US-TOKEN-001

---

### US-TOKEN-003: Create Vesting Schedule

**As a** team admin  
**I want to** create a vesting schedule for token distribution
**So that** tokens are released gradually to members

**Acceptance Criteria:**

- [ ] Vesting form: cliff period, release period, total duration
- [ ] Cliff: tokens locked for X months before any release
- [ ] Linear vesting: tokens released linearly over duration
- [ ] Schedule applies to token distribution
- [ ] Member can see vesting schedule in profile
- [ ] Display portion vested and locked

**Priority:** P2 (High)  
**Effort:** L (8 points)  
**Status:** ✅ Done  
**Dependencies:** US-TOKEN-002

---

### US-TOKEN-004: Claim Vested Tokens

**As a** team member  
**I want to** claim tokens as they vest
**So that** I receive my token allocation

**Acceptance Criteria:**

- [ ] Display available vested tokens
- [ ] Claim button enabled when tokens available
- [ ] Claim transfers vested tokens to wallet
- [ ] Balance displayed: vested, locked, total
- [ ] Transaction hash shown
- [ ] Confirmation: "X tokens claimed"

**Priority:** P2 (High)  
**Effort:** M (5 points)  
**Status:** ✅ Done  
**Dependencies:** US-TOKEN-003

---

## Analytics & Reporting

### US-ANALYTICS-001: Team Dashboard

**As a** team admin  
**I want to** see a dashboard with key team metrics
**So that** I can monitor team health and activity

**Acceptance Criteria:**

- [ ] Dashboard displays:
  - Active members count
  - Total claims submitted (month, YTD)
  - Total paid out (month, YTD)
  - Treasury balance
  - Recent proposals and elections
- [ ] Charts/visualizations: spending trends, member activity
- [ ] Period selector: week, month, quarter, YTD
- [ ] Export option to PDF/CSV

**Priority:** P1 (Critical)  
**Effort:** L (8 points)  
**Status:** 🔄 In Progress  
**Dependencies:** US-PAYROLL-005

---

### US-ANALYTICS-002: Member Activity Report

**As a** team admin  
**I want to** see detailed activity for each member
**So that** I can track engagement and participation

**Acceptance Criteria:**

- [ ] Report shows per-member: hours worked, claims, votes, proposals
- [ ] Filter by date range, member
- [ ] Highlight top contributors
- [ ] Export to CSV
- [ ] Engagement metrics (voting participation %)

**Priority:** P2 (High)  
**Effort:** M (5 points)  
**Status:** ⏳ Pending  
**Dependencies:** US-PAYROLL-005, US-GOVERNANCE-003

---

### US-ANALYTICS-003: Financial Summary Report

**As a** team admin  
**I want to** generate financial reports
**So that** I can review treasury, spending, and compensation

**Acceptance Criteria:**

- [ ] Report shows: total paid claims, expenses, treasury balance
- [ ] Breakdown by currency (USDC, native token, etc.)
- [ ] Period selector: month, quarter, YTD
- [ ] Charts: spending trends, member compensation distribution
- [ ] Export to PDF/CSV

**Priority:** P2 (High)  
**Effort:** L (8 points)  
**Status:** ⏳ Pending  
**Dependencies:** US-PAYROLL-005, US-EXPENSES-004

---

### US-ANALYTICS-004: Platform Statistics

**As a** developer / analyst  
**I want to** access platform-wide statistics via API
**So that** I can build analytics and reporting tools

**Acceptance Criteria:**

- [ ] API endpoint returns: team count, active users, total volume
- [ ] Metrics: claims submitted, governance votes, token distributions
- [ ] Time-based data: daily, weekly, monthly aggregates
- [ ] Rate limited and authenticated
- [ ] Documented in API reference

**Priority:** P2 (High)  
**Effort:** L (8 points)  
**Status:** ✅ Done  
**Dependencies:** None

---

## How to Use These User Stories

1. **For Development:** Pick a user story, read acceptance criteria, build feature
2. **For QA:** Use acceptance criteria as test cases
3. **For Product:** Prioritize by importance (P1 > P2 > P3) and sequencing
4. **For Planning:** Use effort estimates to plan sprints

---

**Last Updated:** March 12, 2026  
**Total Stories:** 37 | Total Effort: 200 points  
**Current Phase:** M5–M6 (Analytics & Backoffice)
