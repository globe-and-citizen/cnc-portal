/**
 * Bank contract composables - Legacy file
 * 
 * This file now re-exports from the modular bank composables structure
 * for backward compatibility. New code should import from './bank/index.ts'
 * or the specific modules directly.
 */

export * from './bank'
export { default as useBankContract } from './bank'
