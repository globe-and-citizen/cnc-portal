import { describe, expect, it } from 'vitest';
import {
  addClaimBodySchema,
  parseStoredAttachments,
  updateClaimBodySchema,
} from '../schemas/claim';

const DAILY_CLAIM_MEMO_MAX_LENGTH = 3_000;

const valid = {
  fileKey: 'uploads/abc.pdf',
  fileUrl: 'https://example.com/abc.pdf',
  fileType: 'application/pdf',
  fileSize: 100,
};

describe('stored attachment validation', () => {
  it('accepts a well-formed attachment', () => {
    expect(parseStoredAttachments([valid])).toEqual([valid]);
  });

  it('rejects an empty fileKey', () => {
    expect(parseStoredAttachments([{ ...valid, fileKey: '' }])).toEqual([]);
  });

  it('rejects an invalid fileUrl', () => {
    expect(parseStoredAttachments([{ ...valid, fileUrl: 'not-a-url' }])).toEqual([]);
  });

  it('rejects a non-positive fileSize', () => {
    expect(parseStoredAttachments([{ ...valid, fileSize: 0 }])).toEqual([]);
  });

  it('rejects extra null / scalar entries', () => {
    expect(parseStoredAttachments([null, 'string'])).toEqual([]);
  });
});

describe('claim attachment limits', () => {
  it('enforces the 10-file upper bound', () => {
    const eleven = Array.from({ length: 11 }, () => valid);
    expect(
      addClaimBodySchema.safeParse({
        teamId: 1,
        minutesWorked: 10,
        memo: 'Worked on the release',
        attachments: eleven,
      }).success
    ).toBe(false);
  });

  it('accepts an empty array', () => {
    expect(
      addClaimBodySchema.safeParse({
        teamId: 1,
        minutesWorked: 10,
        memo: 'Worked on the release',
        attachments: [],
      }).success
    ).toBe(true);
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

describe('daily claim memo validation', () => {
  const creationFields = { teamId: 1, minutesWorked: 10 };

  it.each([1, DAILY_CLAIM_MEMO_MAX_LENGTH])(
    'accepts a trimmed %i-character memo when creating a claim',
    (length) => {
      const memo = ` ${'m'.repeat(length)} `;
      const result = addClaimBodySchema.safeParse({ ...creationFields, memo });

      expect(result.success).toBe(true);
      if (result.success) expect(result.data.memo).toBe(memo.trim());
    }
  );

  it.each([1, DAILY_CLAIM_MEMO_MAX_LENGTH])(
    'accepts a trimmed %i-character memo when updating a claim',
    (length) => {
      const memo = ` ${'m'.repeat(length)} `;
      const result = updateClaimBodySchema.safeParse({ memo });

      expect(result.success).toBe(true);
      if (result.success) expect(result.data.memo).toBe(memo.trim());
    }
  );

  it.each([
    ['creation', addClaimBodySchema, creationFields],
    ['update', updateClaimBodySchema, {}],
  ])('rejects an empty or whitespace-only memo on %s', (_operation, schema, fields) => {
    expect(schema.safeParse({ ...fields, memo: '' }).success).toBe(false);
    expect(schema.safeParse({ ...fields, memo: '   ' }).success).toBe(false);
  });

  it.each([
    ['creation', addClaimBodySchema, creationFields],
    ['update', updateClaimBodySchema, {}],
  ])('rejects a memo over the character limit on %s', (_operation, schema, fields) => {
    const result = schema.safeParse({
      ...fields,
      memo: 'm'.repeat(DAILY_CLAIM_MEMO_MAX_LENGTH + 1),
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        `Memo must not exceed ${DAILY_CLAIM_MEMO_MAX_LENGTH} characters`
      );
    }
  });

  it('allows a partial update without a memo', () => {
    expect(updateClaimBodySchema.safeParse({ minutesWorked: 10 }).success).toBe(true);
  });
});
