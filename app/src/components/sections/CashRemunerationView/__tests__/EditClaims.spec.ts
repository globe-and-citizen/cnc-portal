import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, ref } from 'vue'
import { createTestingPinia } from '@pinia/testing'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import EditClaims from '@/components/sections/CashRemunerationView/EditClaims.vue'
import { useEditClaimWithFilesMutation } from '@/queries/weeklyClaim.queries'
import type { Claim } from '@/types'
import type { Address } from 'viem'
import { mockTeamStore, mockToastStore } from '@/tests/mocks'

const SUBMIT_PAYLOAD = {
  hoursWorked: 6,
  memo: 'Updated memo',
  dayWorked: '2024-02-01T00:00:00.000Z',
  uploadedFiles: []
}

const defaultClaim: Claim = {
  id: 1,
  hoursWorked: 4,
  dayWorked: '2024-01-01T00:00:00.000Z',
  memo: 'Initial memo',
  wageId: 2,
  fileAttachments: [],
  wage: {
    id: 5,
    teamId: 10,
    userAddress: '0x1234567890123456789012345678901234567890' as Address,
    ratePerHour: [{ type: 'native', amount: 1 }],
    cashRatePerHour: 0,
    tokenRatePerHour: 0,
    usdcRatePerHour: 0,
    maximumHoursPerWeek: 40,
    nextWageId: null,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z'
  },
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z'
}

const mockEditClaimMutate = vi.fn()
const resetFormMock = vi.fn()
const isPendingRef = ref(false)
const errorRef = ref<Error | null>(null)

const ClaimFormStub = defineComponent({
  name: 'ClaimForm',
  props: {
    initialData: { type: Object, required: false },
    isEdit: { type: Boolean, required: false },
    isLoading: { type: Boolean, required: false },
    restrictSubmit: { type: Boolean, required: false },
    existingFiles: { type: Array, required: false }
  },
  emits: ['submit', 'cancel', 'delete-file'],
  setup(_, { expose }) {
    expose({ resetForm: resetFormMock })
    return () => null
  }
})

const createWrapper = (props: Partial<{ claim: Claim }> = {}) => {
  const queryClient = new QueryClient()
  return mount(EditClaims, {
    props: {
      claim: props.claim ?? defaultClaim
    },
    global: {
      plugins: [createTestingPinia({ createSpy: vi.fn }), [VueQueryPlugin, { queryClient }]],
      stubs: {
        ClaimForm: ClaimFormStub,
        UAlert: {
          name: 'UAlert',
          template: '<div data-test="edit-claim-error">{{ description }}</div>',
          props: ['description']
        }
      }
    }
  })
}

describe('EditClaims', () => {
  beforeEach(() => {
    mockToastStore.addErrorToast.mockClear()
    mockToastStore.addSuccessToast.mockClear()

    mockTeamStore.currentTeamId = '1'
    mockTeamStore.currentTeam = { id: 1 }
    mockTeamStore.currentTeamMeta = { isPending: false, data: { id: 1 } }

    resetFormMock.mockReset()
    mockEditClaimMutate.mockReset()
    mockEditClaimMutate.mockResolvedValue(undefined)
    isPendingRef.value = false
    errorRef.value = null

    vi.mocked(useEditClaimWithFilesMutation).mockReturnValue({
      mutateAsync: mockEditClaimMutate,
      isPending: isPendingRef,
      error: errorRef
    } as unknown as ReturnType<typeof useEditClaimWithFilesMutation>)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should submit with claim id and reset state on success', async () => {
    const wrapper = createWrapper()
    const form = wrapper.findComponent({ name: 'ClaimForm' })

    form.vm.$emit('submit', SUBMIT_PAYLOAD)
    await flushPromises()

    expect(mockEditClaimMutate).toHaveBeenCalledWith({
      ...SUBMIT_PAYLOAD,
      claimId: defaultClaim.id,
      deletedFileIndexes: []
    })
    expect(mockToastStore.addSuccessToast).toHaveBeenCalledWith('Claim updated successfully')
    expect(resetFormMock).toHaveBeenCalledTimes(1)
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('should track deleted file indexes and submit mapped original indexes', async () => {
    const claimWithFiles: Claim = {
      ...defaultClaim,
      fileAttachments: [
        {
          fileKey: 'bucket/path/file1.png',
          fileUrl: 'https://storage.railway.app/bucket/path/file1.png',
          fileType: 'image/png',
          fileSize: 100
        },
        {
          fileKey: 'bucket/path/file2.png',
          fileUrl: 'https://storage.railway.app/bucket/path/file2.png',
          fileType: 'image/png',
          fileSize: 200
        }
      ]
    }

    const wrapper = createWrapper({ claim: claimWithFiles })
    const form = wrapper.findComponent({ name: 'ClaimForm' })

    form.vm.$emit('delete-file', 0)
    await flushPromises()

    expect((form.props('existingFiles') as unknown[]).length).toBe(1)

    form.vm.$emit('delete-file', 0)
    await flushPromises()

    form.vm.$emit('submit', SUBMIT_PAYLOAD)
    await flushPromises()

    expect(mockEditClaimMutate).toHaveBeenCalledWith({
      ...SUBMIT_PAYLOAD,
      claimId: defaultClaim.id,
      deletedFileIndexes: [0, 1]
    })
  })

  it('should show error toast and stop submit when team is missing', async () => {
    mockTeamStore.currentTeamMeta = { isPending: false, data: null }

    const wrapper = createWrapper()
    const form = wrapper.findComponent({ name: 'ClaimForm' })

    form.vm.$emit('submit', SUBMIT_PAYLOAD)
    await flushPromises()

    expect(mockEditClaimMutate).not.toHaveBeenCalled()
    expect(mockToastStore.addErrorToast).toHaveBeenCalledWith('Team not selected')
    expect(wrapper.emitted('close')).toBeUndefined()
  })

  it('should expose loading state to ClaimForm', () => {
    isPendingRef.value = true

    const wrapper = createWrapper()
    const form = wrapper.findComponent({ name: 'ClaimForm' })

    expect(form.props('isLoading')).toBe(true)
  })

  it('should render mutation error from hook', () => {
    errorRef.value = new Error('Server unavailable')

    const wrapper = createWrapper()

    expect(wrapper.find('[data-test="edit-claim-error"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="edit-claim-error"]').text()).toContain('Server unavailable')
  })

  it('should emit close when cancel is triggered', async () => {
    const wrapper = createWrapper()
    const form = wrapper.findComponent({ name: 'ClaimForm' })

    form.vm.$emit('cancel')
    await flushPromises()

    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('should sync file list when claim prop changes', async () => {
    const wrapper = createWrapper()
    const form = wrapper.findComponent({ name: 'ClaimForm' })

    expect(form.props('existingFiles')).toEqual([])

    await wrapper.setProps({
      claim: {
        ...defaultClaim,
        fileAttachments: [
          {
            fileKey: 'bucket/path/new-file.png',
            fileUrl: 'https://storage.railway.app/bucket/path/new-file.png',
            fileType: 'image/png',
            fileSize: 123
          }
        ]
      }
    })

    await flushPromises()

    expect((form.props('existingFiles') as unknown[]).length).toBe(1)
  })
})
