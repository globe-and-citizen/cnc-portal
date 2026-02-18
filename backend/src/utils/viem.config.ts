import { createPublicClient, http } from 'viem';
import { mainnet, sepolia, polygon, hardhat, polygonAmoy } from 'viem/chains';

const chainId = process.env.CHAIN_ID;
const rpcUrl = 'https://polygon-mainnet.g.alchemy.com/v2/F_3kP4qK3m83Mzp0ZsxoBSNwXn9AWZfy';
export const getChain = (chainIdStr: string | undefined) => {
  if (!chainIdStr) return sepolia; // default to sepolia

  const id = chainIdStr.startsWith('0x') ? parseInt(chainIdStr, 16) : parseInt(chainIdStr);

  switch (id) {
    case mainnet.id:
      return mainnet;
    case sepolia.id:
      return sepolia;
    case polygon.id:
      return polygon;
    case hardhat.id:
      return hardhat;
    case polygonAmoy.id:
      return polygonAmoy;
    default:
      return sepolia;
  }
};

const publicClient = createPublicClient({
  chain: getChain(chainId),
  transport: http(rpcUrl),
});

export default publicClient;
