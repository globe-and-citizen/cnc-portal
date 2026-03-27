import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { createTestingPinia } from '@pinia/testing'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import EditClaims from '@/components/sections/CashRemunerationView/EditClaims.vue'
import { useEditClaimWithFilesMutation } from '@/queries/weeklyClaim.queries'
import type { Claim } from '@/types'
import type { Address } from 'viem'
import { mockTeamStore, mockToastStore } from '@/tests/mocks'
import { createMockMutationResponse } from '@/tests/mocks/query.mock'

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

const resetFormMock = vi.fn()

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
        ClaimForm: ClaimFormStub
      }
    }
  })
}

describe('EditClaims', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockTeamStore.currentTeamId = '1'
    mockTeamStore.currentTeam = { id: 1 }
    mockTeamStore.currentTeamMeta = { isPending: false, data: { id: 1 } }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows success toast and closes modal after a successful submit', async () => {
    const wrapper = createWrapper()
    const form = wrapper.findComponent({ name: 'ClaimForm' })

    form.vm.$emit('submit', SUBMIT_PAYLOAD)
    await flushPromises()

    expect(mockToastStore.addSuccessToast).toHaveBeenCalledWith('Claim updated successfully')
    expect(wrapper.emitted()).toHaveProperty('close')
  })

  it('shows error toast and keeps modal open when no team is selected', async () => {
    mockTeamStore.currentTeamMeta = { isPending: false, data: null }

    const wrapper = createWrapper()
    const form = wrapper.findComponent({ name: 'ClaimForm' })

    form.vm.$emit('submit', SUBMIT_PAYLOAD)
    await flushPromises()

    expect(mockToastStore.addErrorToast).toHaveBeenCalledWith('Team not selected')
    expect(wrapper.emitted('close')).toBeUndefined()
  })

  it('renders backend error message when mutation returns an error', async () => {
    vi.mocked(useEditClaimWithFilesMutation).mockReturnValueOnce(
      createMockMutationResponse(null, false, new Error('Server unavailable')) as ReturnType<
        typeof useEditClaimWithFilesMutation
      >
    )

    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.find('[data-test="edit-claim-error"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="edit-claim-error"]').text()).toContain('Server unavailable')
  })

  it('emits close when cancel is triggered', async () => {
    const wrapper = createWrapper()
    const form = wrapper.findComponent({ name: 'ClaimForm' })

    form.vm.$emit('cancel')
    await flushPromises()

    expect(wrapper.emitted()).toHaveProperty('close')
  })

  it('updates visible file list after user removes an attachment', async () => {
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

    expect((form.props('existingFiles') as unknown[]).length).toBe(2)

    form.vm.$emit('delete-file', 0)
    await flushPromises()

    expect((form.props('existingFiles') as unknown[]).length).toBe(1)
  })
})
