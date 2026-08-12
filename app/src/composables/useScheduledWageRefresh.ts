import { onScopeDispose, toValue, watch, type MaybeRefOrGetter } from 'vue'
import { useQueryClient } from '@tanstack/vue-query'
import { useDocumentVisibility } from '@vueuse/core'
import { wageKeys, teamKeys } from '@/queries'
import { msUntilWageEffective } from '@/utils/wageUtil'
import type { Wage } from '@/types'

/**
 * Refresh wage data the moment a scheduled change takes effect.
 *
 * Wage changes land on Monday 00:00 UTC. Rather than polling, a single timer is
 * armed for the exact moment the change becomes operative. Because a tab left
 * open over the weekend can have its timers throttled or suspended, the queries
 * are also invalidated when the document becomes visible again and the
 * effective date has passed in the meantime.
 */
export function useScheduledWageRefresh(
  scheduledWage: MaybeRefOrGetter<Wage | null | undefined>,
  teamId: MaybeRefOrGetter<string | number | null>
) {
  const queryClient = useQueryClient()
  const visibility = useDocumentVisibility()
  let timer: ReturnType<typeof setTimeout> | undefined

  const clearTimer = () => {
    if (timer) clearTimeout(timer)
    timer = undefined
  }

  const invalidate = () => {
    const id = toValue(teamId)
    if (!id) return
    queryClient.invalidateQueries({ queryKey: wageKeys.team(id) })
    queryClient.invalidateQueries({ queryKey: teamKeys.detail(String(id)) })
  }

  watch(
    [() => toValue(scheduledWage), visibility],
    ([wage, isVisible]) => {
      clearTimer()
      if (!wage) return

      const delay = msUntilWageEffective(wage)

      // Already past its effective date: the cached wage is stale, so refresh
      // as soon as the tab is being looked at.
      if (delay === null) {
        if (isVisible === 'visible') invalidate()
        return
      }

      // setTimeout caps out at ~24.8 days; scheduled changes are at most a week
      // away, so a single timer always covers the wait.
      timer = setTimeout(invalidate, delay)
    },
    { immediate: true }
  )

  onScopeDispose(clearTimer)
}
