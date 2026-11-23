import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { reactive, defineComponent, h } from 'vue'
import ContractOwnerCard from '@/components/ui/ContractOwnerCard.vue'
import { useTeamStore } from '@/stores'
import {
  makeTeamStore,
  useReadContractFn,
  useChainIdFn,
  useQueryFn,
  useQueryClientFn,
  useMutationFn,
  mockWagmiCore
} from '@/tests/mocks'
import { mockReadContractAction } from '@/tests/mocks/viem.actions.mock'
import { ownablePausableAbi } from '@/artifacts/abi/ownable-pausable'
import {
  contractReadsOfAddress,
  useContractWritesV3
} from '@/composables/contracts/useContractWritesV3'
import type { Address } from 'viem'

const wagmi = await vi.importActual<typeof import('@wagmi/vue')>('@wagmi/vue')
const core = await vi.importActual<typeof import('@wagmi/core')>('@wagmi/core')
const query = await vi.importActual<typeof import('@tanstack/vue-query')>('@tanstack/vue-query')
const viem = await vi.importActual<typeof import('viem')>('viem')
const actions = await vi.importActual<typeof import('viem/actions')>('viem/actions')
const { hardhat, sepolia } = await import('viem/chains')
const CONTRACT_A = '0x1111111111111111111111111111111111111111' as const
const CONTRACT_B = '0x2222222222222222222222222222222222222222' as const
const ALICE = '0x3333333333333333333333333333333333333333' as const
const BOB = '0x4444444444444444444444444444444444444444' as const
const BOARD = '0x5555555555555555555555555555555555555555' as const

// Actual wagmi, QueryClient and ABI decoding; controlled RPC and team metadata.
// The V3 integration additionally reuses the shared simulate/send/receipt mocks.
describe('ContractOwnerCard real owner-query lifecycle', () => {
  let wrapper: VueWrapper
  let client: InstanceType<typeof query.QueryClient>
  let config: ReturnType<typeof core.createConfig>
  let store: ReturnType<typeof makeTeamStore>
  const rpc = vi.fn<(chainId: number, address: Address) => Promise<Address>>()
  const member = (address: Address = ALICE, name = 'Alice', imageUrl = 'alice.png') => ({
    id: address,
    teamId: 1,
    address,
    name,
    imageUrl
  })
  const settle = async () => {
    await flushPromises()
    await new Promise((resolve) => setTimeout(resolve, 10))
    await flushPromises()
  }
  const render = (contractAddress?: Address) => {
    wrapper = mount(ContractOwnerCard, {
      props: { contractAddress },
      global: {
        plugins: [
          [wagmi.WagmiPlugin, { config, reconnectOnMount: false }],
          [query.VueQueryPlugin, { queryClient: client }]
        ],
        stubs: {
          AddressTooltip: {
            props: ['address'],
            template: '<span data-test="owner-address">{{ address }}</span>'
          }
        }
      }
    })
  }
  const name = () => wrapper.find('[data-test="contract-owner-name"]').text()

  beforeEach(() => {
    useReadContractFn.mockImplementation(wagmi.useReadContract as never)
    useChainIdFn.mockImplementation(wagmi.useChainId as never)
    useQueryFn.mockImplementation(query.useQuery as never)
    useQueryClientFn.mockImplementation(query.useQueryClient as never)
    useMutationFn.mockImplementation(query.useMutation as never)
    mockReadContractAction.mockImplementation(actions.readContract)
    store = reactive(makeTeamStore())
    store.currentTeam.members = [member()]
    store.currentTeam.teamContracts = []
    store.getContractAddressByType = vi.fn(() => store.currentTeam.teamContracts?.[0]?.address)
    vi.mocked(useTeamStore).mockReturnValue(store as ReturnType<typeof useTeamStore>)
    client = new query.QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: Infinity } }
    })
    rpc.mockReset().mockResolvedValue(ALICE)
    const transport = (chainId: number) =>
      viem.custom(
        {
          request: async ({ method, params }) => {
            if (method === 'eth_chainId') return viem.numberToHex(chainId)
            if (method !== 'eth_call') throw new Error(`Unexpected RPC method: ${method}`)
            const [call] = params as [{ to: Address }]
            return viem.encodeFunctionResult({
              abi: ownablePausableAbi,
              functionName: 'owner',
              result: await rpc(chainId, call.to)
            })
          }
        },
        { retryCount: 0 }
      )
    config = core.createConfig({
      chains: [hardhat, sepolia],
      transports: { 31337: transport(31337), 11155111: transport(11155111) },
      storage: null,
      batch: { multicall: false }
    })
  })
  afterEach(() => {
    wrapper?.unmount()
    client.clear()
  })

  it('derives member name/image changes and removal at a constant address without another RPC', async () => {
    render(CONTRACT_A)
    await settle()
    expect(name()).toBe('Alice')
    expect(wrapper.findComponent({ name: 'Avatar' }).props('src')).toContain('alice.png')
    store.currentTeam.members = [member(ALICE, 'Alicia', 'updated.png')]
    await settle()
    expect(name()).toBe('Alicia')
    expect(wrapper.findComponent({ name: 'Avatar' }).props('src')).toContain('updated.png')
    store.currentTeam.members = []
    await settle()
    expect(name().toLowerCase()).toBe(ALICE.toLowerCase())
    expect(rpc).toHaveBeenCalledTimes(1)
  })

  it('updates Board precedence at a constant address when team contract metadata changes', async () => {
    rpc.mockResolvedValue(BOARD)
    store.currentTeam.members = [member(BOARD, 'Board member', '')]
    render(CONTRACT_A)
    await settle()
    expect(name()).toBe('Board member')
    store.currentTeam.teamContracts = [
      { address: BOARD, type: 'BoardOfDirectors', deployer: ALICE, admins: [] }
    ]
    await settle()
    expect(name()).toBe('Board of Directors')
    store.currentTeam.teamContracts = []
    await settle()
    expect(name()).toBe('Board member')
    expect(rpc).toHaveBeenCalledTimes(1)
  })

  it('does not read missing/invalid addresses and starts when the address resolves', async () => {
    render()
    await settle()
    expect(wrapper.text()).toContain('Owner information unavailable')
    expect(rpc).not.toHaveBeenCalled()
    await wrapper.setProps({ contractAddress: '0xInvalid' })
    await settle()
    expect(rpc).not.toHaveBeenCalled()
    await wrapper.setProps({ contractAddress: CONTRACT_A })
    await settle()
    expect(name()).toBe('Alice')
    await wrapper.setProps({ contractAddress: undefined })
    await settle()
    expect(wrapper.find('[data-test="contract-owner-name"]').exists()).toBe(false)
  })

  it('shows an initial RPC failure as unavailable and recovers through Try again', async () => {
    rpc.mockRejectedValueOnce(new Error('RPC unavailable'))
    render(CONTRACT_A)
    await settle()
    expect(wrapper.find('[data-test="contract-owner-error"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="contract-owner-loading"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="contract-owner-name"]').exists()).toBe(false)
    await wrapper.find('[data-test="contract-owner-retry"]').trigger('click')
    await settle()
    expect(name()).toBe('Alice')
    expect(wrapper.find('[data-test="contract-owner-error"]').exists()).toBe(false)
  })

  it('retains cached ownership with a visible refresh-failure warning and recovers', async () => {
    render(CONTRACT_A)
    await settle()
    rpc.mockRejectedValueOnce(new Error('Refresh unavailable'))
    await client.invalidateQueries({ predicate: contractReadsOfAddress(CONTRACT_A, 31337) })
    await settle()
    expect(name()).toBe('Alice')
    expect(wrapper.find('[data-test="contract-owner-error"]').text()).toContain('may be outdated')
    rpc.mockResolvedValue(BOB)
    await wrapper.find('[data-test="contract-owner-retry"]').trigger('click')
    await settle()
    expect(name().toLowerCase()).toBe(BOB.toLowerCase())
    expect(wrapper.find('[data-test="contract-owner-error"]').exists()).toBe(false)
  })

  it('does not present a cached previous-contract owner while the new read is pending or failed', async () => {
    render(CONTRACT_A)
    await settle()
    expect(name()).toBe('Alice')
    let fail!: (reason: Error) => void
    rpc.mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          fail = reject
        })
    )
    await wrapper.setProps({ contractAddress: CONTRACT_B })
    await settle()
    expect(wrapper.find('[data-test="contract-owner-name"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="contract-owner-loading"]').exists()).toBe(true)
    fail(new Error('New contract unavailable'))
    await settle()
    expect(wrapper.find('[data-test="contract-owner-name"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="contract-owner-error"]').exists()).toBe(true)
  })

  it('ignores a late result from a previous contract', async () => {
    let finish!: (value: Address) => void
    rpc
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = resolve
          })
      )
      .mockResolvedValue(BOB)
    render(CONTRACT_A)
    await settle()
    expect(wrapper.find('[data-test="contract-owner-loading"]').exists()).toBe(true)
    await wrapper.setProps({ contractAddress: CONTRACT_B })
    await settle()
    expect(name().toLowerCase()).toBe(BOB.toLowerCase())
    finish(ALICE)
    await settle()
    expect(name().toLowerCase()).toBe(BOB.toLowerCase())
  })

  it('refreshes the actual owner query after a successful V3 ownership transfer', async () => {
    mockWagmiCore.getConnection.mockReturnValue({
      chainId: 31337,
      status: 'connected',
      address: ALICE
    })
    mockWagmiCore.simulateContract.mockResolvedValue({ request: { address: CONTRACT_A } })
    mockWagmiCore.writeContract.mockResolvedValue(`0x${'a'.repeat(64)}`)
    mockWagmiCore.waitForTransactionReceipt.mockResolvedValue({
      status: 'success',
      blockNumber: 1n
    })
    const Parent = defineComponent({
      setup() {
        const transfer = useContractWritesV3({
          contractAddress: CONTRACT_A,
          chainId: 31337,
          abi: ownablePausableAbi,
          functionName: 'transferOwnership'
        })
        return () =>
          h('div', [
            h(ContractOwnerCard, { contractAddress: CONTRACT_A }),
            h(
              'button',
              { 'data-test': 'transfer-owner', onClick: () => transfer.mutate({ args: [BOB] }) },
              'Transfer'
            )
          ])
      }
    })
    wrapper = mount(Parent, {
      global: {
        plugins: [
          [wagmi.WagmiPlugin, { config, reconnectOnMount: false }],
          [query.VueQueryPlugin, { queryClient: client }]
        ]
      }
    })
    await settle()
    expect(name()).toBe('Alice')
    rpc.mockResolvedValue(BOB)
    await wrapper.find('[data-test="transfer-owner"]').trigger('click')
    await settle()
    expect(name().toLowerCase()).toBe(BOB.toLowerCase())
    expect(rpc).toHaveBeenCalledTimes(2)
    expect(mockWagmiCore.simulateContract).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        address: CONTRACT_A,
        chainId: 31337,
        functionName: 'transferOwnership',
        args: [BOB]
      })
    )
  })

  it('changes the owner cache identity on a chain change and rejects invalidation of another chain', async () => {
    rpc.mockImplementation(async (chainId) => (chainId === 31337 ? ALICE : BOB))
    render(CONTRACT_A)
    await settle()
    expect(name()).toBe('Alice')
    config.setState((state) => ({ ...state, chainId: sepolia.id }))
    await settle()
    expect(name().toLowerCase()).toBe(BOB.toLowerCase())
    expect(rpc).toHaveBeenCalledTimes(2)
    await client.invalidateQueries({ predicate: contractReadsOfAddress(CONTRACT_A, 31337) })
    await settle()
    expect(rpc).toHaveBeenCalledTimes(2)
    await client.invalidateQueries({ predicate: contractReadsOfAddress(CONTRACT_A, sepolia.id) })
    await settle()
    expect(rpc).toHaveBeenCalledTimes(3)
  })
})
