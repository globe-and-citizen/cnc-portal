import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { BaseError, type Abi } from 'viem'
import { simulateContract, writeContract, waitForTransactionReceipt } from '@wagmi/core'
import {
  mockInvalidateQueries,
  smartUseMutation,
  useMutationFn,
  useQueryClientFn
} from '@/tests/mocks/composables.mock'
import { mockLog } from '@/tests/mocks/utils.mock'
import {
  executeContractWrite,
  useContractWritesV3,
  ContractWriteRevertedError,
  type ContractWriteV3Config
} from '../useContractWritesV3'
import {
  ABI,
  ADDRESS,
  HASH,
  okSimulation,
  revertedReceipt,
  successReceipt
} from './useContractWritesV3.test-utils'

beforeEach(() => {
  vi.clearAllMocks()
  // Opt into the smart mutation impl so mutationFn / onSuccess / onError fire.
  useMutationFn.mockImplementation(smartUseMutation)
  // Opt into the stable invalidateQueries spy so onSuccess assertions are inspectable.
  useQueryClientFn.mockReturnValue({
    invalidateQueries: mockInvalidateQueries,
    getQueryData: vi.fn(),
    setQueryData: vi.fn(),
    removeQueries: vi.fn()
  })
})

describe('executeContractWrite (standalone)', () => {
  it('returns hash, receipt, and simulation on success', async () => {
    vi.mocked(simulateContract).mockResolvedValueOnce(okSimulation)
    vi.mocked(writeContract).mockResolvedValueOnce(HASH)
    vi.mocked(waitForTransactionReceipt).mockResolvedValueOnce(successReceipt())

    const result = await executeContractWrite({
      address: ADDRESS,
      abi: ABI as unknown as Abi,
      functionName: 'foo',
      args: [42n]
    })

    expect(result.hash).toBe(HASH)
    expect(result.simulation).toBe(okSimulation)
    expect(simulateContract).toHaveBeenCalledTimes(1)
    // The write reuses the validated simulation request.
    expect(writeContract).toHaveBeenCalledWith(expect.anything(), okSimulation.request)
  })

  it('omits `value` from simulation params when not provided', async () => {
    vi.mocked(simulateContract).mockResolvedValueOnce(okSimulation)
    vi.mocked(writeContract).mockResolvedValueOnce(HASH)
    vi.mocked(waitForTransactionReceipt).mockResolvedValueOnce(successReceipt())

    await executeContractWrite({
      address: ADDRESS,
      abi: ABI as unknown as Abi,
      functionName: 'foo'
    })

    const [, params] = vi.mocked(simulateContract).mock.calls[0]!
    expect(params).not.toHaveProperty('value')
  })

  it('forwards `value` to simulation params when provided', async () => {
    vi.mocked(simulateContract).mockResolvedValueOnce(okSimulation)
    vi.mocked(writeContract).mockResolvedValueOnce(HASH)
    vi.mocked(waitForTransactionReceipt).mockResolvedValueOnce(successReceipt())

    await executeContractWrite({
      address: ADDRESS,
      abi: ABI as unknown as Abi,
      functionName: 'foo',
      value: 1_000n
    })

    const [, params] = vi.mocked(simulateContract).mock.calls[0]!
    expect(params).toMatchObject({ value: 1_000n })
  })

  it('throws ContractWriteRevertedError with BaseError cause when replay decodes the revert', async () => {
    const replayErr = new BaseError('execution reverted: InsufficientTokenBalance')
    vi.mocked(simulateContract)
      .mockResolvedValueOnce(okSimulation)
      .mockRejectedValueOnce(replayErr)
    vi.mocked(writeContract).mockResolvedValueOnce(HASH)
    vi.mocked(waitForTransactionReceipt).mockResolvedValueOnce(revertedReceipt({ blockNumber: 100n }))

    let caught: unknown
    try {
      await executeContractWrite({
        address: ADDRESS,
        abi: ABI as unknown as Abi,
        functionName: 'foo'
      })
    } catch (e) {
      caught = e
    }

    expect(caught).toBeInstanceOf(ContractWriteRevertedError)
    const err = caught as ContractWriteRevertedError
    expect(err.cause).toBe(replayErr)
    expect(err.hash).toBe(HASH)
    expect(err.receipt.blockNumber).toBe(100n)

    expect(simulateContract).toHaveBeenCalledTimes(2)
    const [, replayParams] = vi.mocked(simulateContract).mock.calls[1]!
    expect((replayParams as { blockNumber: bigint }).blockNumber).toBe(99n)
  })

  it('reports replay errors via callback and leaves cause undefined when replay throws non-BaseError', async () => {
    const onReplayError = vi.fn()
    const networkErr = new Error('RPC unavailable')
    vi.mocked(simulateContract)
      .mockResolvedValueOnce(okSimulation)
      .mockRejectedValueOnce(networkErr)
    vi.mocked(writeContract).mockResolvedValueOnce(HASH)
    vi.mocked(waitForTransactionReceipt).mockResolvedValueOnce(revertedReceipt())

    let caught: unknown
    try {
      await executeContractWrite({
        address: ADDRESS,
        abi: ABI as unknown as Abi,
        functionName: 'foo',
        onReplayError
      })
    } catch (e) {
      caught = e
    }

    expect(caught).toBeInstanceOf(ContractWriteRevertedError)
    expect((caught as ContractWriteRevertedError).cause).toBeUndefined()
    expect(onReplayError).toHaveBeenCalledTimes(1)
    expect(onReplayError).toHaveBeenCalledWith(networkErr)
  })

  it('skips the replay when receipt blockNumber is 0n (genesis guard)', async () => {
    vi.mocked(simulateContract).mockResolvedValueOnce(okSimulation)
    vi.mocked(writeContract).mockResolvedValueOnce(HASH)
    vi.mocked(waitForTransactionReceipt).mockResolvedValueOnce(revertedReceipt({ blockNumber: 0n }))

    await expect(
      executeContractWrite({
        address: ADDRESS,
        abi: ABI as unknown as Abi,
        functionName: 'foo'
      })
    ).rejects.toBeInstanceOf(ContractWriteRevertedError)

    expect(simulateContract).toHaveBeenCalledTimes(1)
  })

  it('propagates writeContract errors (e.g. user rejection) without waiting for a receipt', async () => {
    const userReject = new BaseError('User rejected the request')
    vi.mocked(simulateContract).mockResolvedValueOnce(okSimulation)
    vi.mocked(writeContract).mockRejectedValueOnce(userReject)

    await expect(
      executeContractWrite({
        address: ADDRESS,
        abi: ABI as unknown as Abi,
        functionName: 'foo'
      })
    ).rejects.toBe(userReject)

    expect(waitForTransactionReceipt).not.toHaveBeenCalled()
  })

  it('propagates simulateContract pre-flight errors without writing', async () => {
    const simErr = new BaseError('execution reverted at simulation time')
    vi.mocked(simulateContract).mockRejectedValueOnce(simErr)

    await expect(
      executeContractWrite({
        address: ADDRESS,
        abi: ABI as unknown as Abi,
        functionName: 'foo'
      })
    ).rejects.toBe(simErr)

    expect(writeContract).not.toHaveBeenCalled()
  })
})

describe('useContractWritesV3 — input validation & logging', () => {
  const baseConfig = (
    overrides: Partial<ContractWriteV3Config> = {}
  ): ContractWriteV3Config => ({
    contractAddress: ADDRESS,
    abi: ABI as unknown as Abi,
    functionName: 'foo',
    ...overrides
  })

  it('rejects when contract address is undefined', async () => {
    const m = useContractWritesV3(baseConfig({ contractAddress: ref(undefined) }))
    await expect(m.mutateAsync({})).rejects.toThrow('Contract address is undefined')
  })

  it('rejects with the corrected "empty" wording when functionName is empty', async () => {
    const m = useContractWritesV3(baseConfig({ functionName: '' }))
    await expect(m.mutateAsync({})).rejects.toThrow('Function name is empty')
  })

  it('logs failures by default', async () => {
    const err = new BaseError('boom')
    vi.mocked(simulateContract).mockRejectedValueOnce(err)

    const m = useContractWritesV3(baseConfig())
    await expect(m.mutateAsync({})).rejects.toBe(err)
    expect(mockLog.error).toHaveBeenCalled()
  })

  it('suppresses logging when config.log is false', async () => {
    const err = new BaseError('boom')
    vi.mocked(simulateContract).mockRejectedValueOnce(err)

    const m = useContractWritesV3(baseConfig({ config: { log: false } }))
    await expect(m.mutateAsync({})).rejects.toBe(err)
    expect(mockLog.error).not.toHaveBeenCalled()
  })

  it('does not pass an onReplayError callback when logging is disabled', async () => {
    vi.mocked(simulateContract)
      .mockResolvedValueOnce(okSimulation)
      .mockRejectedValueOnce(new Error('rpc down'))
    vi.mocked(writeContract).mockResolvedValueOnce(HASH)
    vi.mocked(waitForTransactionReceipt).mockResolvedValueOnce(revertedReceipt())

    const m = useContractWritesV3(baseConfig({ config: { log: false } }))
    await expect(m.mutateAsync({})).rejects.toBeInstanceOf(ContractWriteRevertedError)

    expect(mockLog.error).not.toHaveBeenCalled()
  })
})
