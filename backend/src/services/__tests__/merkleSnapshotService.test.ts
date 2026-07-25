import { Address } from 'viem';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { buildMerkleProofSet, generateMerkleSnapshot } from '../merkleSnapshotService';
import publicClient from '../../utils/viem.config';

vi.mock('../../utils/viem.config', () => ({
  default: {
    readContract: vi.fn(),
    getBlockNumber: vi.fn(),
  },
}));

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

const INVESTOR_V1_ADDRESS = '0x3333333333333333333333333333333333333333' as Address;

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

describe('generateMerkleSnapshot', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reads the v1 cap table, validates it, and builds a Merkle snapshot', async () => {
    vi.mocked(publicClient.readContract).mockImplementation(async ({ functionName }) => {
      if (functionName === 'getShareholders') {
        return shareholders.map((s) => ({ address: s.shareholder, amount: BigInt(s.amount) }));
      }
      if (functionName === 'totalSupply') {
        return 300n;
      }
      throw new Error(`Unexpected functionName: ${functionName}`);
    });
    vi.mocked(publicClient.getBlockNumber).mockResolvedValue(42n);

    const snapshot = await generateMerkleSnapshot(INVESTOR_V1_ADDRESS);

    expect(snapshot.shareholders).toEqual([
      { address: shareholders[0].shareholder.toLowerCase(), amount: '100' },
      { address: shareholders[1].shareholder.toLowerCase(), amount: '200' },
    ]);
    expect(snapshot.totalSupply).toBe('300');
    expect(snapshot.blockNumber).toBe(42);
    expect(snapshot.root).toMatch(/^0x[0-9a-f]{64}$/);
    expect(Object.keys(snapshot.proofs)).toEqual([
      shareholders[0].shareholder.toLowerCase(),
      shareholders[1].shareholder.toLowerCase(),
    ]);
    // Same leaves + encoding as buildMerkleProofSet, so the roots must match.
    expect(snapshot.root).toBe(buildMerkleProofSet(shareholders).root);
  });

  it('throws when the shareholder sum does not match totalSupply', async () => {
    vi.mocked(publicClient.readContract).mockImplementation(async ({ functionName }) => {
      if (functionName === 'getShareholders') {
        return shareholders.map((s) => ({ address: s.shareholder, amount: BigInt(s.amount) }));
      }
      if (functionName === 'totalSupply') {
        return 999n;
      }
      throw new Error(`Unexpected functionName: ${functionName}`);
    });
    vi.mocked(publicClient.getBlockNumber).mockResolvedValue(42n);

    await expect(generateMerkleSnapshot(INVESTOR_V1_ADDRESS)).rejects.toThrow(
      /does not match totalSupply/i
    );
  });
});
