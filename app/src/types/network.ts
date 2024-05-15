export type Networks = 
    | "polygon" 
    | "hardhat" 
    | "sepolia" 
    | "ethereum" 
    | "amoy" 
    | "holesky"
    | undefined

export type Network = {
    chainId: string; 
    networkName: string; 
    rpcUrl: string; 
    blockExplorerUrl?: string; 
    currencySymbol: string
}