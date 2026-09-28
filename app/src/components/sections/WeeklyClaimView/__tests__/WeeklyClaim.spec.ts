import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, RouterLinkStub } from '@vue/test-utils'
import { defineComponent } from 'vue'
import WeeklyClaim from '../WeeklyClaim.vue'
import WeeklyClaimActionDropdown from '../WeeklyClaimActionDropdown.vue'
import { useGetTeamWeeklyClaimsQuery } from '@/queries'
import {
  createMockQueryResponse,
  mockTeamStore,
  mockUserStore,
  mockUseReadContract
} from '@/tests/mocks'
import type { WeeklyClaim as WeeklyClaimRecord } from '@/types'

const member = '0x1111111111111111111111111111111111111111'
const owner = '0x2222222222222222222222222222222222222222'
const table = defineComponent({
  props: ['data', 'columns'],
  template: `<div><div v-for="record in data" :key="record.id">
    <div v-for="column in columns" :key="column.accessorKey" :data-test="'cell-' + column.accessorKey">
      <slot :name="column.accessorKey + '-cell'" :row="{ original: record }" />
    </div>
  </div></div>`
})

describe('Company Payroll history', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockTeamStore.currentTeamId = '1'
    mockUserStore.address = owner
    mockUseReadContract.data.value = owner
  })

  it.each(['pending', 'signed', 'disabled', 'withdrawn'] as const)(
    '[AC-US-PAYROLL-012-02] displays the claim details and valid actions for %s history',
    async (status) => {
      const row = {
        id: 1,
        status,
        teamId: 1,
        memberAddress: member,
        member: { address: member, name: 'Payroll member', imageUrl: null },
        weekStart: '2026-09-21T00:00:00.000Z',
        signature: '0x1234',
        data: { ownerAddress: owner },
        wage: {
          id: 1,
          teamId: 1,
          userAddress: member,
          maximumHoursPerWeek: 8,
          nextWageId: null,
          ratePerHour: [{ type: 'usdc', amount: 2 }]
        },
        claims: [
          {
            id: 1,
            minutesWorked: 120,
            memo: 'Delivered work',
            dayWorked: '2026-09-21T00:00:00.000Z'
          }
        ]
      } as unknown as WeeklyClaimRecord
      vi.mocked(useGetTeamWeeklyClaimsQuery).mockReturnValueOnce(
        createMockQueryResponse({ data: [row], total: 1 }) as ReturnType<
          typeof useGetTeamWeeklyClaimsQuery
        >
      )
      const wrapper = mount(WeeklyClaim, {
        global: {
          stubs: {
            UTable: table,
            Table: table,
            RouterLink: RouterLinkStub,
            teleport: true,
            TablePagination: true
          }
        }
      })
      expect(wrapper.find('[data-test="cell-member"]').text()).toContain('Payroll member')
      expect(wrapper.find('[data-test="cell-weekStart"]').text()).toContain('Sep 21 - Sep 27')
      expect(wrapper.find('[data-test="cell-minutesWorked"]').text()).toContain('2h')
      expect(wrapper.find('[data-test="cell-hourlyRate"]').text()).toContain('2USDC')
      expect(wrapper.find('[data-test="cell-totalAmount"]').text()).toContain('4.00USDC')
      expect(wrapper.find('[data-test="cell-status"]').text()).toBe(
        status[0]!.toUpperCase() + status.slice(1)
      )
      expect(wrapper.findComponent(WeeklyClaimActionDropdown).props('status')).toBe(status)
      const trigger = wrapper.find('[data-test="weekly-claim-actions-button"]')
      if (status === 'withdrawn') {
        expect(trigger.exists()).toBe(false)
      } else {
        await trigger.trigger('click')
        const action =
          status === 'pending'
            ? 'pending-sign'
            : status === 'signed'
              ? 'signed-disable'
              : 'disabled-enable'
        expect(wrapper.find(`[data-test="${action}"]`).exists()).toBe(true)
      }
      wrapper.unmount()
    }
  )
})
