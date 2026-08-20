import { vi } from 'vitest'
import { defineComponent } from 'vue'
import ClaimHistoryActionAlerts from '@/components/sections/ClaimHistoryView/ClaimHistoryActionAlerts.vue'
import { renderWithProviders, mockWeeklyClaimData } from '@/tests/mocks'

/**
 * Shared mount setup for the ClaimHistoryActionAlerts specs.
 *
 * The component pulls in four child components and two query hooks, so every
 * spec needs the same stub wall. Keeping it here lets the behaviour be split
 * across focused spec files instead of one file that outgrows the max-lines
 * budget.
 */

export const baseAddress = '0x1234567890123456789012345678901234567890'

export const openModalForDayMock = vi.fn()

export const createWeeklyClaim = (overrides: Record<string, unknown> = {}) => ({
  ...mockWeeklyClaimData[0],
  weekStart: '2024-01-01T00:00:00.000Z',
  signature: null,
  status: 'pending',
  claims: [{ ...mockWeeklyClaimData[0]?.claims[0], dayWorked: '2024-01-01T00:00:00.000Z' }],
  wage: {
    ...mockWeeklyClaimData[0]?.wage,
    userAddress: baseAddress
  },
  ...overrides
})

export const makeGlobal = () => ({
  stubs: {
    SubmitClaims: defineComponent({
      name: 'SubmitClaims',
      props: {
        signedWeekStarts: { type: Array, required: true }
      },
      setup(_, { expose }) {
        expose({ openModalForDay: openModalForDayMock })
        return {}
      },
      template: '<div data-test="submit-claims">{{ signedWeekStarts.length }}</div>'
    }),
    SubmitWeeklyGoals: {
      name: 'SubmitWeeklyGoals',
      props: ['weeklyClaim', 'selectedWeekStart'],
      template: '<div data-test="submit-weekly-goals" />'
    },
    CRSigne: {
      name: 'CRSigne',
      props: ['disabled'],
      template: '<div data-test="cr-signe">{{ disabled }}</div>'
    },
    CRWithdrawClaim: {
      name: 'CRWithdrawClaim',
      props: ['disabled'],
      template: '<div data-test="cr-withdraw">{{ disabled }}</div>'
    },
    IconifyIcon: {
      name: 'IconifyIcon',
      template: '<span data-test="icon" />'
    }
  }
})

export const createWrapper = (props: Record<string, unknown> = {}) =>
  renderWithProviders(ClaimHistoryActionAlerts, {
    props: {
      memberAddress: baseAddress,
      ...props
    },
    global: makeGlobal()
  })
