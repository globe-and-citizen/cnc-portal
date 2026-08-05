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
  deployer: '0xDeployer0000000000000000000000000000001',
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

function mountComponent(rowOverrides: Partial<TableRow> = {}) {
  return mount(MainContractActions, {
    props: { row: { ...DEFAULT_ROW, ...rowOverrides } },
    global: {
      plugins: [createTestingPinia({ createSpy: vi.fn })],
      stubs
    }
  })
}

type MenuItem = {
  label?: string
  color?: string
  disabled?: boolean
  onSelect?: () => void
}

function getMenuItems(wrapper: ReturnType<typeof mountComponent>): MenuItem[] {
  const dropdown = wrapper.findComponent({ name: 'UDropdown' })
  return (dropdown.props('items') as MenuItem[][]).flat()
}

function selectMenuItem(wrapper: ReturnType<typeof mountComponent>, label: string) {
  const item = getMenuItems(wrapper).find((candidate) => candidate.label === label)
  expect(item, `Menu item "${label}"`).toBeDefined()
  item?.onSelect?.()
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

  it('renders the contextual actions for active and paused contracts', () => {
    const active = mountComponent({ paused: false })
    const paused = mountComponent({ paused: true })

    expect(getMenuItems(active).map((item) => item.label)).toContain('Transfer ownership')
    expect(getMenuItems(active).map((item) => item.label)).toContain('Pause contract')
    expect(getMenuItems(paused).map((item) => item.label)).toContain('Resume contract')
    expect(getMenuItems(active).find((item) => item.label === 'Pause contract')?.color).toBe(
      'error'
    )
    expect(getMenuItems(paused).find((item) => item.label === 'Resume contract')?.color).toBe(
      'success'
    )
  })

  it('opens the contract details slideover from the contextual menu', async () => {
    const wrapper = mountComponent()

    selectMenuItem(wrapper, 'View contract details')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-test="contract-details"]').exists()).toBe(true)
    const contractData = wrapper.getComponent({ name: 'ContractReadDataSection' })
    expect(contractData.props()).toMatchObject({
      address: DEFAULT_ROW.address,
      abi: DEFAULT_ROW.abi,
      contractType: DEFAULT_ROW.type,
      enabled: true
    })
  })

  it('disables privileged actions for non-owner non-BOD user', () => {
    const wrapper = mountComponent()
    expect(
      getMenuItems(wrapper).find((item) => item.label === 'Transfer ownership')?.disabled
    ).toBe(true)
    expect(getMenuItems(wrapper).find((item) => item.label === 'Pause contract')?.disabled).toBe(
      true
    )
  })

  it('calls pause write when contract is active', async () => {
    mockBodIsBodAction.isBodAction.value = true

    const wrapper = mountComponent({ paused: false })
    selectMenuItem(wrapper, 'Pause contract')
    expect(mutationByFn.pause.mutate).toHaveBeenCalled()
  })

  it('calls unpause write when contract is paused', async () => {
    mockBodIsBodAction.isBodAction.value = true

    const wrapper = mountComponent({ paused: true })
    selectMenuItem(wrapper, 'Resume contract')
    expect(mutationByFn.unpause.mutate).toHaveBeenCalled()
  })

  it('opens transfer modal and executes transfer directly when not BOD', async () => {
    const wrapper = mountComponent({ owner: mockUserStore.address })
    selectMenuItem(wrapper, 'Transfer ownership')
    await wrapper.vm.$nextTick()
    await wrapper.find('[data-test="emit-transfer"]')?.trigger('click')

    expect(mutationByFn.transferOwnership.mutate).toHaveBeenCalled()
  })

  it('creates BOD action with encoded data when transfer is BOD-gated', async () => {
    mockBodIsBodAction.isBodAction.value = true
    const wrapper = mountComponent()

    selectMenuItem(wrapper, 'Transfer ownership')
    await wrapper.vm.$nextTick()
    await wrapper.find('[data-test="emit-transfer"]')?.trigger('click')
    await flushPromises()

    expect(vi.mocked(encodeFunctionData)).toHaveBeenCalledWith(
      expect.objectContaining({ functionName: 'transferOwnership' })
    )
    expect(mockBodAddAction.executeAddAction).toHaveBeenCalled()
  })

  it('shows transfer error alert and logs error when transfer write fails', async () => {
    const wrapper = mountComponent({ owner: mockUserStore.address })
    selectMenuItem(wrapper, 'Transfer ownership')
    await wrapper.vm.$nextTick()
    await wrapper.find('[data-test="emit-transfer"]')?.trigger('click')

    mutationByFn.transferOwnership.error.value = new Error('reverted')
    await flushPromises()

    expect(mockLog.error).toHaveBeenCalled()
  })

  it('opens pending actions flow and approves selected action', async () => {
    mockBodIsBodAction.isBodAction.value = true
    vi.spyOn(utils, 'filterAndFormatActions').mockReturnValue([{ id: 1 } as never])
    const wrapper = mountComponent()

    selectMenuItem(wrapper, 'Review pending actions (1)')
    await wrapper.vm.$nextTick()
    await wrapper.findComponent({ name: 'PendingEventsList' }).vm.$emit('view-details', { id: 1 })
    await wrapper.find('[data-test="emit-approve"]')?.trigger('click')

    expect(mockBodApproveAction.executeApproveAction).toHaveBeenCalledWith(1, 2)
  })

  it('closes approval modal on close event', async () => {
    mockBodIsBodAction.isBodAction.value = true
    vi.spyOn(utils, 'filterAndFormatActions').mockReturnValue([{ id: 1 } as never])
    const wrapper = mountComponent()

    selectMenuItem(wrapper, 'Review pending actions (1)')
    await wrapper.vm.$nextTick()
    await wrapper.findComponent({ name: 'PendingEventsList' }).vm.$emit('view-details', { id: 1 })
    await wrapper.find('[data-test="emit-close"]')?.trigger('click')

    expect(wrapper.find('[data-test="bod-approval-modal"]').exists()).toBe(false)
  })

  it('emits contract-status-changed when action add and approval succeed', async () => {
    mockBodIsBodAction.isBodAction.value = true
    vi.spyOn(utils, 'filterAndFormatActions').mockReturnValue([{ id: 1 } as never])
    const wrapper = mountComponent()

    mockBodAddAction.isSuccess.value = true
    await wrapper.vm.$nextTick()

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
    selectMenuItem(wrapper, 'Transfer ownership')
    await wrapper.vm.$nextTick()
    await wrapper.find('[data-test="emit-transfer"]')?.trigger('click')
    await flushPromises()

    expect(mockInvalidateQueries).toHaveBeenCalledTimes(2)
    expect(wrapper.emitted('contract-status-changed')).toBeTruthy()
  })

  it('emits contract-status-changed when pause and unpause mutations succeed', async () => {
    mockBodIsBodAction.isBodAction.value = true
    type MutateOpts = { onSuccess?: () => void }

    mutationByFn.pause.mutate.mockImplementationOnce((_v: unknown, opts?: MutateOpts) =>
      opts?.onSuccess?.()
    )
    const pauseWrapper = mountComponent({ paused: false })
    selectMenuItem(pauseWrapper, 'Pause contract')
    await flushPromises()
    expect(pauseWrapper.emitted('contract-status-changed')).toBeTruthy()

    mutationByFn.unpause.mutate.mockImplementationOnce((_v: unknown, opts?: MutateOpts) =>
      opts?.onSuccess?.()
    )
    const unpauseWrapper = mountComponent({ paused: true })
    selectMenuItem(unpauseWrapper, 'Resume contract')
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
