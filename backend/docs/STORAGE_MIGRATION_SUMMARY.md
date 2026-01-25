# Storage Migration Summary - Railway S3

## Overview

This document summarizes the migration from base64 file storage to Railway Object Storage (S3-compatible).

## Architecture

### Storage Service (`src/services/storageService.ts`)

Centralized service handling all S3 operations:

| Function                    | Description                         |
| --------------------------- | ----------------------------------- |
| `uploadFile()`              | Upload single file to S3            |
| `uploadFiles()`             | Upload multiple files (claims)      |
| `uploadProfileImage()`      | Upload user profile image           |
| `deleteFile()`              | Delete file from S3                 |
| `fileExists()`              | Check if file exists                |
| `getPresignedDownloadUrl()` | Generate presigned URL for download |
| `isStorageConfigured()`     | Check if storage env vars are set   |
| `validateFile()`            | Validate file type and size         |
| `generateFileKey()`         | Generate SHA256-hashed filename     |

### File Key Format

Files are stored with hashed names for security:

```
{folder}/{SHA256(timestamp-originalName)}.{ext}
```

Example: `claims/123/a1b2c3d4e5f6...xyz.png`

### Environment Variables

```bash
AWS_S3_BUCKET_NAME=your-bucket-name
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_DEFAULT_REGION=auto
AWS_ENDPOINT_URL=https://storage.railway.app
```

## Data Format

### New FileAttachment Type

```typescript
interface FileAttachment {
  fileName: string; // Original filename
  fileType: string; // MIME type (e.g., image/png)
  fileSize: number; // Size in bytes
  fileKey: string; // S3 storage key
  fileUrl: string; // Presigned download URL
}
```

### Old Format (Deprecated)

```typescript
// DO NOT USE - This format is deprecated
interface OldFileAttachment {
  fileName: string;
  fileType: string;
  fileSize: number;
  fileData: string; // Base64 encoded - REMOVED
}
```

## Updated Files

### Backend

- `src/services/storageService.ts` - New centralized storage service
- `src/controllers/claimController.ts` - Uses uploadFiles/deleteFile
- `src/controllers/userController.ts` - Uses uploadProfileImage
- `src/routes/userRoutes.ts` - Added upload middleware
- `src/routes/uploadRoute.ts` - Generic file upload endpoint
- `src/utils/upload.ts` - Multer memory storage configuration

### Frontend

- `src/types/cash-remuneration.ts` - Updated FileAttachment type
- `src/components/sections/CashRemunerationView/Form/ClaimForm.vue` - Uses fileUrl
- `src/components/sections/ClaimHistoryView/ClaimHistory.vue` - Uses fileUrl

### Tests

- `backend/src/services/__tests__/storageService.test.ts` - 27 tests (98.6% coverage)
- `backend/src/controllers/__tests__/claimController.test.ts` - Updated mock data
- `app/src/components/sections/CashRemunerationView/Form/__tests__/ClaimForm.spec.ts` - Updated mock data

## Test Coverage

### Backend Tests

- **Total**: 476 passed, 9 skipped
- **storageService.ts**: 98.63% coverage

### Frontend Tests

- **Total**: 1102 passed, 154 skipped

## Presigned URL Expiration

| Context           | Duration |
| ----------------- | -------- |
| Claim attachments | 7 days   |
| Generic uploads   | 1 hour   |

## Error Handling

When storage is not configured (missing env vars):

- Returns HTTP 503 (Service Unavailable)
- Error message: "Storage service not configured"

## Security Features

1. **SHA256 Hashing**: Filenames are hashed to prevent enumeration
2. **MIME Type Validation**: Only allowed file types accepted
3. **Size Limits**: 10MB max per file
4. **Presigned URLs**: Time-limited access to files

## Migration Checklist

- [x] Create storageService.ts
- [x] Update claimController.ts
- [x] Update userController.ts
- [x] Add upload middleware to userRoutes.ts
- [x] Remove base64 fallbacks
- [x] Update frontend FileAttachment type
- [x] Update Vue components to use fileUrl
- [x] Update all test files
- [x] Verify TypeScript compilation
- [x] All tests passing

## Date

Completed: $(date +%Y-%m-%d)
