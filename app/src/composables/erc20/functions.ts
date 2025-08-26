import { type Address } from 'viem'
import { ERC20_FUNCTION_NAMES } from './types'
import { useERC20Writes } from './writes'
import { useValidation } from './utils'

/**
 * ERC20 contract write functions - handles token transfers and approvals
 * 
 * @returns {object} All ERC20 write state and functions:
 *   - ...writes: underlying write state and helpers
 *   - writeApprove: approve token spending
 *   - writeTransfer: transfer tokens
 *   - writeTransferFrom: transfer tokens on behalf of another address
 */
export function useERC20WriteFunctions(contractAddress: Address) {
  const writes = useERC20Writes(contractAddress)
  const { validateAmount, validateAddress } = useValidation()
  /**
   * @description Approve token spending for a specific address
   */
  const writeApprove = (spender: Address, amount: bigint) => {
    if (!validateAddress(spender, 'spender address')) return
    if (!validateAmount(amount)) return
    return writes.executeWrite(ERC20_FUNCTION_NAMES.APPROVE, [spender, amount])
  }

  /**
   * @description Transfer tokens to a specific address
   */
  const writeTransfer = (recipient: Address, amount: bigint) => {
    if (!validateAddress(recipient, 'recipient address')) return
    if (!validateAmount(amount)) return
    return writes.executeWrite(ERC20_FUNCTION_NAMES.TRANSFER, [recipient, amount])
  }

  /**
   * @description Transfer tokens from one address to another (requires approval)
   */
  const writeTransferFrom = (sender: Address, recipient: Address, amount: bigint) => {
    if (!validateAddress(sender, 'sender address')) return
    if (!validateAddress(recipient, 'recipient address')) return
    if (!validateAmount(amount)) return
    return writes.executeWrite(ERC20_FUNCTION_NAMES.TRANSFER_FROM, [sender, recipient, amount])
  }

  return {
    // Write state
    ...writes,
    // Transfer and approval functions
    writeApprove,
    writeTransfer,
    writeTransferFrom
  }
}
