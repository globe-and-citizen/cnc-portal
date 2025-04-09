import { describe, it, expect, beforeEach, vi } from 'vitest'
import { validateAddresses, resolveAddress, TOKEN_ADDRESSES } from '../index'
import * as networkModule from '../network'

// Mock the imported JSON files
vi.mock('@/artifacts/deployed_addresses/chain-11155111.json', () => ({
  default: {
    'TipsModule#Tips': '0xbaC3A762bCB30046E04BdF8a9D65d99f483D9cBC',
    'BankBeaconModule#Beacon': '0x2345',
    'BankBeaconModule#Bank': '0x3456',
    'VotingBeaconModule#Beacon': '0x4567',
    'VotingBeaconModule#Voting': '0x5678',
    'BoardOfDirectorsModule#Beacon': '0x6789',
    'BoardOfDirectorsModule#BoardOfDirectors': '0x7890',
    'Officer#Officer': '0x8901',
    'Officer#FactoryBeacon': '0x9012',
    'ExpenseAccountModule#FactoryBeacon': '0xa123',
    'ExpenseAccountModule#ExpenseAccount': '0xb234',
    'ExpenseAccountEIP712Module#ExpenseAccountEIP712': '0xc345',
    'ExpenseAccountEIP712Module#FactoryBeacon': '0xd456',
    'InvestorsV1BeaconModule#Beacon': '0xe567',
    'InvestorsV1BeaconModule#InvestorV1': '0xf678',
    'CashRemunerationEIP712Module#FactoryBeacon': '0xe567',
    'CashRemunerationEIP712Module#CashRemunerationEIP712': '0xf678',
    'MockTokens#USDC': '0xabcd',
    'MockTokens#USDT': '0xbcde'
  }
}))

vi.mock('@/artifacts/deployed_addresses/chain-31337.json', () => ({
  default: {
    'TipsModule#Tips': '0x4567'
  }
}))

describe('Contract Address Resolution', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks()
  })

  describe('validateAddresses', () => {
    it('should not throw error when all required addresses are present', () => {
      // Mock network to return Sepolia chain ID
      vi.spyOn(networkModule, 'getNetwork').mockReturnValue({
        chainId: '0xaa36a7',
        networkName: 'Sepolia',
        rpcUrl: 'https://sepolia.example.com',
        currencySymbol: 'ETH'
      })

      expect(() => validateAddresses()).not.toThrow()
    })
  })

  describe('resolveAddress', () => {
    it('should resolve address correctly for existing key', () => {
      // Mock network to return Sepolia chain ID
      vi.spyOn(networkModule, 'getNetwork').mockReturnValue({
        chainId: '0xaa36a7', // 11155111 in hex
        networkName: 'Sepolia',
        rpcUrl: 'https://sepolia.example.com',
        currencySymbol: 'ETH'
      })

      const address = resolveAddress('TipsModule#Tips')
      expect(address).toBe('0xbaC3A762bCB30046E04BdF8a9D65d99f483D9cBC')
    })
  })

  describe('Network Constants', () => {
    it('should handle address resolution errors gracefully', () => {
      // Mock network to return Hardhat chain ID
      vi.spyOn(networkModule, 'getNetwork').mockReturnValue({
        chainId: '0x7a69',
        networkName: 'Hardhat',
        rpcUrl: 'http://localhost:8545',
        currencySymbol: 'ETH'
      })

      // These should not throw errors but return undefined
      expect(() => {
        resolveAddress('TipsModule#Tips')
        resolveAddress('BankBeaconModule#Beacon')
        resolveAddress('BankBeaconModule#Bank')
      }).not.toThrow()
    })

    describe('TOKEN_ADDRESSES', () => {
      it('should use mock addresses for Sepolia network', () => {
        // Mock network to return Sepolia chain ID
        vi.spyOn(networkModule, 'getNetwork').mockReturnValue({
          chainId: '0xaa36a7', // 11155111 in hex
          networkName: 'Sepolia',
          rpcUrl: 'https://sepolia.example.com',
          currencySymbol: 'ETH'
        })

        expect(TOKEN_ADDRESSES[11155111]).toEqual({
          USDC: '0xabcd',
          USDT: '0xbcde'
        })
      })

      it('should use hardcoded addresses for Polygon network', () => {
        // Mock network to return Polygon chain ID
        vi.spyOn(networkModule, 'getNetwork').mockReturnValue({
          chainId: '0x89', // 137 in hex
          networkName: 'Polygon',
          rpcUrl: 'https://polygon-rpc.com',
          currencySymbol: 'MATIC'
        })

        expect(TOKEN_ADDRESSES[137]).toEqual({
          USDC: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
          USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F'
        })
      })

      it('should resolve mock addresses only when on local hardhat network', () => {
        // Mock network to return Hardhat chain ID
        vi.spyOn(networkModule, 'getNetwork').mockReturnValue({
          chainId: '0x7a69', // 31337 in hex
          networkName: 'Hardhat',
          rpcUrl: 'http://localhost:8545',
          currencySymbol: 'ETH'
        })

        // Add mock token addresses to the hardhat mock
        vi.mock('@/artifacts/deployed_addresses/chain-31337.json', () => ({
          default: {
            'TipsModule#Tips': '0x4567',
            'MockTokens#USDC': '0xLocalMockUSDC',
            'MockTokens#USDT': '0xLocalMockUSDT'
          }
        }))

        expect(TOKEN_ADDRESSES[31337]).toEqual({
          USDC: '',
          USDT: ''
        })
      })

      it('should return empty strings for local chain addresses when not on hardhat', () => {
        // Mock network to return Sepolia chain ID
        vi.spyOn(networkModule, 'getNetwork').mockReturnValue({
          chainId: '0xaa36a7', // 11155111 in hex
          networkName: 'Sepolia',
          rpcUrl: 'https://sepolia.example.com',
          currencySymbol: 'ETH'
        })

        expect(TOKEN_ADDRESSES[31337]).toEqual({
          USDC: '',
          USDT: ''
        })
      })
    })
  })
})
