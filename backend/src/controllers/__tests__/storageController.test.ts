import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { getFileUrl } from '../storageController';
import { validateQuery } from '../../validation/middleware/validate';
import { getPresignedUrlQuerySchema } from '../../validation/schemas/storage';
import { getPresignedDownloadUrl } from '../../services/storageService';

vi.mock('../../services/storageService', () => ({
  getPresignedDownloadUrl: vi.fn().mockResolvedValue('https://example.test/file'),
  PRESIGNED_URL_EXPIRATION: 3600,
}));
vi.mock('../../utils', () => ({ captureBackendException: vi.fn() }));

const app = express();
app.get('/', validateQuery(getPresignedUrlQuerySchema), getFileUrl);

describe('file URL query validation', () => {
  it('passes the coerced expiration number to storage', async () => {
    const response = await request(app).get('/').query({ key: 'file', expiresIn: '120' });

    expect(response.status).toBe(200);
    expect(getPresignedDownloadUrl).toHaveBeenCalledWith('file', 120);
    expect(response.body.expiresIn).toBe(120);
  });

  it('rejects an invalid expiration before invoking storage', async () => {
    vi.mocked(getPresignedDownloadUrl).mockClear();
    const response = await request(app).get('/').query({ key: 'file', expiresIn: 'invalid' });

    expect(response.status).toBe(400);
    expect(getPresignedDownloadUrl).not.toHaveBeenCalled();
  });
});
