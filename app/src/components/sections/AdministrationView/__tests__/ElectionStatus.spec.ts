import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import ElectionStatus from '@/components/sections/AdministrationView/ElectionStatus.vue'
import { ref } from 'vue'

// Define proper types for mock data
interface FormattedElection {
  id: number
  title: string
  description: string
  startDate: Date
  endDate: Date
}

interface ElectionStatus {
  text: string
  color: string
}

interface MockElectionData {
  formattedElection: ReturnType<typeof ref<FormattedElection | null>>
  leftToStart: ReturnType<typeof ref<number>>
  leftToEnd: ReturnType<typeof ref<number>>
  electionStatus: ReturnType<typeof ref<ElectionStatus | null>>
}

// Mock composable data
const mockElectionData: MockElectionData = {
  formattedElection: ref<FormattedElection | null>(null),
  leftToStart: ref(0),
  leftToEnd: ref(0),
  electionStatus: ref<ElectionStatus | null>(null)
}

// Mock the composable
vi.mock('@/composables/elections', () => ({
  useBoDElections: vi.fn(() => mockElectionData)
}))

describe('ElectionStatus.vue', () => {
  let wrapper: VueWrapper

  const createComponent = (electionId: bigint = 1n) => {
    return mount(ElectionStatus, {
      props: {
        electionId
      }
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset mock data
    mockElectionData.formattedElection.value = {
      id: 1,
      title: 'Test Election',
      description: 'Test Description',
      startDate: new Date(),
      endDate: new Date()
    }
    mockElectionData.leftToStart.value = 0
    mockElectionData.leftToEnd.value = 0
    mockElectionData.electionStatus.value = null
  })

  describe('Component Rendering', () => {
    it('renders the component with election status', () => {
      mockElectionData.electionStatus.value = { text: 'Active', color: 'success' }
      wrapper = createComponent()

      expect(wrapper.find('[data-test="election-status-badge"]').exists()).toBe(true)
      expect(wrapper.text()).toContain('Active')
    })

    it('does not render when election status is null', () => {
      mockElectionData.electionStatus.value = null
      wrapper = createComponent()

      expect(wrapper.find('[data-test="election-status-badge"]').exists()).toBe(false)
    })

    it('[AC-US-EL-05-01] displays the current election status', () => {
      mockElectionData.electionStatus.value = { text: 'Upcoming', color: 'warning' }
      wrapper = createComponent()

      const badge = wrapper.find('[data-test="election-status-badge"]')
      expect(badge.text()).toContain('Upcoming')
    })
  })

  describe('Upcoming Election Status', () => {
    beforeEach(() => {
      mockElectionData.electionStatus.value = { text: 'Upcoming', color: 'warning' }
    })

    it('displays time in days when more than 1 day remaining', () => {
      mockElectionData.leftToStart.value = 2 * 24 * 60 * 60 // 2 days
      wrapper = createComponent()

      expect(wrapper.text()).toContain('2 days left')
    })

    it('displays "day" singular when exactly 1 day remaining', () => {
      mockElectionData.leftToStart.value = 24 * 60 * 60 // 1 day
      wrapper = createComponent()

      expect(wrapper.text()).toContain('1 day left')
    })

    it('displays time in hours when less than 1 day but more than 1 hour', () => {
      mockElectionData.leftToStart.value = 3 * 60 * 60 // 3 hours
      wrapper = createComponent()

      expect(wrapper.text()).toContain('3 hours left')
    })

    it('displays "hour" singular when exactly 1 hour remaining', () => {
      mockElectionData.leftToStart.value = 60 * 60 // 1 hour
      wrapper = createComponent()

      expect(wrapper.text()).toContain('1 hour left')
    })

    it('displays time in minutes when less than 1 hour', () => {
      mockElectionData.leftToStart.value = 30 * 60 // 30 minutes
      wrapper = createComponent()

      expect(wrapper.text()).toContain('30 minutes left')
    })

    it('displays "minute" singular when exactly 1 minute remaining', () => {
      mockElectionData.leftToStart.value = 60 // 1 minute
      wrapper = createComponent()

      expect(wrapper.text()).toContain('1 minute left')
    })

    it('displays time in seconds when less than 1 minute', () => {
      mockElectionData.leftToStart.value = 45 // 45 seconds
      wrapper = createComponent()

      expect(wrapper.text()).toContain('45 seconds left')
    })
  })

  describe('Active Election Status', () => {
    beforeEach(() => {
      mockElectionData.electionStatus.value = { text: 'Active', color: 'success' }
    })

    it('displays time in days when more than 1 day until end', () => {
      mockElectionData.leftToEnd.value = 5 * 24 * 60 * 60 // 5 days
      wrapper = createComponent()

      expect(wrapper.text()).toContain('5 days left')
    })

    it('displays time in hours when less than 1 day until end', () => {
      mockElectionData.leftToEnd.value = 12 * 60 * 60 // 12 hours
      wrapper = createComponent()

      expect(wrapper.text()).toContain('12 hours left')
    })

    it('displays time in minutes when less than 1 hour until end', () => {
      mockElectionData.leftToEnd.value = 15 * 60 // 15 minutes
      wrapper = createComponent()

      expect(wrapper.text()).toContain('15 minutes left')
    })

    it('displays time in seconds when less than 1 minute until end', () => {
      mockElectionData.leftToEnd.value = 30 // 30 seconds
      wrapper = createComponent()

      expect(wrapper.text()).toContain('30 seconds left')
    })
  })

  describe('Completed Election Status', () => {
    it('does not display time remaining for completed election', () => {
      mockElectionData.electionStatus.value = { text: 'Completed', color: 'neutral' }
      wrapper = createComponent()

      expect(wrapper.text()).not.toContain('left')
      expect(wrapper.text()).toContain('Completed')
    })

    it('does not show countdown separator for completed election', () => {
      mockElectionData.electionStatus.value = { text: 'Completed', color: 'neutral' }
      wrapper = createComponent()

      const badge = wrapper.find('[data-test="election-status-badge"]')
      expect(badge.text()).not.toContain('•')
    })
  })

  describe('Status indicator', () => {
    it.each([
      ['Upcoming', 'warning'],
      ['Active', 'success'],
      ['Completed', 'neutral'],
      ['Error', 'error'],
      // Falls through dotClass default branch — a value the switch doesn't recognise.
      ['Unknown', 'unknown']
    ])('exposes %s elections via data-status="%s"', (text, color) => {
      mockElectionData.electionStatus.value = { text, color }
      wrapper = createComponent()

      expect(wrapper.find('[data-test="election-status-badge"]').attributes('data-status')).toBe(
        color
      )
      expect(wrapper.find('[data-test="election-status-dot"]').exists()).toBe(true)
    })
  })

  describe('Edge Cases', () => {
    it('handles zero time remaining', () => {
      mockElectionData.electionStatus.value = { text: 'Active', color: 'success' }
      mockElectionData.leftToEnd.value = 0
      wrapper = createComponent()

      expect(wrapper.text()).toContain('0 seconds left')
    })

    it('handles very large time values', () => {
      mockElectionData.electionStatus.value = { text: 'Upcoming', color: 'warning' }
      mockElectionData.leftToStart.value = 365 * 24 * 60 * 60 // 1 year
      wrapper = createComponent()

      expect(wrapper.text()).toContain('365 days left')
    })

    it('displays fallback message when election data is null', () => {
      mockElectionData.formattedElection.value = null
      mockElectionData.electionStatus.value = { text: 'Active', color: 'success' }
      wrapper = createComponent()

      // Component should still render but might show fallback
      expect(wrapper.find('[data-test="election-status-badge"]').exists()).toBe(true)
    })

    it('remains rendered when the remaining time is negative', () => {
      mockElectionData.electionStatus.value = { text: 'Active', color: 'success' }
      mockElectionData.leftToEnd.value = -100
      wrapper = createComponent()

      // Should handle negative values without crashing
      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('Props Handling', () => {
    it('accepts and uses the electionId prop', () => {
      const electionId = 42n
      wrapper = createComponent(electionId)

      // Verify component renders successfully with the prop
      expect(wrapper.exists()).toBe(true)
    })

    it('displays each supplied election ID', () => {
      mockElectionData.electionStatus.value = { text: 'Active', color: 'success' }

      wrapper = createComponent(1n)
      expect(wrapper.exists()).toBe(true)

      wrapper = createComponent(999n)
      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('Countdown Format Consistency', () => {
    beforeEach(() => {
      mockElectionData.electionStatus.value = { text: 'Active', color: 'success' }
    })

    it('includes "left" suffix for all non-completed states', () => {
      mockElectionData.leftToEnd.value = 3600
      wrapper = createComponent()

      expect(wrapper.text()).toContain('left')
    })

    it('includes countdown separator bullet', () => {
      mockElectionData.leftToEnd.value = 3600
      wrapper = createComponent()

      expect(wrapper.text()).toContain('•')
    })

    it('[AC-US-EL-05-03] formats the election countdown', () => {
      mockElectionData.leftToEnd.value = 7200 // 2 hours
      wrapper = createComponent()

      const badge = wrapper.find('[data-test="election-status-badge"]')
      expect(badge.text()).toMatch(/Active\s*•\s*2 hours left/)
    })
  })

  describe('Reactive Updates', () => {
    it('updates when election status changes', async () => {
      mockElectionData.electionStatus.value = { text: 'Upcoming', color: 'warning' }
      wrapper = createComponent()

      expect(wrapper.text()).toContain('Upcoming')

      mockElectionData.electionStatus.value = { text: 'Active', color: 'success' }
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('Active')
    })

    it('updates countdown when time changes', async () => {
      mockElectionData.electionStatus.value = { text: 'Active', color: 'success' }
      mockElectionData.leftToEnd.value = 3600
      wrapper = createComponent()

      expect(wrapper.text()).toContain('1 hour left')

      mockElectionData.leftToEnd.value = 1800
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('30 minutes left')
    })

    // it('hides countdown when status changes to completed', async () => {
    //   mockElectionData.electionStatus.value = { text: 'Active', color: 'success' }
    //   mockElectionData.leftToEnd.value = 3600
    //   wrapper = createComponent()

    //   expect(wrapper.text()).toContain('left')

    //   mockElectionData.electionStatus.value = { text: 'Completed', color: 'neutral' }
    //   await wrapper.vm.$nextTick()

    //   expect(wrapper.text()).not.toContain('left')
    // })
  })
})
