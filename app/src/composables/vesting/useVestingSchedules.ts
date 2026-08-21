import { computed, onScopeDispose, ref } from 'vue'
import { useInvestorSymbol } from '@/composables/investor/reads'
import {
  useVestingGetAllArchivedVestingsFlat,
  useVestingGetVestingsWithMembers
} from '@/composables/vesting/reads'
import { buildVestingSchedules, summarizeVestingSchedules } from '@/utils'

/** One V2 read model shared by summary cards, filters, details, and actions. */
export function useVestingSchedules() {
  const nowSeconds = ref(Math.floor(Date.now() / 1000))
  const timer = setInterval(() => {
    nowSeconds.value = Math.floor(Date.now() / 1000)
  }, 60_000)
  onScopeDispose(() => clearInterval(timer))

  const active = useVestingGetVestingsWithMembers()
  const archived = useVestingGetAllArchivedVestingsFlat()
  const { data: investorSymbol } = useInvestorSymbol()

  const schedules = computed(() =>
    buildVestingSchedules([active.data.value, archived.data.value], nowSeconds.value)
  )
  const totals = computed(() => summarizeVestingSchedules(schedules.value))
  const tokenSymbol = computed(() =>
    typeof investorSymbol.value === 'string' && investorSymbol.value.trim()
      ? investorSymbol.value
      : 'SHARES'
  )
  const isLoading = computed(() => active.isLoading.value || archived.isLoading.value)
  const error = computed(() => active.error.value || archived.error.value)

  async function refetch() {
    await Promise.all([active.refetch(), archived.refetch()])
    nowSeconds.value = Math.floor(Date.now() / 1000)
  }

  return { schedules, totals, tokenSymbol, isLoading, error, refetch }
}
