import { Address } from 'viem';
import { StandardMerkleTree } from '@openzeppelin/merkle-tree';
import publicClient from '../utils/viem.config';

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

  // Build Merkle tree with (address, amount) leaves
  const leaves = shareholders.map((sh) => [sh.address, BigInt(sh.amount)]);
  const tree = StandardMerkleTree.of(leaves, ['address', 'uint256']);

  // Generate proofs for each shareholder
  const proofs: Record<string, string[]> = {};
  for (let i = 0; i < leaves.length; i++) {
    const [address] = leaves[i];
    proofs[(address as string).toLowerCase()] = tree.getProof(i);
  }

  return {
    root: tree.root,
    shareholders,
    proofs,
    blockNumber,
    totalSupply: totalSupply.toString(),
  };
}
