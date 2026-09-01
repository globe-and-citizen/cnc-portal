/**
 * Minimal ABI shared by every team contract on the contract-management table.
 *
 * Combines Ownable (`owner`, `transferOwnership`, `renounceOwnership`) and
 * Pausable (`paused`, `pause`, `unpause`). It lets the table read and manage
 * any Ownable/Pausable contract without importing each contract's full ABI.
 *
 * Hand-written rather than generated: there is no `OwnablePausable.sol` to
 * compile — this is a synthetic surface. OpenZeppelin's `Pausable` only exposes
 * the `paused()` view; the public `pause()` / `unpause()` entrypoints are
 * declared by the concrete contracts, so they are not part of `Pausable.json`.
 *
 * Written as an `as const` literal (not `as Abi`) so viem can resolve `args`
 * tuples and return types — see contract/wagmi.config.ts for the rationale.
 */
export const ownablePausableAbi = [
  {
    type: 'function',
    name: 'owner',
    inputs: [],
    outputs: [{ name: '', type: 'address', internalType: 'address' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'transferOwnership',
    inputs: [{ name: 'newOwner', type: 'address', internalType: 'address' }],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'renounceOwnership',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'paused',
    inputs: [],
    outputs: [{ name: '', type: 'bool', internalType: 'bool' }],
    stateMutability: 'view'
  },
  { type: 'function', name: 'pause', inputs: [], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'unpause', inputs: [], outputs: [], stateMutability: 'nonpayable' },
  {
    type: 'event',
    name: 'OwnershipTransferred',
    inputs: [
      { name: 'previousOwner', type: 'address', indexed: true, internalType: 'address' },
      { name: 'newOwner', type: 'address', indexed: true, internalType: 'address' }
    ],
    anonymous: false
  },
  {
    type: 'event',
    name: 'Paused',
    inputs: [{ name: 'account', type: 'address', indexed: false, internalType: 'address' }],
    anonymous: false
  },
  {
    type: 'event',
    name: 'Unpaused',
    inputs: [{ name: 'account', type: 'address', indexed: false, internalType: 'address' }],
    anonymous: false
  }
] as const
