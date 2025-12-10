export type Networks
  = | 'polygon'
    | 'hardhat'
    | 'sepolia'
    | 'ethereum'
    | 'amoy'
    | 'holesky'
    | undefined

export type Network = {
  [key: string]: string | undefined
  chainId: string
  networkName: string
  rpcUrl: string
  blockExplorerUrl?: string
  currencySymbol: string
}
