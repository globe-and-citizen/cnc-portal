import { vi } from 'vitest'
import { createContractWriteV3Mock } from './erc20.mock'

export const mockInvestorWrites = {
  individualMint: createContractWriteV3Mock(),
  distributeMint: createContractWriteV3Mock()
}

export const resetInvestorMocks = () => {
  Object.values(mockInvestorWrites).forEach((mock) => {
    mock.data.value = null
    mock.error.value = null
    mock.isPending.value = false
    mock.isSuccess.value = false
    mock.isError.value = false
    mock.status.value = 'idle'

    if (vi.isMockFunction(mock.mutate)) mock.mutate.mockClear()
    if (vi.isMockFunction(mock.mutateAsync)) {
      mock.mutateAsync.mockClear()
      mock.mutateAsync.mockResolvedValue(undefined)
    }
    if (vi.isMockFunction(mock.reset)) mock.reset.mockClear()
  })
}
