import { describe, expect, it } from 'vitest';
import {
  fileAttachmentSchema,
  fileAttachmentsArraySchema,
  parseStoredAttachments,
} from '../schemas/claim';

const valid = {
  fileKey: 'uploads/abc.pdf',
  fileUrl: 'https://example.com/abc.pdf',
  fileType: 'application/pdf',
  fileSize: 100,
};

describe('fileAttachmentSchema', () => {
  it('accepts a well-formed attachment', () => {
    expect(fileAttachmentSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects an empty fileKey', () => {
    const result = fileAttachmentSchema.safeParse({ ...valid, fileKey: '' });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid fileUrl', () => {
    const result = fileAttachmentSchema.safeParse({ ...valid, fileUrl: 'not-a-url' });
    expect(result.success).toBe(false);
  });

  it('rejects a non-positive fileSize', () => {
    const result = fileAttachmentSchema.safeParse({ ...valid, fileSize: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects extra null / scalar entries', () => {
    expect(fileAttachmentSchema.safeParse(null).success).toBe(false);
    expect(fileAttachmentSchema.safeParse('string').success).toBe(false);
  });
});

describe('fileAttachmentsArraySchema', () => {
  it('enforces the 10-file upper bound', () => {
    const eleven = Array.from({ length: 11 }, () => valid);
    expect(fileAttachmentsArraySchema.safeParse(eleven).success).toBe(false);
  });

  it('accepts an empty array', () => {
    expect(fileAttachmentsArraySchema.safeParse([]).success).toBe(true);
  });
});

describe('parseStoredAttachments', () => {
  it('returns an empty array for null / undefined / non-array', () => {
    expect(parseStoredAttachments(null)).toEqual([]);
    expect(parseStoredAttachments(undefined)).toEqual([]);
    expect(parseStoredAttachments('string')).toEqual([]);
    expect(parseStoredAttachments(42)).toEqual([]);
  });

  it('drops malformed entries and keeps valid ones', () => {
    const mixed = [
      valid,
      null,
      'string',
      { fileKey: '', fileUrl: 'x', fileType: 't', fileSize: 1 },
      { fileUrl: 'https://example.com/x', fileType: 'text/plain', fileSize: 10 }, // missing fileKey
      { ...valid, fileKey: 'uploads/def.pdf' },
    ];

    const result = parseStoredAttachments(mixed);
    expect(result).toHaveLength(2);
    expect(result[0].fileKey).toBe('uploads/abc.pdf');
    expect(result[1].fileKey).toBe('uploads/def.pdf');
  });
});
