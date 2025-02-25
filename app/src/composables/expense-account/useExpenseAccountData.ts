import type { ManyExpenseResponse, ManyExpenseWithBalances, Team } from '@/types'
import { useCustomFetch } from '../useCustomFetch'
import { useRoute } from 'vue-router'
import { reactive, ref, type Ref, watch } from 'vue'
import { readContract } from '@wagmi/core'
import { formatEther, keccak256, zeroAddress, type Address } from 'viem'
import { config } from '@/wagmi.config'
import expenseAccountABI from '@/artifacts/abi/expense-account-eip712.json'
import { useToastStore } from '@/stores'
import { log, parseError } from '@/utils'

export const useExpenseAccountDataCollection = () => {
  const route = useRoute()
  const { addErrorToast } = useToastStore()
  const data = reactive<ManyExpenseWithBalances[]>([])
  const isLoading = ref<boolean>(false)

  const {
    data: team,
    execute: executeFetchTeam
  } = useCustomFetch(`teams/${String(route.params.id)}`)
    .get()
    .json<Team>()

  const {
    error: fetchManyExpenseAccountDataError,
    execute: fetchManyExpenseAccountData,
    data: manyExpenseAccountData
  } = useCustomFetch(`teams/${String(route.params.id)}/expense-data`, {
    immediate: false
  })
    .get()
    .json<ManyExpenseResponse[]>()

  const initializeBalances = async () => {
    isLoading.value = true
    await executeFetchTeam()
    await fetchManyExpenseAccountData()
    data.length = 0
    console.log(`manyExpenseAccountData: `, manyExpenseAccountData.value)
    console.log(`team: `, team)
    if (Array.isArray(manyExpenseAccountData.value) && team.value) {
      console.log(`Updating data...`)
      for (const expenseAccountData of manyExpenseAccountData.value) {
        const amountWithdrawn = await readContract(config, {
          functionName: 'balances',
          address: team.value.expenseAccountEip712Address as Address,
          abi: expenseAccountABI,
          args: [keccak256(expenseAccountData.signature)]
        })
  
        const isExpired = expenseAccountData.expiry <= Math.floor(new Date().getTime() / 1000)
  
        // Populate the reactive balances object
        if (
          Array.isArray(amountWithdrawn) &&
          data.findIndex((item) => item.signature === expenseAccountData.signature) === -1
        ) {
          // New algo
          data.push({
            ...expenseAccountData,
            balances: {
              0: `${amountWithdrawn[0]}`,
              1:
                expenseAccountData.tokenAddress === zeroAddress
                  ? formatEther(amountWithdrawn[1])
                  : `${Number(amountWithdrawn[1]) / 1e6}`,
              2: amountWithdrawn[2] === true
            },
            status: isExpired ? 'expired' : amountWithdrawn[2] === 2 ? 'disabled' : 'enabled'
          })
        }
      }
    }
    isLoading.value = false
  }
    
  watch(fetchManyExpenseAccountDataError, (newVal) => {
    if (newVal) {
      addErrorToast('Error fetching many expense account data')
      log.error(parseError(newVal))
    }
  })
  return { data, initializeBalances, isLoading }
}