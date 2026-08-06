import { describe, expect, it } from 'vitest'
import type { ActionResponse } from '@/types'
import { filterAndFormatActions } from '../contractManagementUtil'

describe('filterAndFormatActions', () => {
  it('returns an empty list while the action payload has no data', () => {
    const incompleteResponse = {} as ActionResponse

    expect(filterAndFormatActions('0xContract', incompleteResponse, [])).toEqual([])
  })
})
