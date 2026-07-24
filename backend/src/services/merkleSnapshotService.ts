import { Address, encodeAbiParameters, keccak256, concat } from 'viem';
import { MerkleTree } from 'merkletreejs';
import publicClient from '../utils/viem.config';

// Double hash matching Investor.sol line 464:
// bytes32 leaf = keccak256(bytes.concat(keccak256(abi.encode(account, amount))));
function computeLeaf(account: Address, amount: bigint): Buffer {
  const innerHash = keccak256(
    encodeAbiParameters([{ type: 'address' }, { type: 'uint256' }], [account, amount])
  );
  const outerHash = keccak256(concat([innerHash]));
  return Buffer.from(outerHash.slice(2), 'hex');
}

const INVESTOR_ABI = [
  {
    type: 'function',
    name: 'getShareholders',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      {
        type: 'tuple[]',
        components: [
          { name: 'address', type: 'address' },
          { name: 'amount', type: 'uint256' },
        ],
      },
    ],
  },
  {
    type: 'function',
    name: 'totalSupply',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
] as const;

interface Shareholder {
  address: string;
  amount: string;
}

interface MerkleSnapshot {
  root: string;
  shareholders: Shareholder[];
  proofs: Record<string, string[]>;
  blockNumber: number;
  totalSupply: string;
}

export interface StoredShareholder {
  shareholder: string;
  amount: string;
}

export interface MerkleProofSet {
  root: string;
  proofs: Record<string, string[]>;
}

/**
 * Rebuild the deterministic Merkle tree from a persisted shareholder list.
 * The persisted list is the source of truth because the on-chain root alone
 * cannot be used to recover its leaves or proofs.
 */
export function buildMerkleProofSet(shareholders: readonly StoredShareholder[]): MerkleProofSet {
  const leafHashes = shareholders.map((shareholder) =>
    computeLeaf(shareholder.shareholder as Address, BigInt(shareholder.amount))
  );
  const tree = new MerkleTree(leafHashes, keccak256, {
    hashLeaves: false,
    sortLeaves: false,
  });

  const proofs: Record<string, string[]> = {};
  for (let i = 0; i < leafHashes.length; i++) {
    const address = shareholders[i].shareholder.toLowerCase();
    proofs[address] = tree
      .getProof(leafHashes[i])
      .map((proof) => `0x${proof.data.toString('hex')}`);
  }

  return {
    root: `0x${tree.getRoot().toString('hex')}`,
    proofs,
  };
}

export async function generateMerkleSnapshot(investorV1Address: Address): Promise<MerkleSnapshot> {
  // Read shareholders from v1 Investor
  const shareHoldersRaw = (await publicClient.readContract({
    address: investorV1Address,
    abi: INVESTOR_ABI,
    functionName: 'getShareholders',
  })) as readonly { address: Address; amount: bigint }[];

  const shareholders = shareHoldersRaw.map((sh) => ({
    address: sh.address.toLowerCase(),
    amount: sh.amount.toString(),
  }));

  // Read total supply to validate snapshot
  const totalSupply = (await publicClient.readContract({
    address: investorV1Address,
    abi: INVESTOR_ABI,
    functionName: 'totalSupply',
  })) as bigint;

  // Get current block number
  const blockNumber = Number(await publicClient.getBlockNumber());

  // Validate that sum of shareholders == totalSupply
  const shareholderSum = shareholders.reduce((sum, sh) => sum + BigInt(sh.amount), 0n);

  if (shareholderSum !== totalSupply) {
    throw new Error(
      `Shareholder sum (${shareholderSum}) does not match totalSupply (${totalSupply})`
    );
  }

  // Build Merkle tree with double-hashed leaves matching Investor.sol
  const { root, proofs } = buildMerkleProofSet(
    shareholders.map((shareholder) => ({
      shareholder: shareholder.address,
      amount: shareholder.amount,
    }))
  );

  return {
    root,
    shareholders,
    proofs,
    blockNumber,
    totalSupply: totalSupply.toString(),
  };
}
