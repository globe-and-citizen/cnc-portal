import { useCurrencyStore, useTeamStore } from '@/stores'
import {
  enrichTransactionPresentation,
  resolveTransactionUser
} from '@/utils/transactions/presentation'

export function useTransactionPresentation() {
  const teamStore = useTeamStore()
  const currencyStore = useCurrencyStore()

  const resolveUser = (address: string) =>
    resolveTransactionUser(address, {
      contracts: teamStore.currentTeamMeta.data?.teamContracts,
      members: teamStore.currentTeamMeta.data?.members,
      tokens: currencyStore.supportedTokens
    })

  const enrichTransaction = (transaction: {
    amount: string | number
    tokenAddress?: string
    token: string
  }) =>
    enrichTransactionPresentation(transaction, {
      supportedTokens: currencyStore.supportedTokens,
      getTokenPrice: (tokenId) => currencyStore.getTokenPrice(tokenId, true)
    })

  return { resolveUser, enrichTransaction }
}
