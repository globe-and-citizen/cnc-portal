import { computed, unref, type MaybeRef, type MaybeRefOrGetter, toValue } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { useReadContract } from '@wagmi/vue'
import { readContract } from '@wagmi/core'
import { formatUnits, isAddress, type Address } from 'viem'
import { useTeamStore } from '@/stores'
import { config } from '@/wagmi.config'
import { FIXED_RETURN_ABI } from '@/artifacts/abi/fixed-return'
import { decimalsForOfferingToken, log, parseError } from '@/utils'
import type { LendingOfferStruct } from '@/types'

/**
 * FixedReturn contract address helper
 */
export function useFixedReturnAddress() {
  const teamStore = useTeamStore()
  return computed(() => teamStore.getContractAddressByType('FixedReturn'))
}

export function useFixedReturnOwner() {
  const fixedReturnAddress = useFixedReturnAddress()
  return useReadContract({
    address: fixedReturnAddress,
    abi: FIXED_RETURN_ABI,
    functionName: 'owner',
    query: { enabled: !!fixedReturnAddress.value && isAddress(fixedReturnAddress.value) }
  })
}

export function useFixedReturnVersion() {
  const fixedReturnAddress = useFixedReturnAddress()
  return useReadContract({
    address: fixedReturnAddress,
    abi: FIXED_RETURN_ABI,
    functionName: 'version',
    query: { enabled: !!fixedReturnAddress.value && isAddress(fixedReturnAddress.value) }
  })
}

export function useFixedReturnTotalOfferings() {
  const fixedReturnAddress = useFixedReturnAddress()
  return useReadContract({
    address: fixedReturnAddress,
    abi: FIXED_RETURN_ABI,
    functionName: 'totalOfferings',
    query: { enabled: !!fixedReturnAddress.value && isAddress(fixedReturnAddress.value) }
  })
}

export function useFixedReturnGetLendingOffer(offerId: MaybeRef<bigint>) {
  const fixedReturnAddress = useFixedReturnAddress()
  const offerIdValue = computed(() => unref(offerId))
  return useReadContract({
    address: fixedReturnAddress,
    abi: FIXED_RETURN_ABI,
    functionName: 'getLendingOffer',
    args: [offerIdValue],
    query: {
      enabled: computed(() => !!fixedReturnAddress.value && isAddress(fixedReturnAddress.value))
    }
  })
}

export function useFixedReturnGetOfferLenders(offerId: MaybeRef<bigint>) {
  const fixedReturnAddress = useFixedReturnAddress()
  const offerIdValue = computed(() => unref(offerId))
  return useReadContract({
    address: fixedReturnAddress,
    abi: FIXED_RETURN_ABI,
    functionName: 'getOfferLenders',
    args: [offerIdValue],
    query: {
      enabled: computed(() => !!fixedReturnAddress.value && isAddress(fixedReturnAddress.value))
    }
  })
}

export function useFixedReturnTotalEntitlementOf(
  offerId: MaybeRef<bigint>,
  lender: MaybeRef<Address>
) {
  const fixedReturnAddress = useFixedReturnAddress()
  const offerIdValue = computed(() => unref(offerId))
  const lenderValue = computed(() => unref(lender))
  return useReadContract({
    address: fixedReturnAddress,
    abi: FIXED_RETURN_ABI,
    functionName: 'totalEntitlementOf',
    args: [offerIdValue, lenderValue],
    query: {
      enabled: computed(
        () =>
          !!fixedReturnAddress.value &&
          isAddress(fixedReturnAddress.value) &&
          isAddress(lenderValue.value)
      )
    }
  })
}

export function useFixedReturnLenderDeposits(offerId: MaybeRef<bigint>, lender: MaybeRef<Address>) {
  const fixedReturnAddress = useFixedReturnAddress()
  const offerIdValue = computed(() => unref(offerId))
  const lenderValue = computed(() => unref(lender))
  return useReadContract({
    address: fixedReturnAddress,
    abi: FIXED_RETURN_ABI,
    functionName: 'lenderDeposits',
    args: [offerIdValue, lenderValue],
    query: {
      enabled: computed(
        () =>
          !!fixedReturnAddress.value &&
          isAddress(fixedReturnAddress.value) &&
          isAddress(lenderValue.value)
      )
    }
  })
}

export function useFixedReturnLenderAllocation(
  offerId: MaybeRef<bigint>,
  lender: MaybeRef<Address>
) {
  const fixedReturnAddress = useFixedReturnAddress()
  const offerIdValue = computed(() => unref(offerId))
  const lenderValue = computed(() => unref(lender))
  return useReadContract({
    address: fixedReturnAddress,
    abi: FIXED_RETURN_ABI,
    functionName: 'lenderAllocation',
    args: [offerIdValue, lenderValue],
    query: {
      enabled: computed(
        () =>
          !!fixedReturnAddress.value &&
          isAddress(fixedReturnAddress.value) &&
          isAddress(lenderValue.value)
      )
    }
  })
}

export function useFixedReturnHasDeposited(offerId: MaybeRef<bigint>, lender: MaybeRef<Address>) {
  const fixedReturnAddress = useFixedReturnAddress()
  const offerIdValue = computed(() => unref(offerId))
  const lenderValue = computed(() => unref(lender))
  return useReadContract({
    address: fixedReturnAddress,
    abi: FIXED_RETURN_ABI,
    functionName: 'hasDeposited',
    args: [offerIdValue, lenderValue],
    query: {
      enabled: computed(
        () =>
          !!fixedReturnAddress.value &&
          isAddress(fixedReturnAddress.value) &&
          isAddress(lenderValue.value)
      )
    }
  })
}

export function useFixedReturnIsTokenSupported(token: MaybeRef<Address>) {
  const fixedReturnAddress = useFixedReturnAddress()
  const tokenValue = computed(() => unref(token))
  return useReadContract({
    address: fixedReturnAddress,
    abi: FIXED_RETURN_ABI,
    functionName: 'isTokenSupported',
    args: [tokenValue],
    query: {
      enabled: computed(
        () =>
          !!fixedReturnAddress.value &&
          isAddress(fixedReturnAddress.value) &&
          isAddress(tokenValue.value)
      )
    }
  })
}

export function useFixedReturnGetSupportedTokens() {
  const fixedReturnAddress = useFixedReturnAddress()
  return useReadContract({
    address: fixedReturnAddress,
    abi: FIXED_RETURN_ABI,
    functionName: 'getSupportedTokens',
    query: { enabled: !!fixedReturnAddress.value && isAddress(fixedReturnAddress.value) }
  })
}

export interface FixedReturnRawOffer {
  offerId: number
  offer: LendingOfferStruct
  decimals: number
}

/**
 * Fetches every LendingOffer struct for this team's FixedReturn contract, newest
 * first. There's no batch view for this — totalOfferings gives the count, then each
 * offer is read individually by id — so this is shared by every view that needs the
 * full list (OfferingsList, LenderMarketplace) rather than duplicated per-component.
 */
export function useFixedReturnAllOffers() {
  const fixedReturnAddress = useFixedReturnAddress()

  async function fetchAllOffers(): Promise<FixedReturnRawOffer[]> {
    const address = fixedReturnAddress.value
    if (!address) return []

    try {
      const total = (await readContract(config, {
        address,
        abi: FIXED_RETURN_ABI,
        functionName: 'totalOfferings'
      })) as bigint

      const count = Number(total)
      if (count < 1) return []

      const offers: FixedReturnRawOffer[] = []
      for (let offerId = count; offerId >= 1; offerId--) {
        try {
          const offer = (await readContract(config, {
            address,
            abi: FIXED_RETURN_ABI,
            functionName: 'getLendingOffer',
            args: [BigInt(offerId)]
          })) as LendingOfferStruct
          offers.push({ offerId, offer, decimals: decimalsForOfferingToken(offer.token) ?? 6 })
        } catch (error) {
          log.error(`Failed to fetch FixedReturn offer #${offerId}:`, parseError(error))
        }
      }
      return offers
    } catch (error) {
      log.error('Failed to fetch FixedReturn offerings:', parseError(error))
      return []
    }
  }

  return useQuery({
    queryKey: ['fixedReturnAllOffers', fixedReturnAddress],
    queryFn: fetchAllOffers,
    enabled: computed(() => !!fixedReturnAddress.value)
  })
}

export interface FixedReturnOfferLender {
  address: Address
  principal: number
  expected: number
}

/**
 * Fetches every lender who has deposited into a given offer, with their principal
 * (lenderDeposits) and current entitlement (totalEntitlementOf), scaled by the
 * offer's token decimals. There's no batch getter for this — getOfferLenders only
 * returns addresses, so each lender's amounts need their own read.
 */
export function useFixedReturnOfferLenders(
  offerId: MaybeRefOrGetter<string | number>,
  token: MaybeRefOrGetter<Address>
) {
  const fixedReturnAddress = useFixedReturnAddress()

  async function fetchLenders(): Promise<FixedReturnOfferLender[]> {
    const address = fixedReturnAddress.value
    if (!address) return []

    const offerIdValue = BigInt(toValue(offerId))
    const decimals = decimalsForOfferingToken(toValue(token)) ?? 6

    try {
      const lenderAddresses = (await readContract(config, {
        address,
        abi: FIXED_RETURN_ABI,
        functionName: 'getOfferLenders',
        args: [offerIdValue]
      })) as Address[]

      return await Promise.all(
        lenderAddresses.map(async (lender) => {
          const [principal, expected] = await Promise.all([
            readContract(config, {
              address,
              abi: FIXED_RETURN_ABI,
              functionName: 'lenderDeposits',
              args: [offerIdValue, lender]
            }) as Promise<bigint>,
            readContract(config, {
              address,
              abi: FIXED_RETURN_ABI,
              functionName: 'totalEntitlementOf',
              args: [offerIdValue, lender]
            }) as Promise<bigint>
          ])
          return {
            address: lender,
            principal: Number(formatUnits(principal, decimals)),
            expected: Number(formatUnits(expected, decimals))
          }
        })
      )
    } catch (error) {
      log.error('Failed to fetch FixedReturn offer lenders:', parseError(error))
      return []
    }
  }

  return useQuery({
    queryKey: ['fixedReturnOfferLenders', fixedReturnAddress, offerId],
    queryFn: fetchLenders,
    enabled: computed(() => !!fixedReturnAddress.value)
  })
}
