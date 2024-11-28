import { describe, it, expect, beforeEach, vi } from 'vitest'
import { validateAddresses, resolveAddress } from '../index'
import * as networkModule from '../network'

// Mock the imported JSON files
vi.mock('@/artifacts/deployed_addresses/chain-11155111.json', () => ({
  default: {
    'TipsModule#Tips': '0x1234',
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
    'InvestorsV1BeaconModule#InvestorV1': '0xf678'
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
        chainId: '0xaa36a7',
        networkName: 'Sepolia',
        rpcUrl: 'https://sepolia.example.com',
        currencySymbol: 'ETH'
      })

      const address = resolveAddress('TipsModule#Tips')
      expect(address).toBe('0x1234')
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
  })
})
