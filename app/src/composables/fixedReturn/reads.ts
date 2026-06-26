import { computed, unref, type MaybeRef } from 'vue'
import { useReadContract } from '@wagmi/vue'
import { isAddress, type Address } from 'viem'
import { useTeamStore } from '@/stores'
import { FIXED_RETURN_ABI } from '@/artifacts/abi/fixed-return'

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
