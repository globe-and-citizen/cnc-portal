import { describe, it, expect, beforeEach, vi } from 'vitest'
import { usePagination } from '@/composables/usePagination'
import { setMockRoute, mockRouterReplace } from '@/tests/mocks'

// The query object the last `router.replace` was called with.
function lastReplacedQuery(): Record<string, unknown> {
  const call = mockRouterReplace.mock.calls.at(-1)?.[0] as { query: Record<string, unknown> }
  return call.query
}

describe('usePagination', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setMockRoute({ query: {} })
  })

  describe('reading state from the route query', () => {
    it('defaults to page 1 and the default page size when the query is empty', () => {
      const { page, pageSize } = usePagination(() => 100, { defaultPageSize: 20 })
      expect(page.value).toBe(1)
      expect(pageSize.value).toBe(20)
    })

    it('reads page and pageSize from the query params', () => {
      setMockRoute({ query: { page: '3', pageSize: '50' } })
      const { page, pageSize } = usePagination(() => 100)
      expect(page.value).toBe(3)
      expect(pageSize.value).toBe(50)
    })

    it('falls back to the default for a non-positive or non-integer page', () => {
      setMockRoute({ query: { page: '-2' } })
      expect(usePagination(() => 100).page.value).toBe(1)
      setMockRoute({ query: { page: 'abc' } })
      expect(usePagination(() => 100).page.value).toBe(1)
    })

    it('falls back to the default for a page size outside the allowed options', () => {
      setMockRoute({ query: { pageSize: '37' } })
      expect(usePagination(() => 100, { defaultPageSize: 20 }).pageSize.value).toBe(20)
    })

    it('honours a key prefix on the query params', () => {
      setMockRoute({ query: { ledgerPage: '2', ledgerSize: '10' } })
      const { page, pageSize } = usePagination(() => 100, { key: 'ledger' })
      expect(page.value).toBe(2)
      expect(pageSize.value).toBe(10)
    })
  })

  describe('rangeStart', () => {
    it('is the 1-based index of the first item on the current page', () => {
      setMockRoute({ query: { page: '2', pageSize: '10' } })
      expect(usePagination(() => 100).rangeStart.value).toBe(11)
    })

    it('is 0 when there are no items', () => {
      setMockRoute({ query: { page: '2', pageSize: '10' } })
      expect(usePagination(() => 0).rangeStart.value).toBe(0)
    })
  })

  describe('writing state to the route query', () => {
    it('mirrors the page to the query via router.replace', () => {
      const { page } = usePagination(() => 100)
      page.value = 4
      expect(mockRouterReplace).toHaveBeenCalledWith({ query: { page: '4' } })
    })

    it('drops a param sitting at its default value for a clean URL', () => {
      setMockRoute({ query: { page: '4' } })
      const { page } = usePagination(() => 100)
      page.value = 1
      expect(lastReplacedQuery()).toEqual({})
    })

    it('preserves unrelated query params it does not own', () => {
      setMockRoute({ query: { tab: 'claims' } })
      const { page } = usePagination(() => 100)
      page.value = 2
      expect(lastReplacedQuery()).toEqual({ tab: 'claims', page: '2' })
    })

    it('clamps a page below 1 up to 1', () => {
      setMockRoute({ query: { page: '3' } })
      const { page } = usePagination(() => 100)
      page.value = 0
      expect(lastReplacedQuery()).toEqual({})
    })
  })

  describe('resize anchoring', () => {
    // total = 100, page 2 / size 10 shows items 11–20. Default size is 10 so the
    // resized values below stay in the URL rather than being dropped as defaults.
    beforeEach(() => setMockRoute({ query: { page: '2', pageSize: '10' } }))

    it('keeps the current first item visible when shrinking the page size', () => {
      // 11–20 → size 5 → item 11 is on page ceil(11 / 5) = 3.
      const { pageSize } = usePagination(() => 100, { defaultPageSize: 10 })
      pageSize.value = 5
      expect(lastReplacedQuery()).toEqual({ pageSize: '5', page: '3' })
    })

    it('keeps the current first item visible when growing the page size', () => {
      // 11–20 → size 20 → item 11 is on page ceil(11 / 20) = 1, dropped as default.
      const { pageSize } = usePagination(() => 100, { defaultPageSize: 10 })
      pageSize.value = 20
      expect(lastReplacedQuery()).toEqual({ pageSize: '20' })
    })
  })

  describe('reset', () => {
    it('returns to page 1', () => {
      setMockRoute({ query: { page: '5', pageSize: '20' } })
      const { reset } = usePagination(() => 100)
      reset()
      expect(lastReplacedQuery()).toEqual({ pageSize: '20' })
    })
  })
})
