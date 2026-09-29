import { describe, expect, it } from 'vitest';
import { addActionBodySchema } from '../actions';

const validAction = {
  teamId: 1,
  actionId: 0,
  description: 'Pay Dividends Request',
  targetAddress: '0x1111111111111111111111111111111111111111',
  data: '0x1234',
};

describe('addActionBodySchema', () => {
  it('accepts the zero-based identifier of the first Board action', () => {
    expect(addActionBodySchema.parse(validAction)).toEqual(validAction);
  });

  it('rejects negative Board action identifiers', () => {
    const result = addActionBodySchema.safeParse({ ...validAction, actionId: -1 });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Must be a non-negative integer');
  });
});
