import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createContractReadMock,
  mockTeamStore,
  mockUserStore,
  useReadContractFn
} from '@/tests/mocks'
import { useUserDataStore } from '@/stores'
import { reactive } from 'vue'
import type { Address } from 'viem'

// `bod.setup.ts` supplies component tests with a mock of these composables.
// This spec validates their actual contract-read configuration and ownership
// logic, so it deliberately opts out of that global mock.
vi.unmock('@/composables/bod/reads')

import {
  isValidBodFunction,
  useBodOwner,
  useBodIsActionExecuted,
  useBodIsBodAction,
  useBodIsMember
} from '../reads'

const MOCK_DATA = {
  bodAddress: '0x3234567890123456789012345678901234567890' as Address,
  memberAddress: '0x70997970c51812dc3a010c7d01b50e0d17dc79c8' as Address,
  actionId: 1
} as const

describe('BOD Contract Reads', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('validates Board function names before using them in a contract call', () => {
    expect(isValidBodFunction('isMember')).toBe(true)
    expect(isValidBodFunction('notABodFunction')).toBe(false)
  })

  it('reads the owner directly from the Bank contract', () => {
    const result = useBodOwner(MOCK_DATA.bodAddress)

    expect(result).toEqual(expect.objectContaining({ data: expect.any(Object) }))
    expect(useReadContractFn).toHaveBeenCalledWith(
      expect.objectContaining({
        address: expect.objectContaining({ value: MOCK_DATA.bodAddress }),
        functionName: 'owner',
        query: expect.objectContaining({ enabled: expect.objectContaining({ value: true }) })
      })
    )
  })

  it('reads an action status from the configured Board contract', () => {
    const result = useBodIsActionExecuted(MOCK_DATA.actionId)

    expect(result).toEqual(expect.objectContaining({ data: expect.any(Object) }))
    expect(useReadContractFn).toHaveBeenCalledWith(
      expect.objectContaining({
        functionName: 'isActionExecuted',
        args: [1n],
        query: expect.objectContaining({ enabled: expect.objectContaining({ value: true }) })
      })
    )
  })

  it('reads membership from the configured Board contract', () => {
    const result = useBodIsMember(MOCK_DATA.memberAddress)

    expect(result).toEqual(expect.objectContaining({ data: expect.any(Object) }))
    expect(useReadContractFn).toHaveBeenCalledWith(
      expect.objectContaining({
        functionName: 'isMember',
        args: expect.objectContaining({ value: [MOCK_DATA.memberAddress] }),
        query: expect.objectContaining({ enabled: expect.objectContaining({ value: true }) })
      })
    )
  })

  it('reacts when the connected Board member address becomes available after setup', () => {
    const userStore = reactive({ ...mockUserStore, address: '' })
    vi.mocked(useUserDataStore).mockReturnValue(userStore as ReturnType<typeof useUserDataStore>)
    const membershipRead = createContractReadMock(true)
    const ownerRead = createContractReadMock<Address | undefined>(MOCK_DATA.bodAddress)
    mockTeamStore.getContractAddressByType = vi.fn(() => MOCK_DATA.bodAddress)
    useReadContractFn.mockReturnValueOnce(membershipRead).mockReturnValueOnce(ownerRead)

    useBodIsBodAction(MOCK_DATA.bodAddress)

    const membershipConfig = useReadContractFn.mock.calls[0]?.[0]
    expect(membershipConfig?.query?.enabled.value).toBe(false)
    expect(membershipConfig?.args.value).toEqual([''])

    userStore.address = MOCK_DATA.memberAddress
    expect(membershipConfig?.query?.enabled.value).toBe(true)
    expect(membershipConfig?.args.value).toEqual([MOCK_DATA.memberAddress])

    vi.mocked(useUserDataStore).mockReturnValue(
      mockUserStore as ReturnType<typeof useUserDataStore>
    )
  })

  it('recognizes a Bank owned by the current Board regardless of address casing', () => {
    const boardAddress = '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266' as Address
    const ownerAddress = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' as Address
    const membershipRead = createContractReadMock(true)
    const ownerRead = createContractReadMock<Address | undefined>(ownerAddress)
    mockTeamStore.getContractAddressByType = vi.fn(() => boardAddress)
    useReadContractFn.mockReturnValueOnce(membershipRead).mockReturnValueOnce(ownerRead)

    const { isBodAction } = useBodIsBodAction(MOCK_DATA.bodAddress)

    expect(isBodAction.value).toBe(true)

    ownerRead.data.value = undefined
    expect(isBodAction.value).toBe(false)
  })
})

// UNUSED composables — tests commented out alongside them. See ../reads.ts:
//   useBodIsApproved, useBodGetBoardOfDirectors, useBodApprovalCount.
