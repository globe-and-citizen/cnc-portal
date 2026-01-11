# Railway Storage Setup Guide

This document explains how to configure and use Railway Object Storage (S3-compatible) for file uploads in the CNC Portal backend.

## Overview

The CNC Portal now uses Railway Storage for storing files (images and documents) instead of storing them directly in the database as BLOB/BYTEA. This approach offers:

- **Better Performance**: Files are served directly from S3, reducing database load
- **Scalability**: Object storage scales independently from the database
- **Cost Efficiency**: Object storage is optimized for file storage
- **Reduced Database Size**: Only file metadata is stored in the database

## Architecture

```
┌─────────────┐     ┌─────────────────┐     ┌──────────────────┐
│   Frontend  │────▶│  Backend API    │────▶│ Railway Storage  │
│  (Vue.js)   │     │  (Express.js)   │     │  (S3-compatible) │
└─────────────┘     └─────────────────┘     └──────────────────┘
                            │
                            ▼
                    ┌───────────────┐
                    │  PostgreSQL   │
                    │  (Metadata)   │
                    └───────────────┘
```

### Data Flow

1. **Upload**: Files are uploaded via multipart/form-data to the backend
2. **Storage**: Backend uploads files to Railway Storage using S3 API
3. **Metadata**: Only file metadata (id, key, fileName, fileType, fileSize, uploadedAt) is stored in PostgreSQL
4. **Download**: Files are accessed via presigned URLs that expire after a configurable time

## Railway Storage Setup

### 1. Create a Storage Bucket in Railway

1. Go to your Railway project dashboard
2. Click **Create** → **Bucket**
3. Select a region close to your users
4. Name your bucket (e.g., `cnc-portal-storage`)

### 2. Get Credentials

After creating the bucket, go to the **Credentials** tab to find:

- `BUCKET` - The globally unique bucket name
- `ACCESS_KEY_ID` - The S3 access key ID
- `SECRET_ACCESS_KEY` - The S3 secret access key
- `REGION` - Usually `auto`
- `ENDPOINT` - Usually `https://storage.railway.app`

### 3. Configure Environment Variables

Add these variables to your Railway service (or `.env` file for local development):

```bash
# Railway Storage Configuration
BUCKET=your-bucket-name-abc123
ACCESS_KEY_ID=your-access-key-id
SECRET_ACCESS_KEY=your-secret-access-key
REGION=auto
ENDPOINT=https://storage.railway.app
```

### 4. Using Variable References (Recommended)

Railway supports variable references between services. In your backend service:

1. Go to **Variables** tab
2. Add references to the bucket variables:

```
BUCKET=${{Bucket.BUCKET}}
ACCESS_KEY_ID=${{Bucket.ACCESS_KEY_ID}}
SECRET_ACCESS_KEY=${{Bucket.SECRET_ACCESS_KEY}}
REGION=${{Bucket.REGION}}
ENDPOINT=${{Bucket.ENDPOINT}}
```

## API Endpoints

### Upload Files (Claims)

Files are uploaded as part of claim creation/update:

```
POST /api/claim
Content-Type: multipart/form-data

files: [File1, File2, ...]
hoursWorked: 8
memo: "Work description"
teamId: 1
```

### Upload Profile Image

```
PUT /api/user/:address
Content-Type: multipart/form-data

profileImage: [File]
name: "John Doe"
```

### Get File Download URL

```
GET /api/file/url?key=claims/2024/01/abc123.pdf&expiresIn=3600
Authorization: Bearer <token>

Response:
{
  "url": "https://...",
  "expiresIn": 3600
}
```

### Direct File Download (Redirect)

```
GET /api/file/download/claims/2024/01/abc123.pdf
Authorization: Bearer <token>

Response: 302 Redirect to presigned URL
```

## File Metadata Schema

Files stored in Railway Storage have this metadata structure (stored in PostgreSQL as JSON):

```typescript
interface FileMetadata {
  id: string; // Unique file ID (UUID)
  key: string; // S3 object key (path in bucket)
  fileName: string; // Original file name
  fileType: string; // MIME type
  fileSize: number; // Size in bytes
  uploadedAt: string; // ISO date string
}
```

## Folder Structure in Storage

Files are organized by type and date:

```
bucket/
├── claims/
│   ├── 2024/
│   │   ├── 01/
│   │   │   ├── uuid1.pdf
│   │   │   └── uuid2.jpg
│   │   └── 02/
│   │       └── uuid3.png
├── profiles/
│   └── 0x1234.../
│       └── uuid4.jpg
└── images/
    └── 2024/
        └── 01/
            └── uuid5.png
```

## Configuration Options

| Environment Variable | Required | Default                       | Description                 |
| -------------------- | -------- | ----------------------------- | --------------------------- |
| `BUCKET`             | Yes      | -                             | Railway Storage bucket name |
| `ACCESS_KEY_ID`      | Yes      | -                             | S3 access key ID            |
| `SECRET_ACCESS_KEY`  | Yes      | -                             | S3 secret access key        |
| `REGION`             | No       | `auto`                        | S3 region                   |
| `ENDPOINT`           | No       | `https://storage.railway.app` | S3 endpoint URL             |

## File Validation

### Allowed MIME Types

**Images:**

- `image/png`
- `image/jpeg`
- `image/jpg`
- `image/webp`

**Documents:**

- `application/pdf`
- `text/plain`
- `application/zip`
- `application/x-zip-compressed`
- `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (docx)

### Limits

- **Maximum file size**: 10MB per file
- **Maximum files per claim**: 10 files

## Backwards Compatibility

The system maintains backwards compatibility with legacy data:

1. **Legacy files** (stored as base64 in database) are still readable
2. If Railway Storage is not configured, the system falls back to database storage (deprecated)
3. New uploads always use Railway Storage when configured

## Troubleshooting

### "Storage not configured" Error

Ensure all required environment variables are set:

- `BUCKET`
- `ACCESS_KEY_ID`
- `SECRET_ACCESS_KEY`

### "Failed to upload file" Error

1. Check if the bucket exists in Railway
2. Verify credentials are correct
3. Check file size doesn't exceed 10MB
4. Verify file MIME type is allowed

### Files Not Accessible

1. Presigned URLs expire (default: 1 hour)
2. Use `/api/file/url` endpoint to get a new presigned URL
3. Check if the file exists in the bucket

## Security Considerations

1. **Presigned URLs**: Files are accessed via presigned URLs that expire
2. **Authentication**: All file endpoints require JWT authentication
3. **Authorization**: Users can only access files from their own claims/profile
4. **MIME Validation**: Files are validated on upload
5. **Size Limits**: Maximum file size prevents abuse

## Migration from Database Storage

If you have existing files stored as base64 in the database:

1. The system automatically handles both formats during reads
2. New uploads will use Railway Storage
3. For complete migration, you can write a script to:
   - Read base64 data from database
   - Upload to Railway Storage
   - Update metadata in database
   - Remove base64 data

## References

- [Railway Storage Documentation](https://docs.railway.com/guides/storage-buckets)
- [AWS S3 SDK Documentation](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/)
