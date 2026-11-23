import type { TeamContract } from './teamContract'

/** Generation metadata can include contract kinds unknown to the current client. */
export type DeploymentContract = Pick<TeamContract, 'address' | 'deployer'> & { type: string }

export interface Deployment {
  contractType: string
  initializerData: `0x${string}`
}

/** One current or archived Officer generation shown in Contract Management. */
export interface ContractGeneration {
  key: number | string
  version: string | null
  officerAddress: string
  isCurrent: boolean
  contracts: DeploymentContract[]
}
