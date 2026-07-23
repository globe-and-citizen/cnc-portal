import { describe, expect, it } from 'vitest';
import { buildMerkleProofSet } from '../merkleSnapshotService';

const shareholders = [
  {
    shareholder: '0x1111111111111111111111111111111111111111',
    amount: '100',
  },
  {
    shareholder: '0x2222222222222222222222222222222222222222',
    amount: '200',
  },
];

describe('buildMerkleProofSet', () => {
  it('rebuilds deterministic proofs from the persisted shareholder snapshot', () => {
    const first = buildMerkleProofSet(shareholders);
    const second = buildMerkleProofSet(shareholders);

    expect(first).toEqual(second);
    expect(first.root).toMatch(/^0x[0-9a-f]{64}$/);
    expect(Object.keys(first.proofs)).toEqual([
      shareholders[0].shareholder,
      shareholders[1].shareholder,
    ]);
    expect(first.proofs[shareholders[0].shareholder]).toHaveLength(1);
    expect(first.proofs[shareholders[1].shareholder]).toHaveLength(1);
  });
});
