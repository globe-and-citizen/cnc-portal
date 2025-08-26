import { computed } from 'vue'
import { type Address } from 'viem'
import { useAccount } from '@wagmi/vue'
import { useToastStore } from '@/stores'
import { ERC20_FUNCTION_NAMES } from './types'
import { useContractWrites, type ContractWriteConfig } from '../contracts/useContractWrites'
import ERC20ABI from '@/artifacts/abi/erc20.json'
import { useValidation } from './utils'

/**
 * ERC20 contract write functions
 * @param contractAddress The address of the ERC20 contract
 */
export function useERC20WriteFunctions(contractAddress: Address) {
  const { chainId } = useAccount()
  const { validateAmount, validateAddress } = useValidation()
  const { addErrorToast } = useToastStore()
  const erc20Address = computed(() => contractAddress)

  // Use the generic contract writes composable
  const writes = useContractWrites({
    contractAddress: erc20Address.value!,
    abi: ERC20ABI,
    chainId: chainId.value
  } as ContractWriteConfig)

  const writeApprove = async (spender: Address, amount: bigint) => {
    if (!validateAddress(spender, 'spender address')) return
    if (!validateAmount(amount)) return
    return writes.executeWrite(ERC20_FUNCTION_NAMES.APPROVE, [spender, amount])
  }

  const writeTransfer = async (recipient: Address, amount: bigint) => {
    if (!validateAddress(recipient, 'recipient address')) return
    if (!validateAmount(amount)) return
    return writes.executeWrite(ERC20_FUNCTION_NAMES.TRANSFER, [recipient, amount])
  }

  const writeTransferFrom = async (sender: Address, recipient: Address, amount: bigint) => {
    if (!validateAddress(sender, 'sender address')) return
    if (!validateAddress(recipient, 'recipient address')) return
    if (!validateAmount(amount)) return
    return writes.executeWrite(ERC20_FUNCTION_NAMES.TRANSFER_FROM, [sender, recipient, amount])
  }

  return {
    writeApprove,
    writeTransfer,
    writeTransferFrom
  }
}
