// Generic contract writes composable - can be used for any contract
export {
  useContractWrites,
  type ContractWriteOptions,
  type ContractWriteConfig
} from './useContractWrites'

// Contract-specific writes composables
export { useVestingWrites } from './useVestingWrites'
