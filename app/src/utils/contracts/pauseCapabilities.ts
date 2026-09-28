import registryJson from '@/artifacts/version-registry.json'
import type { FolderVersion } from '@/artifacts/registry'
import type { ContractType } from '@/types'

export type ContractPauseSupport = 'none' | 'operations' | 'full-writes'
export type ContractPauseStatus = 'active' | 'paused' | 'not-supported' | 'unavailable'

export interface ContractPauseCapability {
  support: ContractPauseSupport
  scope: string
  selectors?: {
    status: 'paused'
    pause: 'pause'
    resume: 'unpause'
  }
}

type PauseCapabilityByType = Partial<Record<ContractType, ContractPauseCapability>>

const pauseSelectors = {
  status: 'paused',
  pause: 'pause',
  resume: 'unpause'
} as const

const supportsOperations = (scope: string): ContractPauseCapability => ({
  support: 'operations',
  scope,
  selectors: pauseSelectors
})

const doesNotSupportPause = (scope: string): ContractPauseCapability => ({
  support: 'none',
  scope
})

const commonGenerationCapabilities = {
  Bank: supportsOperations('Deposits, transfers, dividends, and repayment operations.'),
  BoardOfDirectors: doesNotSupportPause(
    'Board governance remains available for approvals and recovery.'
  ),
  Proposals: doesNotSupportPause(
    'This generation exposes pause state without usable pause controls or protected proposal operations.'
  ),
  Elections: supportsOperations('Election creation, voting, and result publication.'),
  ExpenseAccountEIP712: supportsOperations(
    'Deposits and treasury withdrawal only; signed expense transfers remain available in this version.'
  ),
  CashRemunerationEIP712: supportsOperations(
    'Wage claims and guarded value or configuration operations.'
  ),
  SafeDepositRouter: supportsOperations(
    'Investment deposits; owner recovery and configuration remain available.'
  ),
  Vesting: supportsOperations('Schedule creation, release, and stop operations.')
} satisfies PauseCapabilityByType

const legacyGenerationCapabilities = {
  ...commonGenerationCapabilities,
  InvestorV1: supportsOperations('Share issuance, transfers, claims, and dividend distribution.')
} satisfies PauseCapabilityByType

/**
 * Product policy for each recorded Officer generation. ABI presence alone is not
 * sufficient: Proposals deliberately remains unsupported because its inherited
 * pause state has no usable controls or protected workflow.
 */
export const PAUSE_CAPABILITY_REGISTRY = {
  V0: legacyGenerationCapabilities,
  'V0.1': legacyGenerationCapabilities,
  V1: legacyGenerationCapabilities,
  V2: {
    ...commonGenerationCapabilities,
    Investor: supportsOperations('Share issuance, transfers, claims, and dividend distribution.'),
    // Retained for records created before the current Investor type was normalized.
    InvestorV1: supportsOperations('Share issuance, transfers, claims, and dividend distribution.'),
    FixedReturn: doesNotSupportPause('This generation has no generic pause lifecycle.')
  }
} satisfies Record<FolderVersion, PauseCapabilityByType>

const generationIndependentCapabilities: PauseCapabilityByType = {
  Safe: doesNotSupportPause('Safe multisig operations are managed through the Safe journey.')
}

type Semver = readonly [major: number, minor: number, patch: number]

function parseSemver(value?: string | null): Semver | null {
  const match = value?.match(/^(\d+)\.(\d+)\.(\d+)$/)
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null
}

function compareSemver(left: Semver, right: Semver): number {
  for (let index = 0; index < left.length; index += 1) {
    const difference = left[index]! - right[index]!
    if (difference !== 0) return difference
  }
  return 0
}

export function pauseCapabilityFolderForVersion(
  officerVersion?: string | null
): FolderVersion | undefined {
  const version = parseSemver(officerVersion)
  if (!version) return undefined

  return (
    Object.entries(registryJson.folders) as Array<
      [FolderVersion, { onchainVersionMin: string; onchainVersionMax: string }]
    >
  ).find(([, configuration]) => {
    const minimum = parseSemver(configuration.onchainVersionMin)
    const maximum = parseSemver(configuration.onchainVersionMax)
    return (
      minimum !== null &&
      maximum !== null &&
      compareSemver(version, minimum) >= 0 &&
      compareSemver(version, maximum) <= 0
    )
  })?.[0]
}

export function getContractPauseCapability(
  contractType: string,
  officerVersion?: string | null
): ContractPauseCapability | undefined {
  const independentCapability = generationIndependentCapabilities[contractType as ContractType]
  if (independentCapability) return independentCapability

  const folder = pauseCapabilityFolderForVersion(officerVersion)
  const capabilities: PauseCapabilityByType | undefined = folder
    ? PAUSE_CAPABILITY_REGISTRY[folder]
    : undefined
  return capabilities?.[contractType as ContractType]
}

const pauseStatusPresentation = {
  active: { label: 'Active', color: 'success', dotClass: 'bg-success' },
  paused: { label: 'Paused', color: 'warning', dotClass: 'bg-warning' },
  'not-supported': {
    label: 'Not supported',
    color: 'neutral',
    dotClass: 'bg-neutral-400'
  },
  unavailable: { label: 'Unavailable', color: 'error', dotClass: 'bg-error' }
} as const satisfies Record<
  ContractPauseStatus,
  { label: string; color: 'success' | 'warning' | 'neutral' | 'error'; dotClass: string }
>

export function getContractPauseStatusPresentation(status: ContractPauseStatus) {
  return pauseStatusPresentation[status]
}
