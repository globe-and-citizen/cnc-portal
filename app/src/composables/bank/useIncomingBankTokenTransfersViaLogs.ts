import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { parseAbiItem } from 'viem'
import { useGetTeamOfficersQuery, type TeamOfficerWithContracts } from '@/queries/contract.queries'
import type { IncomingBankTokenTransferFeed } from '@/types/contract-events/bank'
import {
  str,
  useContractEventsViaLogs,
  type ContractAddressInput,
  type EventMapContext,
  type ScanTarget
} from '@/composables/eventsViaLogs'

const BANK_TOKEN_TRANSFER_ABI = [
  parseAbiItem(
    'event TokenTransfer(address indexed sender, address indexed to, address token, uint256 amount)'
  )
]

const empty = (): IncomingBankTokenTransferFeed => ({ bankTokenTransfers: { items: [] } })

/**
 * Build Bank scan targets from every Officer generation, retaining the deploy
 * boundary for each generation. The current Bank is retained as a fallback for
 * older companies without Officer history.
 */
export function bankScanTargets(
  officers: readonly TeamOfficerWithContracts[] | undefined,
  currentBankAddress: string | undefined
): ScanTarget[] {
  const targets = (officers ?? []).flatMap((officer) =>
    officer.contracts
      .filter((contract) => contract.type === 'Bank')
      .map((contract) => ({
        address: contract.address,
        ...(officer.deployBlockNumber ? { fromBlock: BigInt(officer.deployBlockNumber) } : {})
      }))
  )

  if (
    currentBankAddress &&
    !targets.some((target) => target.address.toLowerCase() === currentBankAddress.toLowerCase())
  ) {
    targets.push({ address: currentBankAddress })
  }

  return targets
}

/**
 * Reconstruct the token transfers from every known Bank generation into one
 * account. This replaces the former global indexed query while retaining
 * transfers from Banks that were replaced after a contract migration.
 */
export function useIncomingBankTokenTransfersViaLogs(
  teamId: MaybeRefOrGetter<string | number | null | undefined>,
  recipientAddress: MaybeRefOrGetter<string | undefined>,
  currentBankAddress: MaybeRefOrGetter<string | undefined>
) {
  const normalizedTeamId = computed(() => toValue(teamId) ?? '')
  const recipient = computed(() => toValue(recipientAddress)?.toLowerCase() ?? '')
  const officers = useGetTeamOfficersQuery({
    queryParams: { teamId: normalizedTeamId }
  })
  const targets = computed(() => bankScanTargets(officers.data.value, toValue(currentBankAddress)))

  const events = useContractEventsViaLogs<IncomingBankTokenTransferFeed>({
    contractAddress: targets as unknown as MaybeRefOrGetter<ContractAddressInput>,
    queryKey: computed(() => `incoming-bank-token-transfers-${recipient.value}`),
    eventAbi: BANK_TOKEN_TRANSFER_ABI,
    empty,
    mapEvent: ({
      out,
      id,
      timestamp,
      contract,
      eventName,
      args
    }: EventMapContext<IncomingBankTokenTransferFeed>) => {
      if (
        eventName !== 'TokenTransfer' ||
        !recipient.value ||
        String(args.to ?? '').toLowerCase() !== recipient.value
      ) {
        return
      }

      out.bankTokenTransfers.items.push({
        id,
        contractAddress: contract,
        sender: String(args.sender ?? ''),
        to: String(args.to ?? ''),
        token: String(args.token ?? ''),
        amount: str(args.amount ?? 0n),
        timestamp
      })
    }
  })

  return {
    result: events.result,
    loading: computed(() => events.loading.value || officers.isPending.value),
    error: computed(() => events.error.value ?? officers.error.value),
    refetch: events.refetch
  }
}
