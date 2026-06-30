import type { Abi } from 'viem'
import Ownable from './json/Ownable.json'
import Pausable from './json/Pausable.json'

// OpenZeppelin's `Pausable` only exposes the `paused()` view; the public
// `pause()` / `unpause()` entrypoints are declared by the concrete contracts,
// so they are not part of `Pausable.json`. Add them here so the shared
// management ABI can drive both the status read and the pause/unpause writes.
const PAUSE_CONTROLS = [
  { type: 'function', name: 'pause', inputs: [], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'unpause', inputs: [], outputs: [], stateMutability: 'nonpayable' }
] as const

/**
 * Minimal ABI shared by every team contract on the contract-management table.
 *
 * Combines Ownable (`owner`, `transferOwnership`, `renounceOwnership`) and
 * Pausable (`paused`, `pause`, `unpause`). It lets the table read and manage
 * any Ownable/Pausable contract without importing each contract's full ABI.
 */
export const OWNABLE_PAUSABLE_ABI = [...Ownable, ...Pausable, ...PAUSE_CONTROLS] as Abi
