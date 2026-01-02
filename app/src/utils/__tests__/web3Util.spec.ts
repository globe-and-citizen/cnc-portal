// network-utils.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NETWORK } from '@/constant'
import { getChain, getPublicClient, clientToSigner } from '../web3Util'
import {
  createPublicClient,
  http,
  type Account,
  type Chain,
  type Client,
  type HttpTransport,
  type RpcSchema,
  type Transport
} from 'viem'
import { mainnet, sepolia, polygon, hardhat, polygonAmoy } from 'viem/chains'

const { mockGetSigner, MockWeb3Provider } = vi.hoisted(() => ({
  mockGetSigner: vi.fn(),
  MockWeb3Provider: vi.fn()
}))

// Mock dependencies
vi.mock('viem', () => ({
  createPublicClient: vi.fn(),
  http: vi.fn()
}))

vi.mock('viem/chains', () => ({
  mainnet: { id: 1 },
  sepolia: { id: 11155111 },
  polygon: { id: 137 },
  hardhat: { id: 31337 },
  polygonAmoy: { id: 80002 }
}))

// Update your ethers mock to use these
vi.mock('ethers', () => ({
  providers: {
    Web3Provider: MockWeb3Provider
  }
}))

vi.mock('@/constant', () => ({
  NETWORK: {
    chainId: '11155111' // Default to sepolia
  }
}))

describe('getChain', () => {
  it('should return sepolia when chainIdStr is undefined', () => {
    const result = getChain(undefined)
    expect(result).toBe(sepolia)
  })

  it('should return sepolia when chainIdStr is empty string', () => {
    const result = getChain('')
    expect(result).toBe(sepolia)
  })

  it('should parse hex string and return mainnet for 0x1', () => {
    const result = getChain('0x1')
    expect(result).toBe(mainnet)
  })

  it('should parse decimal string and return mainnet for "1"', () => {
    const result = getChain('1')
    expect(result).toBe(mainnet)
  })

  it('should return sepolia for sepolia hex id', () => {
    const result = getChain('0xaa36a7') // 11155111 in hex
    expect(result).toBe(sepolia)
  })

  it('should return sepolia for sepolia decimal id', () => {
    const result = getChain('11155111')
    expect(result).toBe(sepolia)
  })

  it('should return polygon for polygon hex id', () => {
    const result = getChain('0x89') // 137 in hex
    expect(result).toBe(polygon)
  })

  it('should return polygon for polygon decimal id', () => {
    const result = getChain('137')
    expect(result).toBe(polygon)
  })

  it('should return hardhat for hardhat hex id', () => {
    const result = getChain('0x7a69') // 31337 in hex
    expect(result).toBe(hardhat)
  })

  it('should return hardhat for hardhat decimal id', () => {
    const result = getChain('31337')
    expect(result).toBe(hardhat)
  })

  it('should return polygonAmoy for polygonAmoy hex id', () => {
    const result = getChain('0x13882') // 80002 in hex
    expect(result).toBe(polygonAmoy)
  })

  it('should return polygonAmoy for polygonAmoy decimal id', () => {
    const result = getChain('80002')
    expect(result).toBe(polygonAmoy)
  })

  it('should default to sepolia for unknown chain id', () => {
    const result = getChain('999999')
    expect(result).toBe(sepolia)
  })

  it('should handle invalid hex string gracefully', () => {
    const result = getChain('0xinvalid')
    expect(result).toBe(sepolia) // parseInt returns NaN, default to sepolia
  })

  it('should handle invalid decimal string gracefully', () => {
    const result = getChain('not-a-number')
    expect(result).toBe(sepolia) // parseInt returns NaN, default to sepolia
  })
})

describe('getPublicClient', () => {
  const mockHttpTransport = {}
  const mockPublicClient = {}

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(http).mockReturnValue(
      mockHttpTransport as HttpTransport<RpcSchema | undefined, boolean>
    )
    //@ts-expect-error: mock value
    vi.mocked(createPublicClient).mockReturnValue(mockPublicClient)
  })

  it('should create public client with default chain from NETWORK', () => {
    const result = getPublicClient()

    expect(http).toHaveBeenCalledOnce()
    expect(createPublicClient).toHaveBeenCalledWith({
      chain: sepolia, // Default from NETWORK.chainId
      transport: mockHttpTransport
    })
    expect(result).toBe(mockPublicClient)
  })

  it('should create public client with specified chain id', () => {
    const result = getPublicClient('137')

    expect(http).toHaveBeenCalledOnce()
    expect(createPublicClient).toHaveBeenCalledWith({
      chain: polygon,
      transport: mockHttpTransport
    })
    expect(result).toBe(mockPublicClient)
  })

  it('should handle hex chain id', () => {
    const result = getPublicClient('0x89')

    expect(http).toHaveBeenCalledOnce()
    expect(createPublicClient).toHaveBeenCalledWith({
      chain: polygon,
      transport: mockHttpTransport
    })
    expect(result).toBe(mockPublicClient)
  })
})

describe('clientToSigner', () => {
  const mockTransport = {}
  const mockAccount = {
    address: '0x1234567890123456789012345678901234567890'
  }
  const mockSigner = {}

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSigner.mockClear()
    MockWeb3Provider.mockClear()

    // Create fresh mock instance for each test
    MockWeb3Provider.mockImplementation(function (this: { getSigner: () => void }) {
      // 'this' will refer to the instance when called with 'new'
      this.getSigner = mockGetSigner
      return this
    })

    mockGetSigner.mockReturnValue(mockSigner)
  })

  it('should create a signer from client with POLYGON_NETWORK', () => {
    const mockClient = {
      account: mockAccount,
      transport: mockTransport,
      chain: { id: 1, name: 'mainnet' }
    } as Client<Transport, Chain, Account>

    const result = clientToSigner(mockClient)

    // Check that Web3Provider was called with correct arguments
    expect(MockWeb3Provider).toHaveBeenCalledWith(mockTransport, {
      chainId: 137,
      name: 'polygon',
      ensAddress: undefined
    })

    expect(mockGetSigner).toHaveBeenCalledWith(mockAccount.address)
    expect(result).toBe(mockSigner)
  })

  it('should handle different account addresses', () => {
    const differentAccount = {
      address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'
    }
    const mockClient = {
      account: differentAccount,
      transport: mockTransport,
      chain: { id: 1, name: 'mainnet' }
    } as Client<Transport, Chain, Account>

    const result = clientToSigner(mockClient)

    expect(MockWeb3Provider).toHaveBeenCalledWith(mockTransport, {
      chainId: 137,
      name: 'polygon',
      ensAddress: undefined
    })

    expect(mockGetSigner).toHaveBeenCalledWith(differentAccount.address)
    expect(result).toBe(mockSigner)
  })

  it('should use POLYGON_NETWORK regardless of client chain', () => {
    // Test with different chains
    const chains = [
      { id: 1, name: 'mainnet' },
      { id: 11155111, name: 'sepolia' },
      { id: 80002, name: 'polygonAmoy' }
    ]

    chains.forEach((chain) => {
      vi.clearAllMocks()
      mockGetSigner.mockClear()
      MockWeb3Provider.mockClear()

      // Reset mock implementation
      MockWeb3Provider.mockImplementation(function (this: { getSigner: () => void }) {
        this.getSigner = mockGetSigner
        return this
      })

      mockGetSigner.mockReturnValue(mockSigner)

      const mockClient = {
        account: mockAccount,
        transport: mockTransport,
        chain
      } as Client<Transport, Chain, Account>

      clientToSigner(mockClient)

      expect(MockWeb3Provider).toHaveBeenCalledWith(
        mockTransport,
        expect.objectContaining({
          chainId: 137,
          name: 'polygon'
        })
      )
    })
  })
})

// Edge cases and integration tests
describe('Edge Cases', () => {
  it('getChain should handle negative numbers', () => {
    const result = getChain('-1')
    expect(result).toBe(sepolia) // Default for invalid/unknown
  })

  it('getChain should handle very large numbers', () => {
    const result = getChain('999999999999999999999')
    expect(result).toBe(sepolia) // Default for unknown
  })

  it('getPublicClient should handle undefined chain id', () => {
    //@ts-expect-error: test mock value
    vi.mocked(NETWORK).chainId = undefined

    const mockHttpTransport = {}
    const mockPublicClient = {}
    vi.mocked(http).mockReturnValue(
      mockHttpTransport as HttpTransport<RpcSchema | undefined, boolean>
    )
    //@ts-expect-error: mock value
    vi.mocked(createPublicClient).mockReturnValue(mockPublicClient)

    const result = getPublicClient()

    expect(createPublicClient).toHaveBeenCalledWith({
      chain: sepolia, // Should default to sepolia
      transport: mockHttpTransport
    })
    expect(result).toBe(mockPublicClient)

    // Reset mock
    vi.mocked(NETWORK).chainId = '11155111'
  })
})