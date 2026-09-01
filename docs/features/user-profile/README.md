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

## US-PROFILE-001: Update Profile Identity

**As a** portal user\
**I want to** update my display name and profile image\
**So that** the portal presents my current identity to other users

### Acceptance Criteria

#### Happy Path

- [x] An authenticated portal user can open the profile form from the client navigation and save a changed display name or profile image.
- [x] A successful profile-image upload applies the returned URL to the profile draft before it is saved.

#### Business Rules

- [x] The wallet address is displayed but is not editable in the profile form.
- [x] A display name must contain between 3 and 100 characters.
- [x] A profile image must use a supported image type and be no larger than 10 MB.

#### Edge & Error Cases

- [x] An invalid image is rejected without changing the profile draft.
- [x] An upload or profile-save failure leaves the form available and exposes the failure to the user.

**Dependencies:** An authenticated portal user and the user-profile API

## Implementation Evidence

**Implementation evidence reviewed against:** `787921e5cf9dd1cf46fd0f69f651dba7d8785374`

- [Navigation profile entry](../../../app/src/components/layout/NavBar.vue) and
  [sidebar profile entry](../../../app/src/components/ui/SidebarLayout.vue)
- [Profile form](../../../app/src/components/forms/EditUserForm.vue) and
  [profile-image upload](../../../app/src/components/forms/ProfileImageUpload.vue)
- [User update mutation](../../../app/src/queries/user.queries.ts) and
  [single-file upload mutation](../../../app/src/queries/file.queries.ts)
- [Profile-image component tests](../../../app/src/components/forms/__tests__/ProfileImageUpload.spec.ts) and
  [file-query tests](../../../app/src/queries/__tests__/file.queries.spec.ts)

## Related Documentation

- [Client data access implementation](../../implementation/client-data-access/README.md)
- [Authentication](../authentication/README.md)

_[← Back to feature inventory](../README.md)_
