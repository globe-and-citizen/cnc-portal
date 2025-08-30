import { computed, unref, type MaybeRef } from 'vue'
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
export function useERC20WriteFunctions(contractAddress: MaybeRef<Address>) {
  const writes = useERC20Writes(contractAddress)
  const { validateAmount, validateAddress } = useValidation()

  /**
   * @description Approve token spending for a specific address
   */
  const writeApprove = (spender: MaybeRef<Address>, amount: MaybeRef<bigint>) => {
    const spenderValue = computed(() => unref(spender))
    const amountValue = computed(() => unref(amount))

    if (!validateAddress(spenderValue.value, 'spender address')) return
    if (!validateAmount(amountValue.value)) return

    return writes.executeWrite(ERC20_FUNCTION_NAMES.APPROVE, [
      spenderValue.value,
      amountValue.value
    ])
  }

  /**
   * @description Transfer tokens to a specific address
   */
  const writeTransfer = (recipient: MaybeRef<Address>, amount: MaybeRef<bigint>) => {
    const recipientValue = computed(() => unref(recipient))
    const amountValue = computed(() => unref(amount))

    if (!validateAddress(recipientValue.value, 'recipient address')) return
    if (!validateAmount(amountValue.value)) return

    return writes.executeWrite(ERC20_FUNCTION_NAMES.TRANSFER, [
      recipientValue.value,
      amountValue.value
    ])
  }

  /**
   * @description Transfer tokens from one address to another (requires approval)
   */
  const writeTransferFrom = (
    sender: MaybeRef<Address>,
    recipient: MaybeRef<Address>,
    amount: MaybeRef<bigint>
  ) => {
    const senderValue = computed(() => unref(sender))
    const recipientValue = computed(() => unref(recipient))
    const amountValue = computed(() => unref(amount))

    if (!validateAddress(senderValue.value, 'sender address')) return
    if (!validateAddress(recipientValue.value, 'recipient address')) return
    if (!validateAmount(amountValue.value)) return

    return writes.executeWrite(ERC20_FUNCTION_NAMES.TRANSFER_FROM, [
      senderValue.value,
      recipientValue.value,
      amountValue.value
    ])
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
