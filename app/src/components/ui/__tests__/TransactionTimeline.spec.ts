import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import TransactionTimeline from '@/components/ui/TransactionTimeline.vue'
import { mockUIComponents } from '@/tests/mocks'

describe('TransactionTimeline.vue', () => {
  beforeEach(() => {
    // Clear any previous test state
  })

  describe('Complete User Journey', () => {
    it('should display full transaction flow in progress', () => {
      const wrapper = mount(TransactionTimeline, {
        props: {
          show: true,
          steps: mockUIComponents.mockTimelineSteps,
          transactionHash: mockUIComponents.transactionHash,
          title: 'Payment Processing'
        },
        global: {
          stubs: {
            TimelineIcon: true
          }
        }
      })

      // Check header
      expect(wrapper.text()).toContain('Payment Processing')

      // Check all steps
      expect(wrapper.text()).toContain('Initiate')
      expect(wrapper.text()).toContain('Transaction Sent')
      expect(wrapper.text()).toContain('Confirming')
      expect(wrapper.text()).toContain('Complete')

      // Check transaction hash
      expect(wrapper.text()).toContain('Hash:')
      expect(wrapper.text()).toContain(mockUIComponents.transactionHash.slice(0, 10))
    })

    it('should display completed transaction', () => {
      const wrapper = mount(TransactionTimeline, {
        props: {
          show: true,
          steps: mockUIComponents.mockTimelineStepsCompleted,
          transactionHash: mockUIComponents.transactionHash,
          blockNumber: mockUIComponents.blockNumber,
          title: 'Transaction Complete'
        },
        global: {
          stubs: {
            TimelineIcon: true
          }
        }
      })

      expect(wrapper.text()).toContain('Transaction Complete')
      expect(wrapper.text()).toContain('Hash:')
      expect(wrapper.text()).toContain('Block:')
    })

    it('should display failed transaction', () => {
      const wrapper = mount(TransactionTimeline, {
        props: {
          show: true,
          steps: mockUIComponents.mockTimelineStepsWithError,
          transactionHash: mockUIComponents.transactionHash,
          title: 'Transaction Failed'
        },
        global: {
          stubs: {
            TimelineIcon: true
          }
        }
      })

      expect(wrapper.text()).toContain('Transaction Failed')
      expect(wrapper.text()).toContain('Failed to send transaction')
    })
  })
})
