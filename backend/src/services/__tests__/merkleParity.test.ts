import { concat, keccak256, type Hex } from 'viem';
import { describe, expect, it } from 'vitest';
import { buildMerkleProofSet, type StoredShareholder } from '../merkleSnapshotService';
import goldenVector from '../../../../contract/test/fixtures/investor-migration-merkle.json';

/**
 * Parity guard between the backend Merkle builder and Investor.sol.
 *
 * The builder and the contract each own half of the migration: the backend
 * commits the root and serves the proofs, the contract verifies them with
 * OpenZeppelin's `MerkleProof.verify`. Nothing forced the two halves to agree,
 * and they silently didn't — the tree was built with unsorted pairs while
 * `MerkleProof` hashes pairs commutatively, so every claim reverted with
 * `Investor__InvalidProof` past two shareholders.
 *
 * These tests encode the contract's side as the specification.
 */

/**
 * Faithful transcription of OpenZeppelin `MerkleProof.processProof` — the exact
 * computation Investor.sol runs inside `_migrate`. Kept deliberately literal
 * (no helpers) so it reads against the Solidity source.
 */
function processProof(proof: readonly Hex[], leaf: Hex): Hex {
  let computed = leaf;
  for (const sibling of proof) {
    computed =
      BigInt(computed) < BigInt(sibling)
        ? keccak256(concat([computed, sibling]))
        : keccak256(concat([sibling, computed]));
  }
  return computed;
}

/** Leaf encoding from Investor.sol: keccak256(bytes.concat(keccak256(abi.encode(account, amount)))). */
function leafOf(account: string, amount: string): Hex {
  const packed = `0x${account.slice(2).toLowerCase().padStart(64, '0')}${BigInt(amount)
    .toString(16)
    .padStart(64, '0')}` as Hex;
  return keccak256(concat([keccak256(packed)]));
}

/** Deterministic cap table of `size` distinct holders — no randomness, no shared state. */
function capTable(size: number): StoredShareholder[] {
  return Array.from({ length: size }, (_, i) => ({
    shareholder: `0x${(i + 1).toString(16).padStart(40, '0')}`,
    amount: String((i + 1) * 1_000 + i),
  }));
}

describe('buildMerkleProofSet — on-chain verification parity', () => {
  // 1 and 2 holders pass even with mismatched pair hashing, which is exactly
  // why the original bug survived: the existing suite only ever used two.
  for (const size of [1, 2, 3, 4, 5, 6, 7, 8, 12, 16, 17]) {
    it(`produces proofs that MerkleProof.verify accepts for ${size} shareholder(s)`, () => {
      const shareholders = capTable(size);
      const { root, proofs } = buildMerkleProofSet(shareholders);

      for (const { shareholder, amount } of shareholders) {
        const leaf = leafOf(shareholder, amount);
        const proof = proofs[shareholder.toLowerCase()] as Hex[];

        expect(proof, `no proof emitted for ${shareholder}`).toBeDefined();
        expect(
          processProof(proof, leaf).toLowerCase(),
          `proof for ${shareholder} does not reproduce the root`
        ).toBe(root.toLowerCase());
      }
    });
  }

  it('rejects a proof replayed against a different holder', () => {
    const shareholders = capTable(5);
    const { root, proofs } = buildMerkleProofSet(shareholders);

    const stolen = proofs[shareholders[0].shareholder.toLowerCase()] as Hex[];
    const otherLeaf = leafOf(shareholders[3].shareholder, shareholders[3].amount);

    expect(processProof(stolen, otherLeaf).toLowerCase()).not.toBe(root.toLowerCase());
  });

  it('rejects a proof for an amount the holder does not own', () => {
    const shareholders = capTable(5);
    const { root, proofs } = buildMerkleProofSet(shareholders);

    const { shareholder, amount } = shareholders[2];
    const proof = proofs[shareholder.toLowerCase()] as Hex[];
    const inflated = leafOf(shareholder, String(BigInt(amount) + 1n));

    expect(processProof(proof, inflated).toLowerCase()).not.toBe(root.toLowerCase());
  });
});

describe('buildMerkleProofSet — golden vector', () => {
  // Same file the contract suite loads (contract/test/Investor.spec.ts), so the
  // two sides are pinned to identical bytes rather than to each other's ideas.
  it('reproduces the committed root and proofs byte for byte', () => {
    const { root, proofs } = buildMerkleProofSet(goldenVector.shareholders);

    expect(root).toBe(goldenVector.root);
    expect(proofs).toEqual(goldenVector.proofs);
  });

  it('has a golden vector that verifies under MerkleProof.verify', () => {
    for (const { shareholder, amount } of goldenVector.shareholders) {
      const proof = (goldenVector.proofs as Record<string, string[]>)[
        shareholder.toLowerCase()
      ] as Hex[];

      expect(processProof(proof, leafOf(shareholder, amount)).toLowerCase()).toBe(
        goldenVector.root.toLowerCase()
      );
    }
  });
});
