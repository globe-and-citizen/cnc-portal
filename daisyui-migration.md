# DaisyUI → Nuxt UI Migration Report

> Last updated: 2026-04-02. Scanned 179 `.vue` files under `app/src/`.

## Overview

DaisyUI (`v5.5.18`) is currently installed as a devDependency alongside Nuxt UI. This document lists everything that needs to be replaced before DaisyUI can be safely removed.

**Total files still affected: ~73** (down from ~96)

---

## Status Legend

- ✅ Migrated
- 🔄 In progress
- ⬜ Not started

---

## Components to Replace

### 1. ⬜ Badge → `<UBadge>` — 17 files

DaisyUI classes: `badge`, `badge-primary`, `badge-secondary`, `badge-info`, `badge-warning`, `badge-error`, `badge-success`, `badge-neutral`, `badge-outline`, `badge-sm`, `badge-md`, `badge-lg`, `badge-xs`

```html
<!-- Before -->
<span class="badge badge-success badge-sm">Active</span>

<!-- After -->
<UBadge color="success" size="sm">Active</UBadge>
```

**Files:**

- `components/sections/VestingView/VestingFlow.vue`
- `components/sections/TeamView/TeamCard.vue`
- `components/sections/SherTokenView/forms/DistributeMintForm.vue`
- `components/sections/SherTokenView/InvestorActions/SetCompensationMultiplierButton.vue`
- `components/sections/SafeView/SafeTransactions.vue`
- `components/sections/DashboardView/TeamMetaSection.vue`
- `components/sections/ContractManagementView/BodApprovalModal.vue`
- `components/sections/ClaimHistoryView/ClaimHistoryWeekNavigator.vue`
- `components/sections/AdministrationView/PastBoDElectionCard.vue`
- `components/sections/AdministrationView/ElectionStatus.vue`
- `components/sections/AdministrationView/BoDElectionDetailsCard.vue`
- `components/forms/CompensationAmount.vue`
- `components/SelectComponent.vue`
- `components/NotificationDropdown.vue`
- `components/GenericTransactionHistory.vue`
- `components/sections/SherTokenView/InvestorsTransactionTable.vue`
- `components/sections/SafeView/SafeIncomingTransactions.vue`

---

### 2. ⬜ Card → `<UCard>` — 8 files

DaisyUI classes: `card-body`, `card-actions`, `card-title`

```html
<!-- Before -->
<div class="card bg-base-100">
  <div class="card-body">
    <h2 class="card-title">Title</h2>
    <div class="card-actions">...</div>
  </div>
</div>

<!-- After -->
<UCard>
  <template #header>Title</template>
  <template #default>Content</template>
  <template #footer>Actions</template>
</UCard>
```

**Files:**

- `components/sections/TeamView/TeamCard.vue`
- `components/sections/TeamView/AddTeamCard.vue`
- `components/sections/SafeView/SafeDeploymentCard.vue`
- `components/sections/AdministrationView/PastBoDElectionCard.vue`
- `components/sections/AdministrationView/BoDElectionDetailsCard.vue`
- `components/sections/ClaimHistoryView/ClaimHistoryMemberHeader.vue`
- `components/sections/OwnerTreasuryWithdrawAction.vue`
- `views/team/[id]/DemoExample.vue`

---

### 3. ⬜ Button → `<UButton>` — 8 files

DaisyUI classes: `btn`, `btn-primary`, `btn-success`, `btn-ghost`, `btn-sm`, `btn-xs`, `btn-circle`, `btn-active`

```html
<!-- Before -->
<button class="btn btn-primary btn-sm">Save</button>

<!-- After -->
<UButton color="primary" size="sm">Save</UButton>
```

**Files:**

- `components/sections/VestingView/forms/CreateVesting.vue`
- `components/sections/VestingView/VestingSummary.vue`
- `components/sections/VestingView/VestingFlow.vue`
- `components/sections/CashRemunerationView/Form/FilePreviewGallery.vue`
- `components/sections/CashRemunerationView/Form/ExpandableFileGallery.vue`
- `components/NotificationDropdown.vue`
- `components/sections/ContractManagementView/TeamContractsDetail.vue`
- `components/sections/ContractManagementView/TeamContracts.vue`

---

### 4. ⬜ Form Controls — 19 files

| DaisyUI class                                  | Nuxt UI        | Files |
| ---------------------------------------------- | -------------- | ----- |
| `input-bordered`                               | `<UInput>`     | 9     |
| `label-text`, `label-text-alt`, `form-control` | `<UFormField>` | 9     |
| `select-bordered`                              | `<USelect>`    | 2     |
| `toggle`                                       | `<USwitch>`    | 8     |

```html
<!-- Before -->
<div class="form-control">
  <label class="label"><span class="label-text">Amount</span></label>
  <input class="input input-bordered" />
</div>

<!-- After -->
<UFormField label="Amount">
  <UInput />
</UFormField>
```

**Files with `input-bordered`:**

- `components/sections/VestingView/forms/CreateVesting.vue`
- `components/utils/SelectMemberWithTokenInput.vue`
- `components/sections/SherTokenView/forms/DistributeMintForm.vue`
- `components/sections/SherTokenView/InvestorActions/SetCompensationMultiplierButton.vue`
- `components/sections/ContractManagementView/forms/CreateAddCampaign.vue`
- `components/sections/ContractManagementView/TeamContractAdmins.vue`
- `components/forms/CompensationAmount.vue`
- `components/SelectMemberItem.vue`
- `components/sections/ContractManagementView/TeamContractsDetail.vue`

**Files with `label-text` / `form-control`:**

- `components/forms/SafeDepositRouterForm.vue` _(label-text in TokenAmount slot)_
- `components/forms/DepositBankForm.vue` _(label-text in TokenAmount slot)_
- `components/sections/SherTokenView/InvestorActions/SetCompensationMultiplierButton.vue`
- `components/sections/OwnerTreasuryWithdrawAction.vue`
- `components/forms/CompensationAmount.vue`
- `components/sections/ExpenseAccountView/TransferAction.vue`
- `components/sections/SherTokenView/forms/PayDividendsForm.vue`

**Files with `select-bordered`:**

- `views/team/[id]/ProposalsView.vue`
- `components/sections/VestingView/VestingStatusFilter.vue`

**Files with `toggle`:**

- `components/sections/WeeklyClaimView/WeeklyClaimActionDropdown.vue`
- `components/sections/DashboardView/MemberSection.vue`
- `components/SelectMemberItem.vue`
- `components/SelectComponent.vue`
- `components/NavBar.vue`
- `components/MonthSelector.vue`
- `components/sections/ContractManagementView/TeamContractEventList.vue`
- `components/sections/SherTokenView/InvestorActions/ToggleSherCompensationButton.vue`

---

### 5. ⬜ Modal layout — 10 files

DaisyUI classes: `modal-box`, `modal-action`, `modal-backdrop`

> Note: `modal-action` is used purely as a flex layout utility (`display: flex; justify-content: flex-end`). Replace with `flex justify-end gap-2` or `flex justify-between`.

```html
<!-- Before -->
<div class="modal-action justify-between">...</div>

<!-- After -->
<div class="flex justify-between gap-2 mt-4">...</div>
```

**Files:**

- `components/forms/SafeDepositRouterForm.vue`
- `components/forms/DepositBankForm.vue`
- `components/sections/VestingView/forms/CreateVesting.vue`
- `components/sections/ProposalsView/forms/CreateProposalForm.vue`
- `components/sections/SherTokenView/InvestorActions/SetCompensationMultiplierButton.vue`
- `components/sections/OwnerTreasuryWithdrawAction.vue`
- `components/sections/ContractManagementView/forms/CreateAddCampaign.vue`
- `components/sections/AdministrationView/forms/TransferOwnershipForm.vue`
- `components/ReceiptComponent.vue`
- _(+ `modal-backdrop` in SetCompensationMultiplierButton)_

---

### 6. ⬜ Alert → `<UAlert>` — 6 files

DaisyUI classes: `alert`, `alert-error`, `alert-warning`, `alert-info`, `alert-success`

```html
<!-- Before -->
<div class="alert alert-error">Error message</div>

<!-- After -->
<UAlert color="error" title="Error message" />
```

**Files:**

- `components/sections/ContractManagementView/MainContractSection.vue`
- `components/sections/CashRemunerationView/DeleteClaimModal.vue`
- `views/team/ListIndex.vue`
- `components/sections/SherTokenView/forms/PayDividendsForm.vue`
- `components/sections/SafeView/SafeDeploymentCard.vue`
- `components/sections/ClaimHistoryView/ClaimHistoryActionAlerts.vue`

---

### 7. ⬜ Dropdown → `<UDropdownMenu>` — 3 files

DaisyUI classes: `dropdown`, `dropdown-end`, `dropdown-content`, `dropdown-open`

```html
<!-- Before -->
<div class="dropdown dropdown-end">
  <button class="btn">Open</button>
  <ul class="dropdown-content menu">
    ...
  </ul>
</div>

<!-- After -->
<UDropdownMenu :items="items">
  <UButton>Open</UButton>
</UDropdownMenu>
```

**Files:**

- `components/sections/SherTokenView/forms/DistributeMintForm.vue`
- `components/NotificationDropdown.vue`
- _(dropdown-open in DistributeMintForm)_

---

### 8. ⬜ Loading → `<UIcon>` spinner — 14 files

DaisyUI classes: `loading`, `loading-spinner`, `loading-sm`, `loading-xs`, `loading-lg`

```html
<!-- Before -->
<span class="loading loading-spinner loading-sm"></span>

<!-- After (standalone) -->
<UIcon name="i-lucide-loader-circle" class="animate-spin" />

<!-- After (on a button) -->
<UButton loading />
```

**Files:**

- `views/team/[id]/Accounts/SafeView.vue`
- `components/ui/TimelineIcon.vue`
- `components/sections/WeeklyClaimView/WeeklyClaimActionDropdown.vue`
- `components/sections/VestingView/VestingFlow.vue`
- `components/sections/SafeView/SafeBalanceSection.vue`
- `components/sections/ContractManagementView/TeamContractAdmins.vue`
- `components/sections/ContractManagementView/MainContractSection.vue`
- `components/sections/ContractManagementView/AdvertiseContractSection.vue`
- `components/sections/CashRemunerationView/Form/FilePreviewGallery.vue`
- `components/sections/BankView/BankBalanceSection.vue`
- `components/sections/ContractManagementView/TeamContractsDetail.vue`
- `components/sections/CashRemunerationView/CRWithdrawClaim.vue`
- `components/sections/CashRemunerationView/CRSigne.vue`
- `components/sections/WeeklyClaimView/WeeklyClaimActionEnable.vue`

---

### 9. ⬜ Progress → `<UProgress>` — 2 files

DaisyUI classes: `progress`, `progress-info`, `progress-success`

```html
<!-- Before -->
<progress class="progress progress-success" :value="60" max="100"></progress>

<!-- After -->
<UProgress :value="60" color="success" />
```

**Files:**

- `components/sections/ContractManagementView/BodApprovalModal.vue`
- `components/sections/AdministrationView/BoDElectionDetailsCard.vue`

---

### 10. ⬜ Avatar → `<UAvatar>` — 1 file

DaisyUI classes: `avatar`, `avatar-group`

```html
<!-- Before -->
<div class="avatar-group">
  <div class="avatar"><img src="..." /></div>
</div>

<!-- After -->
<UAvatarGroup :max="3">
  <UAvatar src="..." />
</UAvatarGroup>
```

**Files:**

- `components/sections/CashRemunerationView/Form/ExpandableFileGallery.vue`

---

### 11. ⬜ Collapse → `<UAccordion>` — 1 file

DaisyUI classes: `collapse`, `collapse-arrow`, `collapse-title`, `collapse-content`

```html
<!-- Before -->
<div class="collapse collapse-arrow">
  <div class="collapse-title">Title</div>
  <div class="collapse-content">Content</div>
</div>

<!-- After -->
<UAccordion :items="[{ label: 'Title', content: 'Content' }]" />
```

**Files:**

- `components/sections/DashboardView/TeamMetaSection.vue`

---

### 12. ✅ Stepper → `<UStepper>` — 2 files migrated

DaisyUI classes: `steps`, `step`, `step-primary`

```html
<!-- Before -->
<div class="steps w-full">
  <a class="step" :class="{ 'step-primary': currentStep >= 1 }">Amount</a>
</div>

<!-- After -->
<UStepper :items="stepperItems" v-model="currentStep" disabled class="w-full" />
```

**Migrated:**

- `components/forms/DepositBankForm.vue` ✅
- `components/forms/SafeDepositRouterForm.vue` ✅

**Still using `steps`/`step`:**

- `components/ui/TransactionTimeline.vue`
- `components/forms/DepositSafeForm.vue`
- `components/sections/DashboardView/SetMemberWageStandardStep.vue`
- `components/sections/DashboardView/SetMemberWageOvertimeStep.vue`
- `views/team/[id]/DemoExample.vue` _(demo, lower priority)_

---

### 13. ⬜ Tooltip → `<UTooltip>` — 11 files

DaisyUI classes: `tooltip`, `tooltip-bottom`, `tooltip-top`

```html
<!-- Before -->
<div class="tooltip" data-tip="Copy address">
  <button>...</button>
</div>

<!-- After -->
<UTooltip text="Copy address">
  <UButton>...</UButton>
</UTooltip>
```

**Files:**

- `components/sections/SherTokenView/InvestorActions/InvestInSafeButton.vue`
- `components/sections/ExpenseAccountView/ApprovedExpensesSection.vue`
- `components/sections/ClaimHistoryView/ClaimHistoryWeekNavigator.vue`
- `components/AddressToolTip.vue`
- `components/sections/SherTokenView/ShareholderList.vue`
- `components/sections/SherTokenView/InvestorActions/MintTokenAction.vue`
- `components/sections/SherTokenView/InvestorActions/DistributeMintAction.vue`
- `components/forms/TransferModal.vue`
- `components/sections/SherTokenView/InvestorActions/PayDividendsAction.vue`
- `components/sections/AdministrationView/ElectionActions.vue`
- `components/ToolTip.vue`

---

### 14. ⬜ Miscellaneous — 3 files

| DaisyUI class | Replacement            | File                                              |
| ------------- | ---------------------- | ------------------------------------------------- |
| `stat-title`  | Plain Tailwind `<div>` | `ClaimHistoryView/WeeklyRecap.vue`                |
| `join-item`   | Manual flex grouping   | `components/NotificationDropdown.vue`             |
| `input-group` | Manual flex grouping   | `components/utils/SelectMemberWithTokenInput.vue` |

---

## Migration Order

Migrate shared components first (they fix many instances at once):

1. `components/NotificationDropdown.vue` — touches badge, btn, dropdown, join-item
2. `components/forms/CompensationAmount.vue` — touches badge, form-control, label-text, input-bordered
3. `components/SelectComponent.vue` — touches badge, toggle
4. `components/sections/SherTokenView/InvestorActions/SetCompensationMultiplierButton.vue` — touches badge, form-control, modal-box, modal-action, modal-backdrop
5. `components/sections/ContractManagementView/TeamContractsDetail.vue` — touches btn, input-bordered, loading
6. `components/sections/VestingView/VestingFlow.vue` — touches badge, btn, loading
7. All remaining form controls, then loading spinners, then tooltips

---

## Cleanup Steps (do last)

1. Remove `daisyui` from `app/package.json` devDependencies
2. Remove daisyui plugin from Tailwind/Nuxt config if present
3. Run `npm install`

---

## Verification

```bash
# Should return 0 hits after migration
grep -r "badge\|card-body\|modal-box\|modal-action\|alert-error\|dropdown-content\|loading-spinner\|form-control\|label-text\|table-zebra\|step-primary\|tooltip" app/src/ --include="*.vue" -l

# Build check
npm run build

# Tests
npm run test
```
