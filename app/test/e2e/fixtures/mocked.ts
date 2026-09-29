/**
 * Fixture for browser scenarios whose owned backend and chain boundaries are
 * fully simulated. No shared Hardhat snapshot is taken, so separate files may
 * execute safely in parallel workers.
 */
export { expect, test } from './base'
