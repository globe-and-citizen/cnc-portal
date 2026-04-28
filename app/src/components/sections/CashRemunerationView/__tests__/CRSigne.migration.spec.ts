import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import CRSigne from '../CRSigne.vue'
import { createPinia, setActivePinia } from 'pinia'
import type { WeeklyClaim, ContractType } from '@/types'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import isoWeek from 'dayjs/plugin/isoWeek'
import {
  mockCashRemunerationWrites,
  mockTeamStore,
  mockUserStore,
  mockUseReadContract,
  mockUseSignTypedData,
  mockWagmiCore
} from '@/tests/mocks'
import { createMockMutationResponse } from '@/tests/mocks/query.mock'
import { useUpdateWeeklyClaimMutation } from '@/queries'

vi.mock('@/composables/cashRemuneration/writes', () => ({
  useEnableClaim: vi.fn(() => mockCashRemunerationWrites.enableClaim),
  useDisableClaim: vi.fn(() => mockCashRemunerationWrites.disableClaim),
  useWithdraw: vi.fn(() => mockCashRemunerationWrites.ownerWithdrawAllToBank),
  useOwnerWithdrawAllToBank: vi.fn(() => mockCashRemunerationWrites.ownerWithdrawAllToBank)
}))

dayjs.extend(utc)
dayjs.extend(isoWeek)

// Migration-specific assertions for CRSigne (issue #1825). Kept in a separate
// file from CRSigne.spec.ts so that file stays under the max-lines lint
// cap; the mock setup is intentionally duplicated rather than extracted
// because the original spec is already at the line limit.
describe('CRSigne — issue #1825 sign payload + migration freeze', () => {
  let wrapper: ReturnType<typeof mount>

  const MOCK_OWNER_ADDRESS = '0x1234567890123456789012345678901234567890'
  const MOCK_CONTRACT_ADDRESS = '0x9876543210987654321098765432109876543210'

  const mockClaim: WeeklyClaim = {
    id: 1,
    status: 'pending',
    hoursWorked: 480,
    minutesWorked: 480,
    createdAt: '2024-01-01T00:00:00Z',
    wage: {
      userAddress: MOCK_OWNER_ADDRESS,
      ratePerHour: [{ type: 'native', amount: 10 }],
      id: 0,
      teamId: 0,
      cashRatePerHour: 0,
      tokenRatePerHour: 0,
      usdcRatePerHour: 0,
      maximumHoursPerWeek: 0,
      nextWageId: null,
      createdAt: '',
      updatedAt: '',
      disabled: false
    },
    weekStart: '2024-01-01T00:00:00Z',
    data: { ownerAddress: MOCK_OWNER_ADDRESS },
    memberAddress: MOCK_OWNER_ADDRESS,
    teamId: 0,
    signature: null,
    signedAgainstContractAddress: null,
    wageId: 0,
    updatedAt: '',
    claims: []
  }

  type WrapperProps = {
    weeklyClaim: WeeklyClaim
    disabled?: boolean
    isDropDown?: boolean
    isResign?: boolean
  }

  const createWrapper = (props: Partial<WrapperProps> = {}) => {
    wrapper = mount(CRSigne, {
      props: { weeklyClaim: mockClaim, ...props }
    })
    return wrapper
  }

  const clickApprove = async () => {
    await wrapper.find('[data-test="approve-button"]').trigger('click')
    await flushPromises()
  }

  const setSignTypedDataResult = (signature: string | null) => {
    mockUseSignTypedData.data.value = signature as string
    if (signature) mockUseSignTypedData.mutateAsync.mockResolvedValue(signature)
  }

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()

    mockTeamStore.getContractAddressByType = vi.fn((type: ContractType) => {
      if (type === 'CashRemunerationEIP712') return MOCK_CONTRACT_ADDRESS
      if (type === 'InvestorV1') return '0x1111111111111111111111111111111111111111'
      return ''
    })
    mockTeamStore.currentTeam = {
      id: '1',
      name: 'Test Team',
      description: 'Test Description',
      ownerAddress: MOCK_OWNER_ADDRESS,
      members: [],
      isMigrated: true,
      teamContracts: [
        {
          type: 'CashRemunerationEIP712',
          address: MOCK_CONTRACT_ADDRESS,
          deployer: MOCK_OWNER_ADDRESS,
          admins: []
        }
      ]
    }
    mockTeamStore.currentTeamMeta = {
      isPending: false,
      data: mockTeamStore.currentTeam
    } as typeof mockTeamStore.currentTeamMeta

    mockUserStore.address = MOCK_OWNER_ADDRESS
    mockUseReadContract.data.value = MOCK_OWNER_ADDRESS
    mockUseReadContract.error.value = null
    setSignTypedDataResult('0xsignature')
    mockWagmiCore.readContract.mockReset()
  })

  afterEach(() => {
    if (wrapper) wrapper.unmount()
  })

  it('sends signedAgainstContractAddress + chainId + typedDataMessage with the sign request', async () => {
    const mutateAsync = vi.fn().mockResolvedValue(undefined)
    vi.mocked(useUpdateWeeklyClaimMutation).mockReturnValueOnce({
      ...createMockMutationResponse(),
      mutateAsync
    } as ReturnType<typeof useUpdateWeeklyClaimMutation>)

    createWrapper()
    await clickApprove()

    expect(mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        queryParams: { action: 'sign' },
        body: expect.objectContaining({
          signature: '0xsignature',
          signedAgainstContractAddress: MOCK_CONTRACT_ADDRESS,
          chainId: expect.any(Number),
          typedDataMessage: expect.objectContaining({
            employeeAddress: MOCK_OWNER_ADDRESS,
            minutesWorked: mockClaim.minutesWorked,
            date: expect.stringMatching(/^\d+$/),
            wages: expect.arrayContaining([
              expect.objectContaining({
                hourlyRate: expect.stringMatching(/^\d+$/),
                tokenAddress: expect.any(String)
              })
            ])
          })
        })
      })
    )
  })

  it('disables the approve button when the team is not migrated', () => {
    mockTeamStore.currentTeamMeta = {
      isPending: false,
      data: { ...mockTeamStore.currentTeam, isMigrated: false }
    } as typeof mockTeamStore.currentTeamMeta

    createWrapper()
    const button = wrapper.find('[data-test="approve-button"]')
    expect(button.exists()).toBe(true)
    expect(button.attributes('disabled')).toBeDefined()
  })

  it('marks the dropdown sign action aria-disabled when the team is not migrated', () => {
    mockTeamStore.currentTeamMeta = {
      isPending: false,
      data: { ...mockTeamStore.currentTeam, isMigrated: false }
    } as typeof mockTeamStore.currentTeamMeta

    createWrapper({ isDropDown: true })
    const action = wrapper.find('[data-test="sign-action"]')
    expect(action.attributes('aria-disabled')).toBe('true')
  })
})
