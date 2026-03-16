# Contract: AdCampaignManager

**Epic Goal:** Let advertisers fund on-chain ad campaigns and allow admins to claim per-click/impression payments against those budgets.
**Contract File:** `contracts/AdCampaignManager.sol`
**Upgradeable:** No (standard Ownable)
**Last updated:** 2026-03-16

---

## Status Overview

| User Story | Title                                            | Status | Effort |
| ---------- | ------------------------------------------------ | ------ | ------ |
| US-ADC-001 | Create an ad campaign with ETH budget            | ✅     | M      |
| US-ADC-002 | Claim payment for clicks/impressions             | ✅     | M      |
| US-ADC-003 | Withdraw remaining campaign budget               | ✅     | M      |
| US-ADC-004 | Configure cost-per-click and cost-per-impression | ✅     | S      |
| US-ADC-005 | Manage admin list                                | ✅     | S      |

**5 / 5 stories complete**

---

## Implementation Notes

- **Contract:** `contracts/AdCampaignManager.sol`
- **Key functions:** `createAdCampaign`, `claimPayment`, `requestAndApproveWithdrawal`, `addAdmin`, `removeAdmin`, `setBankContractAddress`, `setCostPerClick`, `setCostPerImpression`, `getAdCampaignByCode`
- **Access roles:** Anyone can create a campaign (with ETH); admins/owner claim payments; advertiser or admin can withdraw remainder
- **Dependencies:** Bank contract (payment claims forwarded as ETH to Bank)
- **Protections:** `PausableUpgradeable` (despite not being proxy-upgradeable), `ReentrancyGuard`
- **Note:** Not upgradeable — no proxy; owner deploys and configures directly

---

## US-ADC-001: Create an Ad Campaign with ETH Budget

> **As an** advertiser, **I want to** create an on-chain ad campaign by depositing ETH, **so that** payments can be claimed against my budget in a trustless way.

**Status:** ✅ | **Priority:** P1 | **Effort:** M | **Dependencies:** none

### Acceptance Criteria

- [x] `createAdCampaign()` called with `msg.value > 0` to set the campaign budget
- [x] A unique `campaignCode` is generated and associated with `msg.sender` (the advertiser)
- [x] Campaign stored with: advertiser address, budget (ETH), amount spent, active status
- [x] `getAdCampaignByCode(campaignCode)` returns the full `AdCampaign` struct
- [x] Reverts if contract is paused
- [x] Emits `CampaignCreated` event with the campaign code

---

## US-ADC-002: Claim Payment for Clicks/Impressions

> **As an** admin, **I want to** claim payment from a campaign's budget based on reported clicks or impressions, **so that** the platform is compensated for traffic delivered.

**Status:** ✅ | **Priority:** P1 | **Effort:** M | **Dependencies:** US-ADC-001, US-ADC-004

### Acceptance Criteria

- [x] `claimPayment(campaignCode, currentAmountSpent)` restricted to admins and owner
- [x] `currentAmountSpent` is the cumulative spend to date; contract pays the delta since last claim
- [x] Payment forwarded to the Bank contract address (`setBankContractAddress` must be set)
- [x] Campaign `amountSpent` updated to `currentAmountSpent`
- [x] Reverts if `currentAmountSpent ≤ previousAmountSpent` (no new spend to claim)
- [x] Reverts if delta exceeds remaining campaign budget
- [x] ReentrancyGuard protects the function

---

## US-ADC-003: Withdraw Remaining Campaign Budget

> **As an** advertiser, **I want to** stop my campaign and withdraw the unspent ETH budget, **so that** I can recover funds if the campaign is no longer needed.

**Status:** ✅ | **Priority:** P1 | **Effort:** M | **Dependencies:** US-ADC-001

### Acceptance Criteria

- [x] `requestAndApproveWithdrawal(campaignCode, spent)` callable by the advertiser or an admin
- [x] `spent` is the final amount spent before closure; remaining = `budget - spent`
- [x] Remaining ETH transferred to the advertiser's address
- [x] Campaign marked as inactive after withdrawal
- [x] Reverts if campaign is already inactive
- [x] ReentrancyGuard protects the function

---

## US-ADC-004: Configure Cost-per-Click and Cost-per-Impression

> **As an** owner, **I want to** set the global cost-per-click and cost-per-impression rates, **so that** all campaigns use the same pricing without per-campaign configuration.

**Status:** ✅ | **Priority:** P2 | **Effort:** S | **Dependencies:** none

### Acceptance Criteria

- [x] `setCostPerClick(value)` stores the ETH cost per click (in wei) — owner only
- [x] `setCostPerImpression(value)` stores the ETH cost per impression (in wei) — owner only
- [x] Both values readable publicly
- [x] Admin uses these rates off-chain to compute `currentAmountSpent` before calling `claimPayment`

---

## US-ADC-005: Manage Admin List

> **As an** owner, **I want to** add or remove admin addresses, **so that** I can delegate campaign payment claims without giving full ownership.

**Status:** ✅ | **Priority:** P2 | **Effort:** S | **Dependencies:** none

### Acceptance Criteria

- [x] `addAdmin(admin)` grants admin role to an address (owner only)
- [x] `removeAdmin(admin)` revokes admin role (owner only)
- [x] `claimPayment` checks `isAdmin(msg.sender) || msg.sender == owner()`
- [x] Admin list does not affect `createAdCampaign` or `requestAndApproveWithdrawal`
- [x] Reverts if adding the zero address

---

_[← Back to index](../README.md)_
