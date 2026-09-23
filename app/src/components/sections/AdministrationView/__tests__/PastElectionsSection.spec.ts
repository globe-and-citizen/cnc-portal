import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import PastElectionsSection from '../PastElectionsSection.vue'
import type { Election } from '@/types'
import { log } from '@/lib/logging'
import { mockElectionsReads, mockRoute, resetContractMocks } from '@/tests/mocks'

const CardStub = {
  props: ['election'],
  template: '<div data-test="past-election" :data-id="election.id" />'
}
const EmptyStub = { template: '<div data-test="past-elections-empty" />' }
const PaginationStub = {
  props: ['page', 'pageSize', 'total', 'pageSizeOptions'],
  template: '<div data-test="past-elections-pagination" :data-total="total" />'
}

function election(id: number): Election {
  return {
    id,
    title: `Election ${id}`,
    description: '',
    createdBy: '0x742d35Cc6bF8C55C6C2e013e5492D2b6637e0886',
    startDate: new Date('2025-01-01'),
    endDate: new Date('2025-01-10'),
    seatCount: 1,
    resultsPublished: true
  }
}

const idsOf = (wrapper: VueWrapper) =>
  wrapper.findAll('[data-test="past-election"]').map((card) => Number(card.attributes('data-id')))

describe('PastElectionsSection', () => {
  let wrapper: VueWrapper

  const mountSection = () =>
    mount(PastElectionsSection, {
      global: {
        stubs: {
          PastElectionCard: CardStub,
          PastElectionsEmptyState: EmptyStub,
          TablePagination: PaginationStub
        }
      }
    })

  beforeEach(() => {
    vi.clearAllMocks()
    resetContractMocks()
    mockElectionsReads.pastElections.data.value = []
    mockElectionsReads.pastElections.isLoading.value = false
    mockElectionsReads.pastElections.error.value = null
  })

  afterEach(() => {
    wrapper?.unmount()
  })

  it('[AC-US-EL-08-05] shows a loading notice, not the empty state, while the history is read', () => {
    mockElectionsReads.pastElections.isLoading.value = true
    wrapper = mountSection()

    expect(wrapper.text()).toContain('Loading past elections...')
    expect(wrapper.find('[data-test="past-elections-empty"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="past-elections-pagination"]').exists()).toBe(false)
  })

  it('logs when the history read fails', async () => {
    wrapper = mountSection()

    const error = new Error('boom')
    mockElectionsReads.pastElections.error.value = error
    await nextTick()

    expect(log.error).toHaveBeenCalledWith(expect.any(String), error)
  })

  it('shows the empty state when no election has been published', () => {
    wrapper = mountSection()

    expect(wrapper.find('[data-test="past-elections-empty"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="past-elections-pagination"]').exists()).toBe(false)
  })

  it('lists a short history on one page without a pager', () => {
    mockElectionsReads.pastElections.data.value = [3, 2, 1].map(election)
    wrapper = mountSection()

    expect(idsOf(wrapper)).toEqual([3, 2, 1])
    expect(wrapper.find('[data-test="past-elections-pagination"]').exists()).toBe(false)
  })

  it('[AC-US-EL-08-04] keeps every published election reachable through the pager', async () => {
    mockElectionsReads.pastElections.data.value = [8, 7, 6, 5, 4, 3, 2, 1].map(election)
    wrapper = mountSection()

    expect(idsOf(wrapper)).toEqual([8, 7, 6, 5, 4, 3])
    expect(wrapper.find('[data-test="past-elections-pagination"]').attributes('data-total')).toBe(
      '8'
    )

    mockRoute.query = { pastElectionsPage: '2' }
    await nextTick()

    expect(idsOf(wrapper)).toEqual([2, 1])
  })

  it('follows the page and page size the pager asks for', async () => {
    mockElectionsReads.pastElections.data.value = [8, 7, 6, 5, 4, 3, 2, 1].map(election)
    wrapper = mountSection()
    const pager = wrapper.findComponent(PaginationStub)

    pager.vm.$emit('update:page', 2)
    await nextTick()
    expect(idsOf(wrapper)).toEqual([2, 1])

    pager.vm.$emit('update:pageSize', 12)
    await nextTick()
    expect(idsOf(wrapper)).toEqual([8, 7, 6, 5, 4, 3, 2, 1])
  })

  it('falls back to the last page when the list shrinks under the current one', async () => {
    mockElectionsReads.pastElections.data.value = [8, 7, 6, 5, 4, 3, 2, 1].map(election)
    mockRoute.query = { pastElectionsPage: '2' }
    wrapper = mountSection()
    expect(idsOf(wrapper)).toEqual([2, 1])

    mockElectionsReads.pastElections.data.value = [3, 2, 1].map(election)
    await nextTick()
    await nextTick()

    expect(idsOf(wrapper)).toEqual([3, 2, 1])
  })
})
