import { describe, expect, it } from 'vitest'
import type { Action, ActionResponse } from '@/types'
import type { Address } from 'viem'
import { filterAndFormatActions } from '../management'

const contractAddress = '0x0000000000000000000000000000000000000001' as Address
const userAddress = '0x0000000000000000000000000000000000000002' as Address

const makeAction = (description: string, id = 1): Action => ({
  id,
  actionId: id,
  targetAddress: contractAddress,
  description,
  userAddress,
  isExecuted: false,
  data: '0x',
  teamId: 1
})

describe('filterAndFormatActions', () => {
  it('returns an empty list while the action payload has no data', () => {
    const incompleteResponse = {} as ActionResponse

    expect(filterAndFormatActions('0xContract', incompleteResponse, [])).toEqual([])
  })

  it('formats a valid action description from its validated shape', () => {
    const actions: ActionResponse = {
      success: true,
      data: [makeAction(JSON.stringify({ title: 'Transfer ownership', text: 'Move ownership.' }))],
      total: 1
    }

    expect(filterAndFormatActions(contractAddress, actions, [])).toMatchObject([
      { title: 'Transfer ownership', description: 'Move ownership.' }
    ])
  })

  it('keeps malformed actions discoverable without blocking the remaining list', () => {
    const actions: ActionResponse = {
      success: true,
      data: [
        makeAction('not JSON', 1),
        makeAction(JSON.stringify({ title: 'Missing text' }), 2),
        makeAction(JSON.stringify({ title: 'Valid action', text: 'Still renders.' }), 3)
      ],
      total: 3
    }

    expect(filterAndFormatActions(contractAddress, actions, [])).toMatchObject([
      {
        title: 'Action details unavailable',
        description: 'The action description could not be read.'
      },
      {
        title: 'Action details unavailable',
        description: 'The action description could not be read.'
      },
      { title: 'Valid action', description: 'Still renders.' }
    ])
  })
})
