import { isAddress, type Address } from 'viem'
import { FEE_COLLECTOR_ADDRESS } from '@/constant'
import addressesV1 from '@/artifacts/deployed_addresses/V1/chain-137.json'
import addressesV2 from '@/artifacts/deployed_addresses/V2/chain-137.json'
import versionRegistry from '@/artifacts/version-registry.json'
import type { BankEventFeed } from '@/types/contract-events/bank'

const POLYGON_FEE_COLLECTORS = [
  (addressesV1 as Record<string, string>)[versionRegistry.folders.V1.implementations.FeeCollector],
  (addressesV2 as Record<string, string>)[versionRegistry.folders.V2.implementations.FeeCollector]
]

/**
 * FeeCollector is redeployed with each full contract generation. Polygon has
 * historical V1 and V2 collectors; single-generation networks use the current
 * deployment only. Addresses are deduplicated because the current deployment
 * is also present in the V2 snapshot.
 */
export function feeCollectorAddressesForChain(
  chainId: number,
  currentFeeCollector: Address | null = FEE_COLLECTOR_ADDRESS
): Address[] {
  const candidates =
    chainId === 137 ? [...POLYGON_FEE_COLLECTORS, currentFeeCollector] : [currentFeeCollector]
  const unique = new Map<string, Address>()
  for (const address of candidates) {
    if (!address || !isAddress(address)) continue
    unique.set(address.toLowerCase(), address as Address)
  }
  return [...unique.values()]
}

interface EventIdentity {
  operationId: string
  logIndex: number
}

function eventIdentity(id: string): EventIdentity | null {
  const separator = id.lastIndexOf('-')
  if (separator < 1) return null
  const logIndex = Number(id.slice(separator + 1))
  if (!Number.isInteger(logIndex)) return null
  return { operationId: id.slice(0, separator), logIndex }
}

/**
 * V0 / V0.1 fee events do not carry the paid token. Their Bank contracts emit
 * FeePaid immediately before the corresponding Transfer or TokenTransfer, so
 * pair each legacy fee with the next movement from the same Bank and on-chain
 * transaction. A missing movement is deliberately left unresolved.
 */
export function normalizeLegacyBankFeeTokens(feed: BankEventFeed): BankEventFeed {
  const movements = [
    ...feed.bankTransfers.items.map((row) => ({ ...row, token: null })),
    ...feed.bankTokenTransfers.items.map((row) => ({ ...row, token: row.token }))
  ]

  const bankFeePaids = feed.bankFeePaids.items.map((fee) => {
    if (fee.token !== null) return fee
    const feeIdentity = eventIdentity(fee.id)
    if (!feeIdentity) return fee

    const movement = movements
      .map((row) => ({ row, identity: eventIdentity(row.id) }))
      .filter(
        ({ row, identity }) =>
          identity?.operationId === feeIdentity.operationId &&
          identity.logIndex > feeIdentity.logIndex &&
          row.contractAddress.toLowerCase() === fee.contractAddress.toLowerCase()
      )
      .sort((a, b) => a.identity!.logIndex - b.identity!.logIndex)[0]?.row

    return movement?.token ? { ...fee, token: movement.token } : fee
  })

  return { ...feed, bankFeePaids: { items: bankFeePaids } }
}
