import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { createTestingPinia } from '@pinia/testing'
import MainContractActions from '../MainContractActions.vue'
import { mockToast, mockUserStore } from '@/tests/mocks'
import { mockBodAddAction, mockBodApproveAction, mockBodIsBodAction } from '@/tests/mocks'
import { useQueryClientFn, mockInvalidateQueries } from '@/tests/mocks/composables.mock'
import { mockLog } from '@/tests/mocks/utils.mock'
import { encodeFunctionData } from 'viem'
import * as utils from '@/utils'
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
  type: 'Treasury'
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
  BodApprovalModal: {
    name: 'BodApprovalModal',
    props: ['row', 'loading'],
    emits: ['approve-action', 'close'],
    template:
      '<div data-test="bod-approval-modal">' +
      '<button data-test="emit-approve" @click="$emit(\'approve-action\', 1, 2)">Approve</button>' +
      '<button data-test="emit-close" @click="$emit(\'close\')">Close</button>' +
      '</div>'
  },
  UAlert: {
    name: 'UAlert',
    props: ['color', 'title', 'description', 'variant', 'icon'],
    template: '<div data-test="u-alert">{{ title }}{{ description }}</div>'
  }
}

function mountComponent(rowOverrides: Partial<TableRow> = {}) {
  return mount(MainContractActions, {
    props: { row: { ...DEFAULT_ROW, ...rowOverrides } },
    global: {
      plugins: [createTestingPinia({ createSpy: vi.fn })],
      stubs
    }
  })
}

const resetMutationMocks = () => {
  Object.values(mutationByFn).forEach((m) => {
    m.mutate.mockReset()
    m.isPending.value = false
    m.error.value = null
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
    mockBodIsBodAction.isBodAction.value = false
    mockBodAddAction.isSuccess.value = false
    mockBodAddAction.isPending.value = false
    mockBodApproveAction.isPending.value = false
    mockBodApproveAction.isSuccess.value = false

    vi.spyOn(utils, 'filterAndFormatActions').mockReturnValue([])
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders and toggles action button state from paused flag', () => {
    const active = mountComponent({ paused: false })
    const paused = mountComponent({ paused: true })

    expect(active.text()).toContain('Transfer Ownership')
    expect(active.text()).toContain('Pending Actions')
    expect(active.findAllComponents({ name: 'UButton' })[0]?.props('color')).toBe('error')
    expect(paused.findAllComponents({ name: 'UButton' })[0]?.props('color')).toBe('info')
  })

  it('disables privileged actions for non-owner non-BOD user', () => {
    const wrapper = mountComponent()
    expect(wrapper.findAll('button')[0]?.attributes('disabled')).toBeDefined()
    expect(wrapper.findAll('button')[1]?.attributes('disabled')).toBeDefined()
  })

  it('calls pause write when contract is active', async () => {
    mockBodIsBodAction.isBodAction.value = true

    const wrapper = mountComponent({ paused: false })
    await wrapper.findAll('button')[0]?.trigger('click')
    expect(mutationByFn.pause.mutate).toHaveBeenCalled()
  })

  it('calls unpause write when contract is paused', async () => {
    mockBodIsBodAction.isBodAction.value = true

    const wrapper = mountComponent({ paused: true })
    await wrapper.findAll('button')[0]?.trigger('click')
    expect(mutationByFn.unpause.mutate).toHaveBeenCalled()
  })

  it('opens transfer modal and executes transfer directly when not BOD', async () => {
    const wrapper = mountComponent({ owner: mockUserStore.address })
    await wrapper.findAll('button')[1]?.trigger('click')
    await wrapper.find('[data-test="emit-transfer"]')?.trigger('click')

    expect(mutationByFn.transferOwnership.mutate).toHaveBeenCalled()
  })

  it('creates BOD action with encoded data when transfer is BOD-gated', async () => {
    mockBodIsBodAction.isBodAction.value = true
    const wrapper = mountComponent()

    await wrapper.findAll('button')[1]?.trigger('click')
    await wrapper.find('[data-test="emit-transfer"]')?.trigger('click')
    await flushPromises()

    expect(vi.mocked(encodeFunctionData)).toHaveBeenCalledWith(
      expect.objectContaining({ functionName: 'transferOwnership' })
    )
    expect(mockBodAddAction.executeAddAction).toHaveBeenCalled()
  })

  it('shows transfer error alert and logs error when transfer write fails', async () => {
    const wrapper = mountComponent({ owner: mockUserStore.address })
    await wrapper.findAll('button')[1]?.trigger('click')
    await wrapper.find('[data-test="emit-transfer"]')?.trigger('click')

    mutationByFn.transferOwnership.error.value = new Error('reverted')
    await flushPromises()

    expect(mockLog.error).toHaveBeenCalled()
  })

  it('opens pending actions flow and approves selected action', async () => {
    mockBodIsBodAction.isBodAction.value = true
    vi.spyOn(utils, 'filterAndFormatActions').mockReturnValue([{ id: 1 } as never])
    const wrapper = mountComponent()

    await wrapper.findAll('button')[2]?.trigger('click')
    await wrapper.findComponent({ name: 'PendingEventsList' }).vm.$emit('view-details', { id: 1 })
    await wrapper.find('[data-test="emit-approve"]')?.trigger('click')

    expect(mockBodApproveAction.executeApproveAction).toHaveBeenCalledWith(1, 2)
  })

  it('closes approval modal on close event', async () => {
    mockBodIsBodAction.isBodAction.value = true
    vi.spyOn(utils, 'filterAndFormatActions').mockReturnValue([{ id: 1 } as never])
    const wrapper = mountComponent()

    await wrapper.findAll('button')[2]?.trigger('click')
    await wrapper.findComponent({ name: 'PendingEventsList' }).vm.$emit('view-details', { id: 1 })
    await wrapper.find('[data-test="emit-close"]')?.trigger('click')

    expect(wrapper.find('[data-test="bod-approval-modal"]').exists()).toBe(false)
  })

  it('emits contract-status-changed when action add and approval succeed', async () => {
    mockBodIsBodAction.isBodAction.value = true
    vi.spyOn(utils, 'filterAndFormatActions').mockReturnValue([{ id: 1 } as never])
    const wrapper = mountComponent()

    await wrapper.findAll('button')[1]?.trigger('click')
    mockBodAddAction.isSuccess.value = true
    await wrapper.vm.$nextTick()

    await wrapper.findAll('button')[2]?.trigger('click')
    mockBodApproveAction.isSuccess.value = true
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('contract-status-changed')).toBeTruthy()
  })

  it('emits and invalidates queries when transfer succeeds', async () => {
    type MutateOpts = { onSuccess?: () => void }
    mutationByFn.transferOwnership.mutate.mockImplementationOnce(
      (_vars: unknown, opts?: MutateOpts) => opts?.onSuccess?.()
    )
    const wrapper = mountComponent({ owner: mockUserStore.address })
    await wrapper.findAll('button')[1]?.trigger('click')
    await wrapper.find('[data-test="emit-transfer"]')?.trigger('click')
    await flushPromises()

    expect(mockInvalidateQueries).toHaveBeenCalledTimes(2)
    expect(wrapper.emitted('contract-status-changed')).toBeTruthy()
  })

  it('emits contract-status-changed when pause and unpause mutations succeed', async () => {
    mockBodIsBodAction.isBodAction.value = true
    type MutateOpts = { onSuccess?: () => void }

    mutationByFn.pause.mutate.mockImplementationOnce(
      (_v: unknown, opts?: MutateOpts) => opts?.onSuccess?.()
    )
    const pauseWrapper = mountComponent({ paused: false })
    await pauseWrapper.findAll('button')[0]?.trigger('click')
    await flushPromises()
    expect(pauseWrapper.emitted('contract-status-changed')).toBeTruthy()

    mutationByFn.unpause.mutate.mockImplementationOnce(
      (_v: unknown, opts?: MutateOpts) => opts?.onSuccess?.()
    )
    const unpauseWrapper = mountComponent({ paused: true })
    await unpauseWrapper.findAll('button')[0]?.trigger('click')
    await flushPromises()
    expect(unpauseWrapper.emitted('contract-status-changed')).toBeTruthy()
  })

  it('logs pause/unpause errors', async () => {
    const wrapper = mountComponent()
    mockLog.error.mockClear()

    mutationByFn.pause.error.value = new Error('pause failed')
    await flushPromises()
    expect(mockLog.error).toHaveBeenCalled()

    mockLog.error.mockClear()
    mutationByFn.unpause.error.value = new Error('unpause failed')
    await flushPromises()
    expect(mockLog.error).toHaveBeenCalled()

    wrapper.unmount()
  })
})
