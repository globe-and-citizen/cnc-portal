import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useBankWritesFunctions } from '../functions'
import { BANK_FUNCTION_NAMES } from '../types'
import type { Address } from 'viem'

// Hoisted mock variables
const { 
  mockUseBankWrites,
  mockUseValidation,
  mockAmountToWei,
  mockAddErrorToast
} = vi.hoisted(() => ({
  mockUseBankWrites: vi.fn(),
  mockUseValidation: vi.fn(),
  mockAmountToWei: vi.fn(),
  mockAddErrorToast: vi.fn()
}))

// Mock external dependencies
vi.mock('./writes', () => ({
  useBankWrites: mockUseBankWrites
}))

vi.mock('./utils', () => ({
  useValidation: mockUseValidation,
  amountToWei: mockAmountToWei
}))

vi.mock('@/stores', () => ({
  useToastStore: vi.fn(() => ({
    addErrorToast: mockAddErrorToast
  }))
}))

// Test constants
const MOCK_DATA = {
  validAddress: '0x1234567890123456789012345678901234567890' as Address,
  invalidAddress: 'invalid-address' as Address,
  validAmount: '1.5',
  invalidAmount: '0',
  tokenSymbol: 'USDC',
  emptySymbol: '',
  addresses: [
    '0x1234567890123456789012345678901234567890',
    '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdef'
  ] as Address[],
  amountInWei: BigInt('1500000000000000000')
} as const

const mockWrites = {
  executeWrite: vi.fn()
}

const mockValidation = {
  validateAmount: vi.fn(),
  validateAddress: vi.fn(),
  validateTipParams: vi.fn()
}

describe('useBankWritesFunctions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseBankWrites.mockReturnValue(mockWrites)
    mockUseValidation.mockReturnValue(mockValidation)
    mockAmountToWei.mockReturnValue(MOCK_DATA.amountInWei)
  })

  describe('Admin Functions', () => {
    describe('pauseContract', () => {
      it('should call executeWrite with PAUSE function', () => {
        const { pauseContract } = useBankWritesFunctions()
        
        pauseContract()

        expect(mockWrites.executeWrite).toHaveBeenCalledWith(BANK_FUNCTION_NAMES.PAUSE)
      })
    })

    describe('unpauseContract', () => {
      it('should call executeWrite with UNPAUSE function', () => {
        const { unpauseContract } = useBankWritesFunctions()
        
        unpauseContract()

        expect(mockWrites.executeWrite).toHaveBeenCalledWith(BANK_FUNCTION_NAMES.UNPAUSE)
      })
    })

    describe('changeTipsAddress', () => {
      it('should execute with valid address', () => {
        mockValidation.validateAddress.mockReturnValue(true)
        const { changeTipsAddress } = useBankWritesFunctions()
        
        const result = changeTipsAddress(MOCK_DATA.validAddress)

        expect(mockValidation.validateAddress).toHaveBeenCalledWith(MOCK_DATA.validAddress, 'tips address')
        expect(mockWrites.executeWrite).toHaveBeenCalledWith(
          BANK_FUNCTION_NAMES.CHANGE_TIPS_ADDRESS,
          [MOCK_DATA.validAddress]
        )
        expect(result).toBeDefined()
      })

      it('should not execute with invalid address', () => {
        mockValidation.validateAddress.mockReturnValue(false)
        const { changeTipsAddress } = useBankWritesFunctions()
        
        const result = changeTipsAddress(MOCK_DATA.invalidAddress)

        expect(mockValidation.validateAddress).toHaveBeenCalledWith(MOCK_DATA.invalidAddress, 'tips address')
        expect(mockWrites.executeWrite).not.toHaveBeenCalled()
        expect(result).toBeUndefined()
      })
    })

    describe('changeTokenAddress', () => {
      it('should execute with valid parameters', () => {
        mockValidation.validateAddress.mockReturnValue(true)
        const { changeTokenAddress } = useBankWritesFunctions()
        
        const result = changeTokenAddress(MOCK_DATA.tokenSymbol, MOCK_DATA.validAddress)

        expect(mockValidation.validateAddress).toHaveBeenCalledWith(MOCK_DATA.validAddress, 'token address')
        expect(mockWrites.executeWrite).toHaveBeenCalledWith(
          BANK_FUNCTION_NAMES.CHANGE_TOKEN_ADDRESS,
          [MOCK_DATA.tokenSymbol, MOCK_DATA.validAddress]
        )
        expect(result).toBeDefined()
      })

      it('should not execute with invalid address', () => {
        mockValidation.validateAddress.mockReturnValue(false)
        const { changeTokenAddress } = useBankWritesFunctions()
        
        const result = changeTokenAddress(MOCK_DATA.tokenSymbol, MOCK_DATA.invalidAddress)

        expect(mockWrites.executeWrite).not.toHaveBeenCalled()
        expect(result).toBeUndefined()
      })

      it('should not execute with empty symbol', () => {
        mockValidation.validateAddress.mockReturnValue(true)
        const { changeTokenAddress } = useBankWritesFunctions()
        
        const result = changeTokenAddress(MOCK_DATA.emptySymbol, MOCK_DATA.validAddress)

        expect(mockAddErrorToast).toHaveBeenCalledWith('Token symbol is required')
        expect(mockWrites.executeWrite).not.toHaveBeenCalled()
        expect(result).toBeUndefined()
      })
    })

    describe('transferOwnership', () => {
      it('should execute with valid address', () => {
        mockValidation.validateAddress.mockReturnValue(true)
        const { transferOwnership } = useBankWritesFunctions()
        
        const result = transferOwnership(MOCK_DATA.validAddress)

        expect(mockValidation.validateAddress).toHaveBeenCalledWith(MOCK_DATA.validAddress, 'new owner address')
        expect(mockWrites.executeWrite).toHaveBeenCalledWith(
          BANK_FUNCTION_NAMES.TRANSFER_OWNERSHIP,
          [MOCK_DATA.validAddress]
        )
        expect(result).toBeDefined()
      })

      it('should not execute with invalid address', () => {
        mockValidation.validateAddress.mockReturnValue(false)
        const { transferOwnership } = useBankWritesFunctions()
        
        const result = transferOwnership(MOCK_DATA.invalidAddress)

        expect(mockWrites.executeWrite).not.toHaveBeenCalled()
        expect(result).toBeUndefined()
      })
    })

    describe('renounceOwnership', () => {
      it('should call executeWrite with RENOUNCE_OWNERSHIP function', () => {
        const { renounceOwnership } = useBankWritesFunctions()
        
        renounceOwnership()

        expect(mockWrites.executeWrite).toHaveBeenCalledWith(BANK_FUNCTION_NAMES.RENOUNCE_OWNERSHIP)
      })
    })
  })

  describe('Transfer Functions', () => {
    describe('depositToken', () => {
      it('should execute with valid parameters', () => {
        mockValidation.validateAddress.mockReturnValue(true)
        mockValidation.validateAmount.mockReturnValue(true)
        const { depositToken } = useBankWritesFunctions()
        
        const result = depositToken(MOCK_DATA.validAddress, MOCK_DATA.validAmount)

        expect(mockValidation.validateAddress).toHaveBeenCalledWith(MOCK_DATA.validAddress, 'token address')
        expect(mockValidation.validateAmount).toHaveBeenCalledWith(MOCK_DATA.validAmount)
        expect(mockAmountToWei).toHaveBeenCalledWith(MOCK_DATA.validAmount)
        expect(mockWrites.executeWrite).toHaveBeenCalledWith(
          BANK_FUNCTION_NAMES.DEPOSIT_TOKEN,
          [MOCK_DATA.validAddress, MOCK_DATA.amountInWei]
        )
        expect(result).toBeDefined()
      })

      it('should not execute with invalid address', () => {
        mockValidation.validateAddress.mockReturnValue(false)
        mockValidation.validateAmount.mockReturnValue(true)
        const { depositToken } = useBankWritesFunctions()
        
        const result = depositToken(MOCK_DATA.invalidAddress, MOCK_DATA.validAmount)

        expect(mockWrites.executeWrite).not.toHaveBeenCalled()
        expect(result).toBeUndefined()
      })

      it('should not execute with invalid amount', () => {
        mockValidation.validateAddress.mockReturnValue(true)
        mockValidation.validateAmount.mockReturnValue(false)
        const { depositToken } = useBankWritesFunctions()
        
        const result = depositToken(MOCK_DATA.validAddress, MOCK_DATA.invalidAmount)

        expect(mockWrites.executeWrite).not.toHaveBeenCalled()
        expect(result).toBeUndefined()
      })
    })

    describe('transferEth', () => {
      it('should execute with valid parameters', () => {
        mockValidation.validateAddress.mockReturnValue(true)
        mockValidation.validateAmount.mockReturnValue(true)
        const { transferEth } = useBankWritesFunctions()
        
        const result = transferEth(MOCK_DATA.validAddress, MOCK_DATA.validAmount)

        expect(mockValidation.validateAddress).toHaveBeenCalledWith(MOCK_DATA.validAddress, 'recipient address')
        expect(mockValidation.validateAmount).toHaveBeenCalledWith(MOCK_DATA.validAmount)
        expect(mockAmountToWei).toHaveBeenCalledWith(MOCK_DATA.validAmount)
        expect(mockWrites.executeWrite).toHaveBeenCalledWith(
          BANK_FUNCTION_NAMES.TRANSFER,
          [MOCK_DATA.validAddress, MOCK_DATA.amountInWei],
          MOCK_DATA.amountInWei
        )
        expect(result).toBeDefined()
      })
    })

    describe('transferToken', () => {
      it('should execute with valid parameters', () => {
        mockValidation.validateAddress.mockReturnValue(true)
        mockValidation.validateAmount.mockReturnValue(true)
        const { transferToken } = useBankWritesFunctions()
        
        const tokenAddress = MOCK_DATA.validAddress
        const recipient = MOCK_DATA.addresses[1]
        
        const result = transferToken(tokenAddress, recipient, MOCK_DATA.validAmount)

        expect(mockValidation.validateAddress).toHaveBeenCalledWith(tokenAddress, 'token address')
        expect(mockValidation.validateAddress).toHaveBeenCalledWith(recipient, 'recipient address')
        expect(mockValidation.validateAmount).toHaveBeenCalledWith(MOCK_DATA.validAmount)
        expect(mockAmountToWei).toHaveBeenCalledWith(MOCK_DATA.validAmount)
        expect(mockWrites.executeWrite).toHaveBeenCalledWith(
          BANK_FUNCTION_NAMES.TRANSFER_TOKEN,
          [tokenAddress, recipient, MOCK_DATA.amountInWei]
        )
        expect(result).toBeDefined()
      })
    })
  })

  describe('Tipping Functions', () => {
    describe('sendEthTip', () => {
      it('should execute with valid parameters', () => {
        mockValidation.validateTipParams.mockReturnValue(true)
        const { sendEthTip } = useBankWritesFunctions()
        
        const result = sendEthTip(MOCK_DATA.addresses, MOCK_DATA.validAmount)

        expect(mockValidation.validateTipParams).toHaveBeenCalledWith(MOCK_DATA.addresses, MOCK_DATA.validAmount)
        expect(mockAmountToWei).toHaveBeenCalledWith(MOCK_DATA.validAmount)
        expect(mockWrites.executeWrite).toHaveBeenCalledWith(
          BANK_FUNCTION_NAMES.SEND_TIP,
          [MOCK_DATA.addresses, MOCK_DATA.amountInWei],
          MOCK_DATA.amountInWei
        )
        expect(result).toBeDefined()
      })

      it('should not execute with invalid tip parameters', () => {
        mockValidation.validateTipParams.mockReturnValue(false)
        const { sendEthTip } = useBankWritesFunctions()
        
        const result = sendEthTip(MOCK_DATA.addresses, MOCK_DATA.invalidAmount)

        expect(mockWrites.executeWrite).not.toHaveBeenCalled()
        expect(result).toBeUndefined()
      })
    })

    describe('sendTokenTip', () => {
      it('should execute with valid parameters', () => {
        mockValidation.validateTipParams.mockReturnValue(true)
        const { sendTokenTip } = useBankWritesFunctions()
        
        const result = sendTokenTip(MOCK_DATA.addresses, MOCK_DATA.validAddress, MOCK_DATA.validAmount)

        expect(mockValidation.validateTipParams).toHaveBeenCalledWith(
          MOCK_DATA.addresses, 
          MOCK_DATA.validAmount, 
          MOCK_DATA.validAddress
        )
        expect(mockAmountToWei).toHaveBeenCalledWith(MOCK_DATA.validAmount)
        expect(mockWrites.executeWrite).toHaveBeenCalledWith(
          BANK_FUNCTION_NAMES.SEND_TOKEN_TIP,
          [MOCK_DATA.addresses, MOCK_DATA.validAddress, MOCK_DATA.amountInWei]
        )
        expect(result).toBeDefined()
      })
    })

    describe('pushEthTip', () => {
      it('should execute with valid parameters', () => {
        mockValidation.validateTipParams.mockReturnValue(true)
        const { pushEthTip } = useBankWritesFunctions()
        
        const result = pushEthTip(MOCK_DATA.addresses, MOCK_DATA.validAmount)

        expect(mockValidation.validateTipParams).toHaveBeenCalledWith(MOCK_DATA.addresses, MOCK_DATA.validAmount)
        expect(mockAmountToWei).toHaveBeenCalledWith(MOCK_DATA.validAmount)
        expect(mockWrites.executeWrite).toHaveBeenCalledWith(
          BANK_FUNCTION_NAMES.PUSH_TIP,
          [MOCK_DATA.addresses, MOCK_DATA.amountInWei],
          MOCK_DATA.amountInWei
        )
        expect(result).toBeDefined()
      })
    })

    describe('pushTokenTip', () => {
      it('should execute with valid parameters', () => {
        mockValidation.validateTipParams.mockReturnValue(true)
        const { pushTokenTip } = useBankWritesFunctions()
        
        const result = pushTokenTip(MOCK_DATA.addresses, MOCK_DATA.validAddress, MOCK_DATA.validAmount)

        expect(mockValidation.validateTipParams).toHaveBeenCalledWith(
          MOCK_DATA.addresses, 
          MOCK_DATA.validAmount, 
          MOCK_DATA.validAddress
        )
        expect(mockAmountToWei).toHaveBeenCalledWith(MOCK_DATA.validAmount)
        expect(mockWrites.executeWrite).toHaveBeenCalledWith(
          BANK_FUNCTION_NAMES.PUSH_TOKEN_TIP,
          [MOCK_DATA.addresses, MOCK_DATA.validAddress, MOCK_DATA.amountInWei]
        )
        expect(result).toBeDefined()
      })
    })
  })

  describe('Return Interface', () => {
    it('should return all write state from useBankWrites', () => {
      mockWrites.isLoading = true
      mockWrites.error = null
      const bankFunctions = useBankWritesFunctions()

      expect(bankFunctions.isLoading).toBe(true)
      expect(bankFunctions.error).toBe(null)
    })

    it('should return all admin functions', () => {
      const bankFunctions = useBankWritesFunctions()

      expect(bankFunctions).toHaveProperty('pauseContract')
      expect(bankFunctions).toHaveProperty('unpauseContract')
      expect(bankFunctions).toHaveProperty('changeTipsAddress')
      expect(bankFunctions).toHaveProperty('changeTokenAddress')
      expect(bankFunctions).toHaveProperty('transferOwnership')
      expect(bankFunctions).toHaveProperty('renounceOwnership')

      expect(typeof bankFunctions.pauseContract).toBe('function')
      expect(typeof bankFunctions.unpauseContract).toBe('function')
      expect(typeof bankFunctions.changeTipsAddress).toBe('function')
      expect(typeof bankFunctions.changeTokenAddress).toBe('function')
      expect(typeof bankFunctions.transferOwnership).toBe('function')
      expect(typeof bankFunctions.renounceOwnership).toBe('function')
    })

    it('should return all transfer functions', () => {
      const bankFunctions = useBankWritesFunctions()

      expect(bankFunctions).toHaveProperty('depositToken')
      expect(bankFunctions).toHaveProperty('transferEth')
      expect(bankFunctions).toHaveProperty('transferToken')

      expect(typeof bankFunctions.depositToken).toBe('function')
      expect(typeof bankFunctions.transferEth).toBe('function')
      expect(typeof bankFunctions.transferToken).toBe('function')
    })

    it('should return all tipping functions', () => {
      const bankFunctions = useBankWritesFunctions()

      expect(bankFunctions).toHaveProperty('sendEthTip')
      expect(bankFunctions).toHaveProperty('sendTokenTip')
      expect(bankFunctions).toHaveProperty('pushEthTip')
      expect(bankFunctions).toHaveProperty('pushTokenTip')

      expect(typeof bankFunctions.sendEthTip).toBe('function')
      expect(typeof bankFunctions.sendTokenTip).toBe('function')
      expect(typeof bankFunctions.pushEthTip).toBe('function')
      expect(typeof bankFunctions.pushTokenTip).toBe('function')
    })
  })

  describe('Validation Integration', () => {
    it('should call validation functions before execution', () => {
      mockValidation.validateAddress.mockReturnValue(true)
      mockValidation.validateAmount.mockReturnValue(true)
      const { transferEth } = useBankWritesFunctions()
      
      transferEth(MOCK_DATA.validAddress, MOCK_DATA.validAmount)

      expect(mockValidation.validateAddress).toHaveBeenCalledBefore(mockWrites.executeWrite as any)
      expect(mockValidation.validateAmount).toHaveBeenCalledBefore(mockWrites.executeWrite as any)
    })

    it('should prevent execution when validation fails', () => {
      mockValidation.validateAddress.mockReturnValue(false)
      const { transferEth } = useBankWritesFunctions()
      
      transferEth(MOCK_DATA.invalidAddress, MOCK_DATA.validAmount)

      expect(mockWrites.executeWrite).not.toHaveBeenCalled()
    })
  })

  describe('Amount Conversion', () => {
    it('should convert amounts to wei for all functions that need it', () => {
      mockValidation.validateAddress.mockReturnValue(true)
      mockValidation.validateAmount.mockReturnValue(true)
      mockValidation.validateTipParams.mockReturnValue(true)
      
      const { transferEth, depositToken, sendEthTip } = useBankWritesFunctions()
      
      transferEth(MOCK_DATA.validAddress, MOCK_DATA.validAmount)
      depositToken(MOCK_DATA.validAddress, MOCK_DATA.validAmount)
      sendEthTip(MOCK_DATA.addresses, MOCK_DATA.validAmount)

      expect(mockAmountToWei).toHaveBeenCalledTimes(3)
      expect(mockAmountToWei).toHaveBeenCalledWith(MOCK_DATA.validAmount)
    })
  })
})
    it('should pause contract', async () => {
      const { pauseContract } = useBankAdmin()
      
      await pauseContract()
      
      expect(mockWriteContract).toHaveBeenCalledWith({
        address: MOCK_DATA.bankAddress,
        abi: expect.any(Array),
        functionName: 'pause',
        args: []
      })
    })

    it('should unpause contract', async () => {
      const { unpauseContract } = useBankAdmin()
      
      await unpauseContract()
      
      expect(mockWriteContract).toHaveBeenCalledWith({
        address: MOCK_DATA.bankAddress,
        abi: expect.any(Array),
        functionName: 'unpause',
        args: []
      })
    })

    it('should change tips address with valid address', async () => {
      const { changeTipsAddress } = useBankAdmin()
      
      await changeTipsAddress(MOCK_DATA.validAddress)
      
      expect(mockWriteContract).toHaveBeenCalledWith({
        address: MOCK_DATA.bankAddress,
        abi: expect.any(Array),
        functionName: 'changeTipsAddress',
        args: [MOCK_DATA.validAddress]
      })
    })

    it('should reject invalid tips address', async () => {
      const { changeTipsAddress } = useBankAdmin()
      
      await changeTipsAddress(MOCK_DATA.invalidAddress)
      
      expect(mockToastStore.addErrorToast).toHaveBeenCalledWith('Invalid tips address')
      expect(mockWriteContract).not.toHaveBeenCalled()
    })

    it('should change token address with valid parameters', async () => {
      const { changeTokenAddress } = useBankAdmin()
      
      await changeTokenAddress('USDT', MOCK_DATA.validAddress)
      
      expect(mockWriteContract).toHaveBeenCalledWith({
        address: MOCK_DATA.bankAddress,
        abi: expect.any(Array),
        functionName: 'changeTokenAddress',
        args: ['USDT', MOCK_DATA.validAddress]
      })
    })

    it('should reject empty token symbol', async () => {
      const { changeTokenAddress } = useBankAdmin()
      
      await changeTokenAddress('', MOCK_DATA.validAddress)
      
      expect(mockToastStore.addErrorToast).toHaveBeenCalledWith('Token symbol is required')
      expect(mockWriteContract).not.toHaveBeenCalled()
    })

    it('should transfer ownership to valid address', async () => {
      const { transferOwnership } = useBankAdmin()
      
      await transferOwnership(MOCK_DATA.validAddress)
      
      expect(mockWriteContract).toHaveBeenCalledWith({
        address: MOCK_DATA.bankAddress,
        abi: expect.any(Array),
        functionName: 'transferOwnership',
        args: [MOCK_DATA.validAddress]
      })
    })

    it('should reject invalid new owner address', async () => {
      const { transferOwnership } = useBankAdmin()
      
      await transferOwnership(MOCK_DATA.invalidAddress)
      
      expect(mockToastStore.addErrorToast).toHaveBeenCalledWith('Invalid new owner address')
      expect(mockWriteContract).not.toHaveBeenCalled()
    })
  })
})

describe('useBankTransfers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseWriteContract.mockReturnValue({
      data: undefined,
      writeContract: mockWriteContract,
      isPending: false,
      error: null
    })
  })

  describe('Transfer Functions', () => {
    it('should deposit token with valid parameters', async () => {
      const { depositToken } = useBankTransfers()
      
      await depositToken(MOCK_DATA.validAddress, MOCK_DATA.amount)
      
      expect(mockWriteContract).toHaveBeenCalledWith({
        address: MOCK_DATA.bankAddress,
        abi: expect.any(Array),
        functionName: 'depositToken',
        args: [MOCK_DATA.validAddress, expect.any(BigInt)]
      })
    })

    it('should transfer ETH with valid parameters', async () => {
      const { transferEth } = useBankTransfers()
      
      await transferEth(MOCK_DATA.validAddress, MOCK_DATA.amount)
      
      expect(mockWriteContract).toHaveBeenCalledWith({
        address: MOCK_DATA.bankAddress,
        abi: expect.any(Array),
        functionName: 'transfer',
        args: [MOCK_DATA.validAddress, expect.any(BigInt)],
        value: expect.any(BigInt)
      })
    })

    it('should transfer token with valid parameters', async () => {
      const { transferToken } = useBankTransfers()
      
      await transferToken(MOCK_DATA.validAddress, MOCK_DATA.validAddress, MOCK_DATA.amount)
      
      expect(mockWriteContract).toHaveBeenCalledWith({
        address: MOCK_DATA.bankAddress,
        abi: expect.any(Array),
        functionName: 'transferToken',
        args: [MOCK_DATA.validAddress, MOCK_DATA.validAddress, expect.any(BigInt)]
      })
    })

    it('should reject invalid recipient address', async () => {
      const { transferEth } = useBankTransfers()
      
      await transferEth(MOCK_DATA.invalidAddress, MOCK_DATA.amount)
      
      expect(mockToastStore.addErrorToast).toHaveBeenCalledWith('Invalid recipient address')
      expect(mockWriteContract).not.toHaveBeenCalled()
    })

    it('should reject invalid amount', async () => {
      const { transferEth } = useBankTransfers()
      
      await transferEth(MOCK_DATA.validAddress, '0')
      
      expect(mockToastStore.addErrorToast).toHaveBeenCalledWith('Invalid amount')
      expect(mockWriteContract).not.toHaveBeenCalled()
    })

    it('should reject invalid token address for token transfers', async () => {
      const { transferToken } = useBankTransfers()
      
      await transferToken(MOCK_DATA.validAddress, MOCK_DATA.invalidAddress, MOCK_DATA.amount)
      
      expect(mockToastStore.addErrorToast).toHaveBeenCalledWith('Invalid token address')
      expect(mockWriteContract).not.toHaveBeenCalled()
    })
  })
})

describe('useBankTipping', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseWriteContract.mockReturnValue({
      data: undefined,
      writeContract: mockWriteContract,
      isPending: false,
      error: null
    })
  })

  describe('Tipping Functions', () => {
    it('should send ETH tip with valid parameters', async () => {
      const { sendEthTip } = useBankTipping()
      const addresses = [MOCK_DATA.validAddress]
      
      await sendEthTip(addresses, MOCK_DATA.amount)
      
      expect(mockWriteContract).toHaveBeenCalledWith({
        address: MOCK_DATA.bankAddress,
        abi: expect.any(Array),
        functionName: 'sendTip',
        args: [addresses, expect.any(BigInt)],
        value: expect.any(BigInt)
      })
    })

    it('should send token tip with valid parameters', async () => {
      const { sendTokenTip } = useBankTipping()
      const addresses = [MOCK_DATA.validAddress]
      
      await sendTokenTip(addresses, MOCK_DATA.validAddress, MOCK_DATA.amount)
      
      expect(mockWriteContract).toHaveBeenCalledWith({
        address: MOCK_DATA.bankAddress,
        abi: expect.any(Array),
        functionName: 'sendTokenTip',
        args: [addresses, MOCK_DATA.validAddress, expect.any(BigInt)]
      })
    })

    it('should reject empty recipient list', async () => {
      const { sendEthTip } = useBankTipping()
      
      await sendEthTip([], MOCK_DATA.amount)
      
      expect(mockToastStore.addErrorToast).toHaveBeenCalledWith('No recipients specified')
      expect(mockWriteContract).not.toHaveBeenCalled()
    })

    it('should reject invalid addresses in recipient list', async () => {
      const { sendEthTip } = useBankTipping()
      const addresses = [MOCK_DATA.validAddress, MOCK_DATA.invalidAddress]
      
      await sendEthTip(addresses, MOCK_DATA.amount)
      
      expect(mockToastStore.addErrorToast).toHaveBeenCalledWith('One or more invalid addresses')
      expect(mockWriteContract).not.toHaveBeenCalled()
    })

    it('should reject invalid token address for token tips', async () => {
      const { sendTokenTip } = useBankTipping()
      const addresses = [MOCK_DATA.validAddress]
      
      await sendTokenTip(addresses, MOCK_DATA.invalidAddress, MOCK_DATA.amount)
      
      expect(mockToastStore.addErrorToast).toHaveBeenCalledWith('Invalid token address')
      expect(mockWriteContract).not.toHaveBeenCalled()
    })

    it('should reject invalid tip amount', async () => {
      const { sendEthTip } = useBankTipping()
      const addresses = [MOCK_DATA.validAddress]
      
      await sendEthTip(addresses, '0')
      
      expect(mockToastStore.addErrorToast).toHaveBeenCalledWith('Invalid amount')
      expect(mockWriteContract).not.toHaveBeenCalled()
    })
  })
})

*/
