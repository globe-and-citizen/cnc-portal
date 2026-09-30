import { describe, expect, it, vi } from 'vitest'
import { mockUserStore, useReadContractFn } from '@/tests/mocks'

vi.unmock('@/composables/fixedReturn/reads')

import { useFixedReturnMyLenderPosition } from '../reads'

const LENDER_ADDRESS = '0x1111111111111111111111111111111111111111'

describe('useFixedReturnMyLenderPosition', () => {
  it('reads the connected wallet allocation and deposits for one offer', () => {
    mockUserStore.address = LENDER_ADDRESS
    useReadContractFn.mockClear()

    const { allocation, deposited } = useFixedReturnMyLenderPosition(7n)

    expect(allocation).toBeDefined()
    expect(deposited).toBeDefined()
    expect(useReadContractFn).toHaveBeenCalledTimes(2)

    const functionNames = useReadContractFn.mock.calls.map(([options]) => options.functionName)
    expect(functionNames).toEqual(
      expect.arrayContaining(['getLenderAllocation', 'getLenderDeposits'])
    )

    const allocationCall = useReadContractFn.mock.calls.find(
      ([options]) => options.functionName === 'getLenderAllocation'
    )
    const [offerIdArg, lenderArg] = allocationCall![0].args
    expect(offerIdArg.value).toBe(7n)
    expect(lenderArg.value).toBe(LENDER_ADDRESS)
  })
})
