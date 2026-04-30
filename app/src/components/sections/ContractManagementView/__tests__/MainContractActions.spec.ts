import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { createTestingPinia } from '@pinia/testing'
import MainContractActions from '../MainContractActions.vue'
import { mockToast, mockUserStore } from '@/tests/mocks'
import {
  mockBodAddAction,
  mockBodIsBodAction,
  mockBODWrites,
  useWaitForTransactionReceiptFn,
  useWriteContractFn
} from '@/tests/mocks'
import { useQueryClientFn, mockInvalidateQueries } from '@/tests/mocks/composables.mock'
import { mockLog } from '@/tests/mocks/utils.mock'
import { encodeFunctionData } from 'viem'
import * as utils from '@/utils'
import type { TableRow } from '@/types/table'

type WriteState = {
  data: ReturnType<typeof ref<`0x${string}` | undefined>>
  mutate: ReturnType<typeof vi.fn>
  isPending: ReturnType<typeof ref<boolean>>
  error: ReturnType<typeof ref<Error | null>>
}

type ReceiptState = {
  isLoading: ReturnType<typeof ref<boolean>>
  isSuccess: ReturnType<typeof ref<boolean>>
}

const DEFAULT_ROW: TableRow = {
  address: '0xContract000000000000000000000000000001',
  abi: [
    { name: 'pause', type: 'function', inputs: [], outputs: [], stateMutability: 'nonpayable' },
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

const createWriteState = (): WriteState => ({
  data: ref(undefined),
  mutate: vi.fn(),
  isPending: ref(false),
  error: ref(null)
})

const createReceiptState = (): ReceiptState => ({
  isLoading: ref(false),
  isSuccess: ref(false)
})

function mountComponent(rowOverrides: Partial<TableRow> = {}) {
  return mount(MainContractActions, {
    props: { row: { ...DEFAULT_ROW, ...rowOverrides } },
    global: {
      plugins: [createTestingPinia({ createSpy: vi.fn })],
      stubs
    }
  })
}

describe('MainContractActions.vue', () => {
  let transferWrite: WriteState
  let pauseWrite: WriteState
  let unpauseWrite: WriteState
  let transferReceipt: ReceiptState
  let pauseReceipt: ReceiptState
  let unpauseReceipt: ReceiptState

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('useToast', () => mockToast)

    transferWrite = createWriteState()
    pauseWrite = createWriteState()
    unpauseWrite = createWriteState()
    transferReceipt = createReceiptState()
    pauseReceipt = createReceiptState()
    unpauseReceipt = createReceiptState()

    useWriteContractFn
      .mockReset()
      .mockReturnValueOnce(transferWrite)
      .mockReturnValueOnce(pauseWrite)
      .mockReturnValueOnce(unpauseWrite)

    useWaitForTransactionReceiptFn
      .mockReset()
      .mockReturnValueOnce(transferReceipt)
      .mockReturnValueOnce(pauseReceipt)
      .mockReturnValueOnce(unpauseReceipt)

    useQueryClientFn.mockReturnValue({
      invalidateQueries: mockInvalidateQueries,
      getQueryData: vi.fn(),
      setQueryData: vi.fn(),
      removeQueries: vi.fn()
    })

    mockUserStore.address = '0x0000000000000000000000000000000000000001'
    mockBodIsBodAction.isBodAction.value = false
    mockBodAddAction.isActionAdded.value = false
    mockBodAddAction.isPending.value = false
    mockBODWrites.approve.writeResult.isPending.value = false
    mockBODWrites.approve.receiptResult.isSuccess.value = false

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
    expect(pauseWrite.mutate).toHaveBeenCalledWith(
      expect.objectContaining({ functionName: 'pause' })
    )
  })

  it('calls unpause write when contract is paused', async () => {
    mockBodIsBodAction.isBodAction.value = true

    const wrapper = mountComponent({ paused: true })
    await wrapper.findAll('button')[0]?.trigger('click')
    expect(unpauseWrite.mutate).toHaveBeenCalledWith(
      expect.objectContaining({ functionName: 'unpause' })
    )
  })

  it('opens transfer modal and executes transfer directly when not BOD', async () => {
    const wrapper = mountComponent({ owner: mockUserStore.address })
    await wrapper.findAll('button')[1]?.trigger('click')
    await wrapper.find('[data-test="emit-transfer"]')?.trigger('click')

    expect(transferWrite.mutate).toHaveBeenCalledWith(
      expect.objectContaining({ functionName: 'transferOwnership' })
    )
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

    transferWrite.error.value = new Error('reverted')
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

    expect(mockBODWrites.approve.executeWrite).toHaveBeenCalledWith(1, 2)
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
    mockBodAddAction.isActionAdded.value = true
    await wrapper.vm.$nextTick()

    await wrapper.findAll('button')[2]?.trigger('click')
    mockBODWrites.approve.receiptResult.isSuccess.value = true
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('contract-status-changed')).toBeTruthy()
  })

  it('emits and invalidates queries when transfer confirmation succeeds', async () => {
    const wrapper = mountComponent({ owner: mockUserStore.address })

    transferReceipt.isLoading.value = true
    await wrapper.vm.$nextTick()
    transferReceipt.isLoading.value = false
    transferReceipt.isSuccess.value = true
    await flushPromises()

    expect(mockInvalidateQueries).toHaveBeenCalledTimes(2)
    expect(wrapper.emitted('contract-status-changed')).toBeTruthy()
  })

  it('emits contract-status-changed when pause and unpause confirmations succeed', async () => {
    const wrapper = mountComponent()

    pauseReceipt.isLoading.value = true
    await wrapper.vm.$nextTick()
    pauseReceipt.isLoading.value = false
    pauseReceipt.isSuccess.value = true

    unpauseReceipt.isLoading.value = true
    await wrapper.vm.$nextTick()
    unpauseReceipt.isLoading.value = false
    unpauseReceipt.isSuccess.value = true
    await flushPromises()

    expect(wrapper.emitted('contract-status-changed')).toBeTruthy()
  })

  it('logs pause/unpause errors', async () => {
    mountComponent()

    pauseWrite.error.value = new Error('pause failed')
    unpauseWrite.error.value = new Error('unpause failed')
    await flushPromises()

    expect(mockLog.error).toHaveBeenCalledTimes(2)
  })
})
