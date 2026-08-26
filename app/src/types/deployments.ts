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
  contracts: Array<{ address: string; type: string; deployer: string }>
}
