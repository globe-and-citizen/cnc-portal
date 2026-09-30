import { describe, expect, it } from 'vitest'
import type { Abi } from 'viem'
import versionRegistry from '@/artifacts/version-registry.json'
import type { FolderVersion } from '@/artifacts/registry'
import type { ContractType } from '@/types'
import {
  bankAbi as bankV0Abi,
  boardOfDirectorsAbi as boardV0Abi,
  cashRemunerationEip712Abi as cashV0Abi,
  electionsAbi as electionsV0Abi,
  expenseAccountEip712Abi as expenseV0Abi,
  investorAbi as investorV0Abi,
  proposalsAbi as proposalsV0Abi,
  safeDepositRouterAbi as routerV0Abi,
  vestingAbi as vestingV0Abi
} from '@/artifacts/abi/V0/generated'
import {
  bankAbi as bankV01Abi,
  boardOfDirectorsAbi as boardV01Abi,
  cashRemunerationEip712Abi as cashV01Abi,
  electionsAbi as electionsV01Abi,
  expenseAccountEip712Abi as expenseV01Abi,
  investorAbi as investorV01Abi,
  proposalsAbi as proposalsV01Abi,
  safeDepositRouterAbi as routerV01Abi,
  vestingAbi as vestingV01Abi
} from '@/artifacts/abi/V0.1/generated'
import {
  bankAbi as bankV1Abi,
  boardOfDirectorsAbi as boardV1Abi,
  cashRemunerationEip712Abi as cashV1Abi,
  electionsAbi as electionsV1Abi,
  expenseAccountEip712Abi as expenseV1Abi,
  investorAbi as investorV1Abi,
  proposalsAbi as proposalsV1Abi,
  safeDepositRouterAbi as routerV1Abi,
  vestingAbi as vestingV1Abi
} from '@/artifacts/abi/V1/generated'
import {
  bankAbi as bankV2Abi,
  boardOfDirectorsAbi as boardV2Abi,
  cashRemunerationEip712Abi as cashV2Abi,
  electionsAbi as electionsV2Abi,
  expenseAccountEip712Abi as expenseV2Abi,
  fixedReturnAbi,
  investorAbi as investorV2Abi,
  proposalsAbi as proposalsV2Abi,
  safeDepositRouterAbi as routerV2Abi,
  vestingAbi as vestingV2Abi
} from '@/artifacts/abi/V2/generated'
import {
  getContractPauseCapability,
  getContractPauseStatusPresentation,
  PAUSE_CAPABILITY_REGISTRY,
  pauseCapabilityFolderForVersion
} from '../pauseCapabilities'

type AbiByType = Partial<Record<ContractType, Abi>>

const abiByFolder: Record<FolderVersion, AbiByType> = {
  V0: {
    Bank: bankV0Abi,
    BoardOfDirectors: boardV0Abi,
    Proposals: proposalsV0Abi,
    Elections: electionsV0Abi,
    InvestorV1: investorV0Abi,
    ExpenseAccountEIP712: expenseV0Abi,
    CashRemunerationEIP712: cashV0Abi,
    SafeDepositRouter: routerV0Abi,
    Vesting: vestingV0Abi
  },
  'V0.1': {
    Bank: bankV01Abi,
    BoardOfDirectors: boardV01Abi,
    Proposals: proposalsV01Abi,
    Elections: electionsV01Abi,
    InvestorV1: investorV01Abi,
    ExpenseAccountEIP712: expenseV01Abi,
    CashRemunerationEIP712: cashV01Abi,
    SafeDepositRouter: routerV01Abi,
    Vesting: vestingV01Abi
  },
  V1: {
    Bank: bankV1Abi,
    BoardOfDirectors: boardV1Abi,
    Proposals: proposalsV1Abi,
    Elections: electionsV1Abi,
    InvestorV1: investorV1Abi,
    ExpenseAccountEIP712: expenseV1Abi,
    CashRemunerationEIP712: cashV1Abi,
    SafeDepositRouter: routerV1Abi,
    Vesting: vestingV1Abi
  },
  V2: {
    Bank: bankV2Abi,
    BoardOfDirectors: boardV2Abi,
    Proposals: proposalsV2Abi,
    Elections: electionsV2Abi,
    Investor: investorV2Abi,
    InvestorV1: investorV2Abi,
    ExpenseAccountEIP712: expenseV2Abi,
    CashRemunerationEIP712: cashV2Abi,
    SafeDepositRouter: routerV2Abi,
    Vesting: vestingV2Abi,
    FixedReturn: fixedReturnAbi
  }
}

describe('contract pause capability registry', () => {
  it('covers every contract beacon recorded for each Officer generation', () => {
    for (const [folder, configuration] of Object.entries(versionRegistry.folders)) {
      const capabilities = PAUSE_CAPABILITY_REGISTRY[folder as FolderVersion]
      const deployableTypes = Object.keys(configuration.beacons).filter(
        (contractType) => contractType !== 'Officer'
      )

      for (const contractType of deployableTypes) {
        expect(
          capabilities[contractType as ContractType],
          `${folder}:${contractType}`
        ).toBeDefined()
      }
    }
  })

  it('declares pause selectors that exist in every matching generated ABI', () => {
    for (const [folder, capabilities] of Object.entries(PAUSE_CAPABILITY_REGISTRY)) {
      for (const [contractType, capability] of Object.entries(capabilities)) {
        if (!capability.selectors) continue

        const abi = abiByFolder[folder as FolderVersion][contractType as ContractType]
        const functionNames = new Set(
          abi
            ?.filter((item) => item.type === 'function')
            .map((item) => ('name' in item ? item.name : undefined))
        )

        expect(abi, `${folder}:${contractType}`).toBeDefined()
        expect(functionNames.has(capability.selectors.status)).toBe(true)
        expect(functionNames.has(capability.selectors.pause)).toBe(true)
        expect(functionNames.has(capability.selectors.resume)).toBe(true)
      }
    }
  })

  it('[AC-US-CONTRACT-001-05] resolves supported, unsupported, and unavailable capability evidence', () => {
    expect(pauseCapabilityFolderForVersion('0.1.12')).toBe('V0.1')
    expect(pauseCapabilityFolderForVersion('2.0.1')).toBe('V2')
    expect(pauseCapabilityFolderForVersion('unknown')).toBeUndefined()

    expect(getContractPauseCapability('Bank', '2.0.1')?.support).toBe('operations')
    expect(getContractPauseCapability('Proposals', '2.0.1')?.support).toBe('none')
    expect(getContractPauseCapability('Safe', null)?.support).toBe('none')
    expect(getContractPauseCapability('UnknownContract', '2.0.1')).toBeUndefined()
    expect(getContractPauseCapability('Bank', 'unknown')).toBeUndefined()

    expect(getContractPauseStatusPresentation('not-supported').label).toBe('Not supported')
    expect(getContractPauseStatusPresentation('unavailable').label).toBe('Unavailable')
  })
})
