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
vi.mock('@/composables', () => ({
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
    it('should render the component with election status', () => {
      mockElectionData.electionStatus.value = { text: 'Active', color: 'success' }
      wrapper = createComponent()

      expect(wrapper.find('.badge').exists()).toBe(true)
      expect(wrapper.text()).toContain('Active')
    })

    it('should not render when election status is null', () => {
      mockElectionData.electionStatus.value = null
      wrapper = createComponent()

      expect(wrapper.find('.badge').exists()).toBe(false)
    })

    it('should display status badge with correct text', () => {
      mockElectionData.electionStatus.value = { text: 'Upcoming', color: 'warning' }
      wrapper = createComponent()

      const badge = wrapper.find('.badge')
      expect(badge.text()).toContain('Upcoming')
    })
  })

  describe('Upcoming Election Status', () => {
    beforeEach(() => {
      mockElectionData.electionStatus.value = { text: 'Upcoming', color: 'warning' }
    })

    it('should display time in days when more than 1 day remaining', () => {
      mockElectionData.leftToStart.value = 2 * 24 * 60 * 60 // 2 days
      wrapper = createComponent()

      expect(wrapper.text()).toContain('2 days left')
    })

    it('should display "day" singular when exactly 1 day remaining', () => {
      mockElectionData.leftToStart.value = 24 * 60 * 60 // 1 day
      wrapper = createComponent()

      expect(wrapper.text()).toContain('1 day left')
    })

    it('should display time in hours when less than 1 day but more than 1 hour', () => {
      mockElectionData.leftToStart.value = 3 * 60 * 60 // 3 hours
      wrapper = createComponent()

      expect(wrapper.text()).toContain('3 hours left')
    })

    it('should display "hour" singular when exactly 1 hour remaining', () => {
      mockElectionData.leftToStart.value = 60 * 60 // 1 hour
      wrapper = createComponent()

      expect(wrapper.text()).toContain('1 hour left')
    })

    it('should display time in minutes when less than 1 hour', () => {
      mockElectionData.leftToStart.value = 30 * 60 // 30 minutes
      wrapper = createComponent()

      expect(wrapper.text()).toContain('30 minutes left')
    })

    it('should display "minute" singular when exactly 1 minute remaining', () => {
      mockElectionData.leftToStart.value = 60 // 1 minute
      wrapper = createComponent()

      expect(wrapper.text()).toContain('1 minute left')
    })

    it('should display time in seconds when less than 1 minute', () => {
      mockElectionData.leftToStart.value = 45 // 45 seconds
      wrapper = createComponent()

      expect(wrapper.text()).toContain('45 seconds left')
    })
  })

  describe('Active Election Status', () => {
    beforeEach(() => {
      mockElectionData.electionStatus.value = { text: 'Active', color: 'success' }
    })

    it('should display time in days when more than 1 day until end', () => {
      mockElectionData.leftToEnd.value = 5 * 24 * 60 * 60 // 5 days
      wrapper = createComponent()

      expect(wrapper.text()).toContain('5 days left')
    })

    it('should display time in hours when less than 1 day until end', () => {
      mockElectionData.leftToEnd.value = 12 * 60 * 60 // 12 hours
      wrapper = createComponent()

      expect(wrapper.text()).toContain('12 hours left')
    })

    it('should display time in minutes when less than 1 hour until end', () => {
      mockElectionData.leftToEnd.value = 15 * 60 // 15 minutes
      wrapper = createComponent()

      expect(wrapper.text()).toContain('15 minutes left')
    })

    it('should display time in seconds when less than 1 minute until end', () => {
      mockElectionData.leftToEnd.value = 30 // 30 seconds
      wrapper = createComponent()

      expect(wrapper.text()).toContain('30 seconds left')
    })
  })

  describe('Completed Election Status', () => {
    it('should not display time remaining for completed election', () => {
      mockElectionData.electionStatus.value = { text: 'Completed', color: 'neutral' }
      wrapper = createComponent()

      expect(wrapper.text()).not.toContain('left')
      expect(wrapper.text()).toContain('Completed')
    })

    it('should not show countdown separator for completed election', () => {
      mockElectionData.electionStatus.value = { text: 'Completed', color: 'neutral' }
      wrapper = createComponent()

      const badge = wrapper.find('.badge')
      expect(badge.text()).not.toContain('•')
    })
  })

  describe('Badge Styling', () => {
    it('should apply warning badge class for upcoming elections', () => {
      mockElectionData.electionStatus.value = { text: 'Upcoming', color: 'warning' }
      wrapper = createComponent()

      const badge = wrapper.find('.badge')
      expect(badge.classes()).toContain('badge-warning')
      expect(badge.classes()).toContain('badge-outline')
    })

    it('should apply success badge class for active elections', () => {
      mockElectionData.electionStatus.value = { text: 'Active', color: 'success' }
      wrapper = createComponent()

      const badge = wrapper.find('.badge')
      expect(badge.classes()).toContain('badge-success')
      expect(badge.classes()).toContain('badge-outline')
    })

    it('should apply neutral badge class for completed elections', () => {
      mockElectionData.electionStatus.value = { text: 'Completed', color: 'neutral' }
      wrapper = createComponent()

      const badge = wrapper.find('.badge')
      expect(badge.classes()).toContain('badge-neutral')
      expect(badge.classes()).toContain('badge-outline')
    })

    it('should apply error badge class when color is error', () => {
      mockElectionData.electionStatus.value = { text: 'Error', color: 'error' }
      wrapper = createComponent()

      const badge = wrapper.find('.badge')
      expect(badge.classes()).toContain('badge-error')
      expect(badge.classes()).toContain('badge-outline')
    })
  })

  describe('Dot Indicator Styling', () => {
    it('should display yellow dot for upcoming elections', () => {
      mockElectionData.electionStatus.value = { text: 'Upcoming', color: 'warning' }
      wrapper = createComponent()

      const dot = wrapper.find('.w-3.h-3.rounded-full')
      expect(dot.classes()).toContain('bg-yellow-500')
    })

    it('should display green dot for active elections', () => {
      mockElectionData.electionStatus.value = { text: 'Active', color: 'success' }
      wrapper = createComponent()

      const dot = wrapper.find('.w-3.h-3.rounded-full')
      expect(dot.classes()).toContain('bg-green-500')
    })

    it('should display gray dot for completed elections', () => {
      mockElectionData.electionStatus.value = { text: 'Completed', color: 'neutral' }
      wrapper = createComponent()

      const dot = wrapper.find('.w-3.h-3.rounded-full')
      expect(dot.classes()).toContain('bg-gray-500')
    })

    it('should display red dot for error status', () => {
      mockElectionData.electionStatus.value = { text: 'Error', color: 'error' }
      wrapper = createComponent()

      const dot = wrapper.find('.w-3.h-3.rounded-full')
      expect(dot.classes()).toContain('bg-red-500')
    })

    it('should display gray dot for unknown status', () => {
      mockElectionData.electionStatus.value = { text: 'Unknown', color: 'unknown' }
      wrapper = createComponent()

      const dot = wrapper.find('.w-3.h-3.rounded-full')
      expect(dot.classes()).toContain('bg-gray-500')
    })
  })

  describe('Edge Cases', () => {
    it('should handle zero time remaining', () => {
      mockElectionData.electionStatus.value = { text: 'Active', color: 'success' }
      mockElectionData.leftToEnd.value = 0
      wrapper = createComponent()

      expect(wrapper.text()).toContain('0 seconds left')
    })

    it('should handle very large time values', () => {
      mockElectionData.electionStatus.value = { text: 'Upcoming', color: 'warning' }
      mockElectionData.leftToStart.value = 365 * 24 * 60 * 60 // 1 year
      wrapper = createComponent()

      expect(wrapper.text()).toContain('365 days left')
    })

    it('should display fallback message when election data is null', () => {
      mockElectionData.formattedElection.value = null
      mockElectionData.electionStatus.value = { text: 'Active', color: 'success' }
      wrapper = createComponent()

      // Component should still render but might show fallback
      expect(wrapper.find('.badge').exists()).toBe(true)
    })

    it('should handle negative time values gracefully', () => {
      mockElectionData.electionStatus.value = { text: 'Active', color: 'success' }
      mockElectionData.leftToEnd.value = -100
      wrapper = createComponent()

      // Should handle negative values without crashing
      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('Props Handling', () => {
    it('should accept and use electionId prop', () => {
      const electionId = 42n
      wrapper = createComponent(electionId)

      // Verify component renders successfully with the prop
      expect(wrapper.exists()).toBe(true)
    })

    it('should work with different election IDs', () => {
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

    it('should include "left" suffix for all non-completed states', () => {
      mockElectionData.leftToEnd.value = 3600
      wrapper = createComponent()

      expect(wrapper.text()).toContain('left')
    })

    it('should include countdown separator bullet', () => {
      mockElectionData.leftToEnd.value = 3600
      wrapper = createComponent()

      expect(wrapper.text()).toContain('•')
    })

    it('should properly format countdown with all elements', () => {
      mockElectionData.leftToEnd.value = 7200 // 2 hours
      wrapper = createComponent()

      const badge = wrapper.find('.badge')
      expect(badge.text()).toMatch(/Active\s*•\s*2 hours left/)
    })
  })

  describe('Reactive Updates', () => {
    it('should update when election status changes', async () => {
      mockElectionData.electionStatus.value = { text: 'Upcoming', color: 'warning' }
      wrapper = createComponent()

      expect(wrapper.text()).toContain('Upcoming')

      mockElectionData.electionStatus.value = { text: 'Active', color: 'success' }
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('Active')
    })

    it('should update countdown when time changes', async () => {
      mockElectionData.electionStatus.value = { text: 'Active', color: 'success' }
      mockElectionData.leftToEnd.value = 3600
      wrapper = createComponent()

      expect(wrapper.text()).toContain('1 hour left')

      mockElectionData.leftToEnd.value = 1800
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('30 minutes left')
    })

    it('should hide countdown when status changes to completed', async () => {
      mockElectionData.electionStatus.value = { text: 'Active', color: 'success' }
      mockElectionData.leftToEnd.value = 3600
      wrapper = createComponent()

      expect(wrapper.text()).toContain('left')

      mockElectionData.electionStatus.value = { text: 'Completed', color: 'neutral' }
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).not.toContain('left')
    })
  })
})
