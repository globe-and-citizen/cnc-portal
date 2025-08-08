import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MetaMaskUtil } from '../web3Util'

// Mock the NETWORK constant
vi.mock('@/constant', () => ({
  NETWORK: {
    chainId: '0x89',
    networkName: 'Polygon Mainnet',
    rpcUrl: 'https://polygon-rpc.com',
    currencySymbol: 'MATIC',
    blockExplorerUrl: 'https://polygonscan.com'
  }
}))

describe('web3Util', () => {
  describe('MetaMaskUtil', () => {
    let mockEthereum: any

    beforeEach(() => {
      mockEthereum = {
        request: vi.fn(),
        on: vi.fn()
      }

      // Mock window.ethereum
      Object.defineProperty(window, 'ethereum', {
        value: mockEthereum,
        writable: true,
        configurable: true
      })
    })

    afterEach(() => {
      // Clean up
      delete (window as any).ethereum
    })

    describe('constructor', () => {
      it('should initialize with ethereum provider when available', () => {
        const metaMask = new MetaMaskUtil()
        
        expect(metaMask.getProvider()).toBe(mockEthereum)
        expect(metaMask.getNetwork()).toEqual({
          chainId: '0x89',
          networkName: 'Polygon Mainnet',
          rpcUrl: 'https://polygon-rpc.com',
          currencySymbol: 'MATIC',
          blockExplorerUrl: 'https://polygonscan.com'
        })
      })

      it('should throw error when MetaMask is not installed', () => {
        delete (window as any).ethereum
        
        expect(() => new MetaMaskUtil()).toThrow('MetaMask Not Installed')
      })
    })

    describe('hasInstalledWallet', () => {
      it('should return true when ethereum is available', () => {
        expect(MetaMaskUtil.hasInstalledWallet()).toBe(true)
      })

      it('should return false when ethereum is not available', () => {
        delete (window as any).ethereum
        
        expect(MetaMaskUtil.hasInstalledWallet()).toBe(false)
      })
    })

    describe('switchNetwork', () => {
      it('should switch to the configured network successfully', async () => {
        mockEthereum.request.mockResolvedValueOnce(undefined)
        
        const metaMask = new MetaMaskUtil()
        await metaMask.switchNetwork()
        
        expect(mockEthereum.request).toHaveBeenCalledWith({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x89' }]
        })
      })

      it('should add network when switch fails with code 4902', async () => {
        const switchError = { code: 4902 }
        mockEthereum.request
          .mockRejectedValueOnce(switchError)
          .mockResolvedValueOnce(undefined)
        
        const metaMask = new MetaMaskUtil()
        await metaMask.switchNetwork()
        
        expect(mockEthereum.request).toHaveBeenCalledTimes(2)
        expect(mockEthereum.request).toHaveBeenNthCalledWith(1, {
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x89' }]
        })
        expect(mockEthereum.request).toHaveBeenNthCalledWith(2, {
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: '0x89',
              chainName: 'Polygon Mainnet',
              rpcUrls: ['https://polygon-rpc.com'],
              nativeCurrency: {
                symbol: 'MATIC',
                decimals: 18
              },
              blockExplorerUrls: ['https://polygonscan.com']
            }
          ]
        })
      })

      it('should handle network without block explorer URL', async () => {
        // Mock NETWORK without blockExplorerUrl
        vi.doMock('@/constant', () => ({
          NETWORK: {
            chainId: '0x89',
            networkName: 'Polygon Mainnet',
            rpcUrl: 'https://polygon-rpc.com',
            currencySymbol: 'MATIC',
            blockExplorerUrl: null
          }
        }))

        const switchError = { code: 4902 }
        mockEthereum.request
          .mockRejectedValueOnce(switchError)
          .mockResolvedValueOnce(undefined)
        
        const metaMask = new MetaMaskUtil()
        await metaMask.switchNetwork()
        
        expect(mockEthereum.request).toHaveBeenNthCalledWith(2, {
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: '0x89',
              chainName: 'Polygon Mainnet',
              rpcUrls: ['https://polygon-rpc.com'],
              nativeCurrency: {
                symbol: 'MATIC',
                decimals: 18
              },
              blockExplorerUrls: null
            }
          ]
        })
      })

      it('should re-throw error when error code is not 4902', async () => {
        const otherError = { code: 4001, message: 'User rejected request' }
        mockEthereum.request.mockRejectedValueOnce(otherError)
        
        const metaMask = new MetaMaskUtil()
        
        await expect(metaMask.switchNetwork()).rejects.toEqual(otherError)
        expect(mockEthereum.request).toHaveBeenCalledTimes(1)
      })

      it('should handle unknown error format', async () => {
        const unknownError = 'Unknown error'
        mockEthereum.request.mockRejectedValueOnce(unknownError)
        
        const metaMask = new MetaMaskUtil()
        
        await expect(metaMask.switchNetwork()).rejects.toBe(unknownError)
      })

      it('should handle error when adding network fails', async () => {
        const switchError = { code: 4902 }
        const addError = new Error('Failed to add network')
        mockEthereum.request
          .mockRejectedValueOnce(switchError)
          .mockRejectedValueOnce(addError)
        
        const metaMask = new MetaMaskUtil()
        
        await expect(metaMask.switchNetwork()).rejects.toThrow('Failed to add network')
      })
    })

    describe('getProvider', () => {
      it('should return the ethereum provider', () => {
        const metaMask = new MetaMaskUtil()
        
        expect(metaMask.getProvider()).toBe(mockEthereum)
      })
    })

    describe('getNetwork', () => {
      it('should return the configured network', () => {
        const metaMask = new MetaMaskUtil()
        
        expect(metaMask.getNetwork()).toEqual({
          chainId: '0x89',
          networkName: 'Polygon Mainnet',
          rpcUrl: 'https://polygon-rpc.com',
          currencySymbol: 'MATIC',
          blockExplorerUrl: 'https://polygonscan.com'
        })
      })
    })
  })
})