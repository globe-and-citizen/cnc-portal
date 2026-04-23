import { describe, it, expect } from 'vitest'
import { CONTRACT_ERRORS, resolveRevertMessage } from '../errorCatalogs'
import type { ContractKey } from '../errorCatalogs.types'

describe('resolveRevertMessage', () => {
  describe('resolution order', () => {
    it('prefers perContract override over common entry', () => {
      expect(resolveRevertMessage('InsufficientBalance', [100n, 200n], 'Bank')).toBe(
        'Insufficient balance — needs 100, only 200 available'
      )
    })

    it('falls back to common entry when no perContract override exists', () => {
      expect(resolveRevertMessage('OwnableUnauthorizedAccount', undefined, 'Bank')).toBe(
        'Only the contract owner can perform this action'
      )
    })

    it('uses fallbacks[contract] when revert name is unknown but contract is known', () => {
      expect(resolveRevertMessage('MysteryError', undefined, 'CashRemuneration')).toBe(
        'Withdraw failed'
      )
    })

    it('uses fallbacks.default when both revert name and contract are unknown', () => {
      expect(resolveRevertMessage('MysteryError')).toBe('Transaction failed')
      expect(resolveRevertMessage('MysteryError', undefined, undefined)).toBe('Transaction failed')
    })

    it('uses fallbacks.default when contract has no dedicated fallback', () => {
      expect(resolveRevertMessage('MysteryError', undefined, 'TokenSupport')).toBe(
        'Token support update failed'
      )
    })
  })

  describe('common resolvers with arguments', () => {
    it('formats InsufficientBalance with OZ (balance, needed) shape', () => {
      expect(resolveRevertMessage('InsufficientBalance', [50n, 80n])).toBe(
        'Contract has insufficient native balance — needs 80, only 50 available'
      )
    })

    it('handles TokenSupportAlreadyAdded with no args', () => {
      expect(resolveRevertMessage('TokenSupportAlreadyAdded')).toBe('Token  is already supported')
    })

    it('handles TokenSupportNotFound with token arg', () => {
      expect(resolveRevertMessage('TokenSupportNotFound', ['0xTOKEN'])).toBe(
        'Token 0xTOKEN is not supported'
      )
    })
  })

  describe('per-contract resolvers', () => {
    it('formats CashRemuneration.InsufficientTokenBalance (token-first shape)', () => {
      expect(
        resolveRevertMessage('InsufficientTokenBalance', ['0xTOKEN', 100n, 50n], 'CashRemuneration')
      ).toBe('Insufficient token balance — needs 100, only 50 available')
    })

    it('formats ExpenseAccount.InsufficientNativeBalance', () => {
      expect(resolveRevertMessage('InsufficientNativeBalance', [10n, 5n], 'ExpenseAccount')).toBe(
        'Insufficient native balance — needs 10, only 5'
      )
    })

    it('formats SafeDepositRouter.SlippageExceeded with expected/actual', () => {
      expect(resolveRevertMessage('SlippageExceeded', [1000n, 900n], 'SafeDepositRouter')).toBe(
        'Price moved too much — expected 1000, got 900'
      )
    })

    it('returns Bank.InsufficientBalance using required/available shape', () => {
      expect(resolveRevertMessage('InsufficientBalance', [1n, 2n], 'Bank')).toBe(
        'Insufficient balance — needs 1, only 2 available'
      )
    })

    it('formats Vesting.InsufficientAllowance', () => {
      expect(resolveRevertMessage('InsufficientAllowance', [100n, 10n], 'Vesting')).toBe(
        'Not enough token allowance — needs 100, only 10'
      )
    })

    it('formats Vesting.InsufficientBalance (required/actual)', () => {
      expect(resolveRevertMessage('InsufficientBalance', [5n, 3n], 'Vesting')).toBe(
        'Insufficient token balance — needs 5, only 3'
      )
    })

    it('formats InvestorV1.InvalidNativeFunding', () => {
      expect(resolveRevertMessage('InvalidNativeFunding', [1000n, 999n], 'InvestorV1')).toBe(
        'Invalid native funding — expected 1000, got 999'
      )
    })

    it('formats InvestorV1.InsufficientFundedTokenBalance', () => {
      expect(
        resolveRevertMessage('InsufficientFundedTokenBalance', ['0xT', 50n, 10n], 'InvestorV1')
      ).toBe('Insufficient funded token balance — needs 50, only 10')
    })

    it('formats Tips.TooManyTeamMembers', () => {
      expect(resolveRevertMessage('TooManyTeamMembers', [30, 20], 'Tips')).toBe(
        'Too many team members — provided 30, limit is 20'
      )
    })

    it('formats Tips.LimitTooHigh', () => {
      expect(resolveRevertMessage('LimitTooHigh', [100, 50], 'Tips')).toBe(
        'Push limit 100 exceeds the maximum of 50'
      )
    })

    it('formats Tips.InsufficientBalance (contract-balance shape)', () => {
      expect(resolveRevertMessage('InsufficientBalance', [5n, 1n], 'Tips')).toBe(
        'Insufficient contract balance — needs 5, only 1'
      )
    })

    it('formats AdCampaignManager.InsufficientContractBalance', () => {
      expect(
        resolveRevertMessage('InsufficientContractBalance', [100n, 50n], 'AdCampaignManager')
      ).toBe('Insufficient contract balance — needs 100, only 50')
    })

    it('formats FeeCollector.InsufficientBalance (required/available)', () => {
      expect(resolveRevertMessage('InsufficientBalance', [10n, 1n], 'FeeCollector')).toBe(
        'Insufficient balance — needs 10, only 1 available'
      )
    })

    it('formats FeeCollector.InsufficientTokenBalance (no-token shape)', () => {
      expect(resolveRevertMessage('InsufficientTokenBalance', [100n, 20n], 'FeeCollector')).toBe(
        'Insufficient token balance — needs 100, only 20 available'
      )
    })

    it('formats Officer.BeaconNotConfigured with contract type', () => {
      expect(resolveRevertMessage('BeaconNotConfigured', ['Bank'], 'Officer')).toBe(
        'Beacon not configured for Bank'
      )
    })

    it('falls back to generic label when Officer.BeaconNotConfigured has no args', () => {
      expect(resolveRevertMessage('BeaconNotConfigured', [], 'Officer')).toBe(
        'Beacon not configured for this contract type'
      )
    })

    it('formats Officer.MissingInitializerData with contract type', () => {
      expect(resolveRevertMessage('MissingInitializerData', ['Investor'], 'Officer')).toBe(
        'Missing initializer data for Investor'
      )
    })

    it('falls back to generic label when Officer.MissingInitializerData has no args', () => {
      expect(resolveRevertMessage('MissingInitializerData', undefined, 'Officer')).toBe(
        'Missing initializer data for contract'
      )
    })
  })

  describe('static per-contract messages', () => {
    it('returns the expected message for Elections.AlreadyVoted', () => {
      expect(resolveRevertMessage('AlreadyVoted', undefined, 'Elections')).toBe(
        'You have already voted in this election'
      )
    })

    it('returns the expected message for Proposals.ProposalNotFound', () => {
      expect(resolveRevertMessage('ProposalNotFound', undefined, 'Proposals')).toBe(
        'Proposal not found'
      )
    })

    it('returns the expected message for BoardOfDirectors.NotOwner', () => {
      expect(resolveRevertMessage('NotOwner', undefined, 'BoardOfDirectors')).toBe(
        'Only an owner can call this function'
      )
    })

    it('returns the expected message for Voting.VoterAlreadyVoted', () => {
      expect(resolveRevertMessage('VoterAlreadyVoted', undefined, 'Voting')).toBe(
        'You have already voted'
      )
    })
  })

  describe('fallbacks coverage', () => {
    const contractFallbacks: Array<[ContractKey, string]> = [
      ['CashRemuneration', 'Withdraw failed'],
      ['ExpenseAccount', 'Transfer failed'],
      ['SafeDepositRouter', 'Deposit failed'],
      ['Bank', 'Bank action failed'],
      ['AdCampaignManager', 'Ad campaign action failed'],
      ['Vesting', 'Vesting action failed'],
      ['InvestorV1', 'Investor action failed'],
      ['Tips', 'Tips action failed'],
      ['FeeCollector', 'Fee collector action failed'],
      ['TokenSupport', 'Token support update failed'],
      ['Elections', 'Election action failed'],
      ['Proposals', 'Proposal action failed'],
      ['Voting', 'Voting action failed'],
      ['BoardOfDirectors', 'Board of directors action failed'],
      ['Officer', 'Officer action failed']
    ]

    it.each(contractFallbacks)(
      'returns fallbacks[%s] for unknown revert names',
      (contract, expected) => {
        expect(resolveRevertMessage('__NotMapped__', undefined, contract)).toBe(expected)
      }
    )
  })

  describe('resolvers with missing arguments', () => {
    // Exercises the `args ?? []` fallback branch in every resolver.
    const cases: Array<{ name: string; contract?: ContractKey; expected: string }> = [
      {
        name: 'InsufficientBalance',
        expected:
          'Contract has insufficient native balance — needs undefined, only undefined available'
      },
      {
        name: 'TokenSupportAlreadyAdded',
        expected: 'Token  is already supported'
      },
      {
        name: 'TokenSupportNotFound',
        expected: 'Token  is not supported'
      },
      {
        name: 'InsufficientTokenBalance',
        contract: 'CashRemuneration',
        expected: 'Insufficient token balance — needs undefined, only undefined available'
      },
      {
        name: 'InsufficientNativeBalance',
        contract: 'ExpenseAccount',
        expected: 'Insufficient native balance — needs undefined, only undefined'
      },
      {
        name: 'SlippageExceeded',
        contract: 'SafeDepositRouter',
        expected: 'Price moved too much — expected undefined, got undefined'
      },
      {
        name: 'InsufficientBalance',
        contract: 'Bank',
        expected: 'Insufficient balance — needs undefined, only undefined available'
      },
      {
        name: 'InsufficientContractBalance',
        contract: 'AdCampaignManager',
        expected: 'Insufficient contract balance — needs undefined, only undefined'
      },
      {
        name: 'InsufficientAllowance',
        contract: 'Vesting',
        expected: 'Not enough token allowance — needs undefined, only undefined'
      },
      {
        name: 'InsufficientBalance',
        contract: 'Vesting',
        expected: 'Insufficient token balance — needs undefined, only undefined'
      },
      {
        name: 'InvalidNativeFunding',
        contract: 'InvestorV1',
        expected: 'Invalid native funding — expected undefined, got undefined'
      },
      {
        name: 'InsufficientFundedTokenBalance',
        contract: 'InvestorV1',
        expected: 'Insufficient funded token balance — needs undefined, only undefined'
      },
      {
        name: 'TooManyTeamMembers',
        contract: 'Tips',
        expected: 'Too many team members — provided undefined, limit is undefined'
      },
      {
        name: 'LimitTooHigh',
        contract: 'Tips',
        expected: 'Push limit undefined exceeds the maximum of undefined'
      },
      {
        name: 'InsufficientBalance',
        contract: 'Tips',
        expected: 'Insufficient contract balance — needs undefined, only undefined'
      },
      {
        name: 'InsufficientBalance',
        contract: 'FeeCollector',
        expected: 'Insufficient balance — needs undefined, only undefined available'
      },
      {
        name: 'InsufficientTokenBalance',
        contract: 'FeeCollector',
        expected: 'Insufficient token balance — needs undefined, only undefined available'
      },
      {
        name: 'BeaconNotConfigured',
        contract: 'Officer',
        expected: 'Beacon not configured for this contract type'
      },
      {
        name: 'MissingInitializerData',
        contract: 'Officer',
        expected: 'Missing initializer data for contract'
      }
    ]

    it.each(cases)(
      'returns the fallback shape for $name (contract=$contract) with undefined args',
      ({ name, contract, expected }) => {
        expect(resolveRevertMessage(name, undefined, contract)).toBe(expected)
      }
    )
  })

  describe('catalog shape sanity', () => {
    it('exposes a default fallback', () => {
      expect(CONTRACT_ERRORS.fallbacks.default).toBe('Transaction failed')
    })

    it('includes a common ZeroAddress entry', () => {
      expect(CONTRACT_ERRORS.common.ZeroAddress).toBe('A required address is not set')
    })
  })
})
