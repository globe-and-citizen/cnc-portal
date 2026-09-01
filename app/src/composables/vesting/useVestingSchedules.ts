import { computed, onScopeDispose, ref } from 'vue'
import { useInvestorSymbol } from '@/composables/investor/reads'
import { useBlockTimestamp } from '@/composables/useBlockTimestamp'
import {
  useVestingGetAllArchivedVestingsFlat,
  useVestingGetVestingsWithMembers
} from '@/composables/vesting/reads'
import {
  buildVestingSchedules,
  resolveVestingTokenSymbol,
  summarizeVestingSchedules
} from '@/utils/vesting/schedule'

/** One V2 read model shared by summary cards, filters, details, and actions. */
export function useVestingSchedules() {
  const fallbackNowSeconds = ref(Math.floor(Date.now() / 1000))
  const timer = setInterval(() => {
    fallbackNowSeconds.value = Math.floor(Date.now() / 1000)
  }, 60_000)
  onScopeDispose(() => clearInterval(timer))
  const blockTimestamp = useBlockTimestamp()
  const nowSeconds = computed(() =>
    blockTimestamp.value === null ? fallbackNowSeconds.value : Number(blockTimestamp.value)
  )

  const active = useVestingGetVestingsWithMembers()
  const archived = useVestingGetAllArchivedVestingsFlat()
  const { data: investorSymbol } = useInvestorSymbol()

  const schedules = computed(() =>
    buildVestingSchedules([active.data.value, archived.data.value], nowSeconds.value)
  )
  const totals = computed(() => summarizeVestingSchedules(schedules.value))
  const tokenSymbol = computed(() => resolveVestingTokenSymbol(investorSymbol.value))
  const isLoading = computed(() => active.isLoading.value || archived.isLoading.value)
  const error = computed(() => active.error.value || archived.error.value)

  async function refetch() {
    await Promise.all([active.refetch(), archived.refetch()])
    fallbackNowSeconds.value = Math.floor(Date.now() / 1000)
  }

  return { schedules, totals, tokenSymbol, isLoading, error, refetch }
}
