# Profile — User Stories

**Scope:** Updating the authenticated portal user's display name and profile image from the client navigation

**Last reviewed:** Not yet reviewed

These acceptance criteria follow the
[feature documentation review contract](../../platform/feature-specification-guide.md#human-review-contract).

## Product Model

A portal user has a wallet address and a profile identity. The wallet address identifies the user and cannot be edited from this journey.
The display name and profile image can be changed from the client navigation and are saved through the user profile API.

## Lifecycle

1. An authenticated portal user opens the profile action from the navigation.
2. The user changes the display name or selects a supported profile image.
3. A successful image upload supplies the image URL to the profile draft.
4. Saving persists the changed identity and refreshes the displayed profile.

## Status Overview

| User Story     | Title                   | Actor       | Status        |
| -------------- | ----------------------- | ----------- | ------------- |
| US-PROFILE-001 | Update profile identity | Portal user | 🧪 Validation |

## Test Coverage Overview

Coverage targets compare the required proof below with direct representative `AC-US-*` references, not with the latest test run. The profile
journey remains planned for integrated E2E; focused tests already prove some independent rules.

| User Story     | Main Journey | Coverage Target | Gaps                                                                                           |
| -------------- | ------------ | --------------- | ---------------------------------------------------------------------------------------------- |
| US-PROFILE-001 | ⬜ Planned   | ⚠️ 5/9          | `AC-US-PROFILE-001-01`, `AC-US-PROFILE-001-02`, `AC-US-PROFILE-001-06`, `AC-US-PROFILE-001-07` |

Proof obligations use the [shared proof-strategy registry](../../testing/proof-strategies.md). Multiple IDs for one AC are cumulative.

## US-PROFILE-001: Update Profile Identity

**As a** portal user\
**I want to** update my display name and profile image\
**So that** the portal presents my current identity to other users

### Acceptance Criteria

#### Happy Path

- [x] `AC-US-PROFILE-001-01` An authenticated portal user can open the profile form from the client navigation and save a changed display
      name or profile image.
- [x] `AC-US-PROFILE-001-02` A successful profile-image upload applies the returned URL to the profile draft before it is saved.

#### Business Rules

- [x] `AC-US-PROFILE-001-03` The wallet address is displayed but is not editable in the profile form.
- [x] `AC-US-PROFILE-001-04` A display name must contain between 3 and 100 characters.
- [x] `AC-US-PROFILE-001-05` A profile image must use a supported image type and be no larger than 10 MB.
- [x] `AC-US-PROFILE-001-08` Profile identity surfaces show the user's current name and image when available and use a fallback identity
      when either value is absent.
- [x] `AC-US-PROFILE-001-09` A user can update only their own profile; a missing or different authenticated wallet is rejected.

#### Edge & Error Cases

- [x] `AC-US-PROFILE-001-06` An invalid image is rejected without changing the profile draft.
- [x] `AC-US-PROFILE-001-07` An upload or profile-save failure leaves the form available and exposes the failure to the user.

### Test Coverage

| Acceptance Criterion   | Proof Strategy      | Current Evidence   | Status          |
| ---------------------- | ------------------- | ------------------ | --------------- |
| `AC-US-PROFILE-001-01` | `PS-API-INTEGRATED` | Frontend           | ⚠️ Insufficient |
| `AC-US-PROFILE-001-01` | `PS-BACKEND`        | Frontend           | ⚠️ Insufficient |
| `AC-US-PROFILE-001-02` | `PS-API-INTEGRATED` | Frontend           | ⚠️ Insufficient |
| `AC-US-PROFILE-001-03` | `PS-FRONTEND`       | Frontend           | ✅ Met          |
| `AC-US-PROFILE-001-04` | `PS-FRONTEND`       | Frontend + Backend | ✅ Met          |
| `AC-US-PROFILE-001-04` | `PS-BACKEND`        | Frontend + Backend | ✅ Met          |
| `AC-US-PROFILE-001-05` | `PS-FRONTEND`       | Frontend           | ✅ Met          |
| `AC-US-PROFILE-001-06` | `PS-FRONTEND`       | None linked        | ❌ Missing      |
| `AC-US-PROFILE-001-07` | `PS-BROWSER`        | Frontend           | ⚠️ Insufficient |
| `AC-US-PROFILE-001-08` | `PS-FRONTEND`       | Frontend           | ✅ Met          |
| `AC-US-PROFILE-001-09` | `PS-BACKEND`        | Backend            | ✅ Met          |

**Dependencies:** An authenticated portal user and the user-profile API

## Implementation Evidence

**Implementation evidence reviewed against:** `f801239c22cef84ba985937c2ac8194efb7dd9dd`

- [Navigation profile entry](../../../app/src/components/layout/NavBar.vue) and
  [sidebar profile entry](../../../app/src/components/ui/SidebarLayout.vue)
- [Profile form](../../../app/src/components/forms/EditUserForm.vue) and
  [profile-image upload](../../../app/src/components/forms/ProfileImageUpload.vue)
- [User update mutation](../../../app/src/queries/user.queries.ts) and
  [single-file upload mutation](../../../app/src/queries/file.queries.ts)
- [User request schema](../../../backend/src/validation/schemas/user.ts) and
  [user-schema tests](../../../backend/src/validation/schemas/__tests__/user.test.ts)
- [Profile-image component tests](../../../app/src/components/forms/__tests__/ProfileImageUpload.spec.ts) and
  [profile form tests](../../../app/src/components/forms/__tests__/EditUserForm.spec.ts)

### Test-suite ownership

- [Profile form tests](../../../app/src/components/forms/__tests__/EditUserForm.spec.ts),
  [profile API tests](../../../app/src/api/__tests__/user.api.spec.ts), and
  [profile-image upload tests](../../../app/src/components/forms/__tests__/ProfileImageUpload.spec.ts)
- [Profile navigation tests](../../../app/src/components/layout/__tests__/NavBar.spec.ts),
  [sidebar tests](../../../app/src/components/ui/__tests__/SidebarLayout.spec.ts), and
  [user-identity tests](../../../app/src/components/ui/__tests__/UserIdentity.spec.ts)
- [User API controller tests](../../../backend/src/controllers/__tests__/userController.test.ts) and
  [user request-schema tests](../../../backend/src/validation/schemas/__tests__/user.test.ts)

## Related Documentation

- [File Storage implementation](../../implementation/file-storage/README.md)
- [Request Validation implementation](../../implementation/request-validation/README.md)
- [Client data access implementation](../../implementation/client-data-access/README.md)
- [Authentication](../authentication/README.md)

_[← Back to feature inventory](../README.md)_
