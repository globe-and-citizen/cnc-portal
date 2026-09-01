import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'
import { createTestingPinia } from '@pinia/testing'
import MainContractActions from '../MainContractActions.vue'
import { mockBodAddAction, mockBodApproveAction, mockToast, mockUserStore } from '@/tests/mocks'
import { useQueryClientFn, mockInvalidateQueries } from '@/tests/mocks/composables.mock'
import { mockLog } from '@/tests/mocks/utils.mock'
import { encodeFunctionData } from 'viem'
import type { TableRow } from '@/types/table'

type MutationMock = {
  mutate: ReturnType<typeof vi.fn>
  isPending: ReturnType<typeof ref<boolean>>
  error: ReturnType<typeof ref<Error | null>>
}

const createMutation = (): MutationMock => ({
  mutate: vi.fn(),
  isPending: ref(false),
  error: ref(null)
})

const mutationByFn = {
  transferOwnership: createMutation(),
  pause: createMutation(),
  unpause: createMutation()
}

vi.mock('@/composables/contracts/useContractWritesV3', () => ({
  useContractWritesV3: vi.fn(({ functionName }: { functionName: string }) => {
    const key = functionName as keyof typeof mutationByFn
    return mutationByFn[key] ?? createMutation()
  })
}))

const DEFAULT_ROW: TableRow = {
  address: '0xContract000000000000000000000000000001',
  abi: [
    { name: 'pause', type: 'function', inputs: [], outputs: [], stateMutability: 'nonpayable' },
    { name: 'unpause', type: 'function', inputs: [], outputs: [], stateMutability: 'nonpayable' },
    {
      name: 'transferOwnership',
      type: 'function',
      inputs: [{ name: 'newOwner', type: 'address' }],
      outputs: [],
      stateMutability: 'nonpayable'
    }
  ],
  paused: false,
  owner: '0xOwner0000000000000000000000000000000001',
  deployer: '0xDeployer0000000000000000000000000000001',
  type: 'Treasury'
}

type ControllerProps = {
  isBodAction: boolean
  open: 'details' | 'transfer' | 'approval' | null
  pendingActions: TableRow[]
  statusChangeRequest: { id: number; paused: boolean } | null
}

const stubs = {
  TransferOwnershipForm: {
    name: 'TransferOwnershipForm',
    props: ['isBodAction', 'loading'],
    emits: ['transfer-ownership'],
    template:
      '<div data-test="transfer-ownership-form">' +
      '<button data-test="emit-transfer" @click="$emit(\'transfer-ownership\', \'0xNewOwner0000000000000000000000000001\')">Transfer</button>' +
      '</div>'
  },
  PendingEventsList: {
    name: 'PendingEventsList',
    props: ['pendingActions'],
    emits: ['view-details'],
    template: '<div data-test="pending-events-list"></div>'
  },
  BodApprovalContent: {
    name: 'BodApprovalContent',
    props: ['row', 'loading'],
    emits: ['approve-action', 'close'],
    template:
      '<div data-test="bod-approval-modal">' +
      '<button data-test="emit-approve" @click="$emit(\'approve-action\', 1, 2)">Approve</button>' +
      '<button data-test="emit-close" @click="$emit(\'close\')">Close</button>' +
      '</div>'
  },
  ContractReadDataSection: {
    name: 'ContractReadDataSection',
    props: ['address', 'abi', 'contractType', 'enabled'],
    template: '<section data-test="contract-read-data-section" />'
  },
  UAlert: {
    name: 'UAlert',
    props: ['color', 'title', 'description', 'variant', 'icon'],
    template: '<div data-test="u-alert">{{ title }}{{ description }}</div>'
  },
  Slideover: {
    name: 'USlideover',
    props: ['open', 'title', 'description'],
    template: '<aside v-if="open" data-test="contract-details"><slot name="body" /></aside>'
  }
}

function mountComponent(
  rowOverrides: Partial<TableRow> = {},
  controllerProps: Partial<ControllerProps> = {}
) {
  return mount(MainContractActions, {
    props: {
      row: { ...DEFAULT_ROW, ...rowOverrides },
      isBodAction: false,
      open: null,
      pendingActions: [],
      statusChangeRequest: null,
      ...controllerProps
    },
    global: {
      plugins: [createTestingPinia({ createSpy: vi.fn })],
      stubs
    }
  })
}

const resetMutationMocks = () => {
  Object.values(mutationByFn).forEach((mutation) => {
    mutation.mutate.mockReset()
    mutation.isPending.value = false
    mutation.error.value = null
  })
}

describe('MainContractActions.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetMutationMocks()
    vi.stubGlobal('useToast', () => mockToast)

    useQueryClientFn.mockReturnValue({
      invalidateQueries: mockInvalidateQueries,
      getQueryData: vi.fn(),
      setQueryData: vi.fn(),
      removeQueries: vi.fn()
    })

    mockUserStore.address = '0x0000000000000000000000000000000000000001'
    mockBodAddAction.isSuccess.value = false
    mockBodAddAction.isPending.value = false
    mockBodApproveAction.isPending.value = false
    mockBodApproveAction.isSuccess.value = false
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders details for the selected contract only when requested', async () => {
    const wrapper = mountComponent({}, { open: 'details' })

    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-test="contract-details"]').exists()).toBe(true)
    expect(wrapper.getComponent({ name: 'ContractReadDataSection' }).props()).toMatchObject({
      address: DEFAULT_ROW.address,
      abi: DEFAULT_ROW.abi,
      contractType: DEFAULT_ROW.type,
      enabled: true
    })
  })

  it('executes a direct ownership transfer for the selected owner', async () => {
    const wrapper = mountComponent({ owner: mockUserStore.address }, { open: 'transfer' })

    await wrapper.find('[data-test="emit-transfer"]').trigger('click')

    expect(mutationByFn.transferOwnership.mutate).toHaveBeenCalled()
  })

  it('creates a Board action when the selected transfer is Board-gated', async () => {
    const wrapper = mountComponent({}, { open: 'transfer', isBodAction: true })

    await wrapper.find('[data-test="emit-transfer"]').trigger('click')
    await flushPromises()

    expect(vi.mocked(encodeFunctionData)).toHaveBeenCalledWith(
      expect.objectContaining({ functionName: 'transferOwnership' })
    )
    expect(mockBodAddAction.executeAddAction).toHaveBeenCalled()
  })

  it('logs a direct ownership-transfer error without closing the selected modal', async () => {
    const wrapper = mountComponent({ owner: mockUserStore.address }, { open: 'transfer' })

    await wrapper.find('[data-test="emit-transfer"]').trigger('click')
    mutationByFn.transferOwnership.error.value = new Error('reverted')
    await flushPromises()

    expect(mockLog.error).toHaveBeenCalled()
    expect(wrapper.find('[data-test="transfer-ownership-form"]').exists()).toBe(true)
  })

  it('opens a selected pending-actions flow and approves its chosen action', async () => {
    const wrapper = mountComponent({}, { open: 'approval', pendingActions: [{ id: 1 }] })

    await wrapper.vm.$nextTick()
    await wrapper.findComponent({ name: 'PendingEventsList' }).vm.$emit('view-details', { id: 1 })
    await wrapper.find('[data-test="emit-approve"]').trigger('click')

    expect(mockBodApproveAction.executeApproveAction).toHaveBeenCalledWith(1, 2)
  })

  it('asks the table to close the pending-actions flow', async () => {
    const wrapper = mountComponent({}, { open: 'approval', pendingActions: [{ id: 1 }] })

    await wrapper.vm.$nextTick()
    await wrapper.findComponent({ name: 'PendingEventsList' }).vm.$emit('view-details', { id: 1 })
    await wrapper.find('[data-test="emit-close"]').trigger('click')

    expect(wrapper.emitted('update:open')).toContainEqual([null])
  })

  it('notifies the table when a Board action or approval succeeds', async () => {
    const wrapper = mountComponent({}, { open: 'approval', pendingActions: [{ id: 1 }] })

    mockBodAddAction.isSuccess.value = true
    await wrapper.vm.$nextTick()

    mockBodApproveAction.isSuccess.value = true
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('contract-status-changed')).toBeTruthy()
  })

  it('notifies the table and invalidates reads when direct transfer succeeds', async () => {
    type MutateOpts = { onSuccess?: () => void }
    mutationByFn.transferOwnership.mutate.mockImplementationOnce(
      (_variables: unknown, options?: MutateOpts) => options?.onSuccess?.()
    )
    const wrapper = mountComponent({ owner: mockUserStore.address }, { open: 'transfer' })

    await wrapper.find('[data-test="emit-transfer"]').trigger('click')
    await flushPromises()

    expect(mockInvalidateQueries).toHaveBeenCalledTimes(2)
    expect(wrapper.emitted('contract-status-changed')).toBeTruthy()
    expect(wrapper.emitted('update:open')).toContainEqual([null])
  })

  it('runs the selected contract status write once for each request', async () => {
    const active = mountComponent({}, { statusChangeRequest: { id: 1, paused: false } })
    await flushPromises()
    expect(mutationByFn.pause.mutate).toHaveBeenCalledTimes(1)

    const paused = mountComponent(
      { paused: true },
      { statusChangeRequest: { id: 2, paused: true } }
    )
    await flushPromises()
    expect(mutationByFn.unpause.mutate).toHaveBeenCalledTimes(1)

    active.unmount()
    paused.unmount()
  })

  it('notifies the table when the selected pause or resume write succeeds', async () => {
    type MutateOpts = { onSuccess?: () => void }
    mutationByFn.pause.mutate.mockImplementationOnce((_value: unknown, options?: MutateOpts) =>
      options?.onSuccess?.()
    )
    const pauseWrapper = mountComponent({}, { statusChangeRequest: { id: 1, paused: false } })
    await flushPromises()
    expect(pauseWrapper.emitted('contract-status-changed')).toBeTruthy()

    mutationByFn.unpause.mutate.mockImplementationOnce((_value: unknown, options?: MutateOpts) =>
      options?.onSuccess?.()
    )
    const resumeWrapper = mountComponent(
      { paused: true },
      { statusChangeRequest: { id: 2, paused: true } }
    )
    await flushPromises()
    expect(resumeWrapper.emitted('contract-status-changed')).toBeTruthy()
  })

  it('logs selected pause and resume errors', async () => {
    const pauseWrapper = mountComponent({}, { statusChangeRequest: { id: 1, paused: false } })
    mutationByFn.pause.error.value = new Error('pause failed')
    await flushPromises()
    expect(mockLog.error).toHaveBeenCalled()

    mockLog.error.mockClear()
    const resumeWrapper = mountComponent(
      { paused: true },
      { statusChangeRequest: { id: 2, paused: true } }
    )
    mutationByFn.unpause.error.value = new Error('unpause failed')
    await flushPromises()
    expect(mockLog.error).toHaveBeenCalled()

    pauseWrapper.unmount()
    resumeWrapper.unmount()
  })
})
