import { createPublicClient, http, fallback, type Chain, type Transport } from 'viem';
import { mainnet, sepolia, polygon, hardhat, polygonAmoy } from 'viem/chains';

const chainId = process.env.CHAIN_ID;
const rpcUrl = process.env.RPC_URL;

// Public RPC endpoints used as automatic failover. viem's `http()` only retries
// the *same* endpoint, so a dead, rate-limited, or gated provider (e.g. Polygon's
// `polygon-rpc.com`, which is also viem's hard-coded chain default) takes reads
// down with it. `fallback()` rotates to the next endpoint instead. These are
// current-state reads (`eth_call`/`getBalance`), so the public endpoints' log
// pruning is irrelevant here. Hardhat has no public peers and is omitted.
const PUBLIC_FALLBACK_RPCS: Record<number, string[]> = {
  [mainnet.id]: ['https://eth.drpc.org', 'https://ethereum-rpc.publicnode.com'],
  [sepolia.id]: ['https://sepolia.drpc.org', 'https://ethereum-sepolia-rpc.publicnode.com'],
  [polygon.id]: ['https://polygon.drpc.org', 'https://polygon-bor-rpc.publicnode.com'],
  [polygonAmoy.id]: [
    'https://polygon-amoy.drpc.org',
    'https://polygon-amoy-bor-rpc.publicnode.com',
  ],
};

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

// A configured RPC_URL stays first (top priority); the chain's public endpoints
// are appended as failover. Chains without public peers (hardhat) keep the
// single transport, deferring to viem's chain default when RPC_URL is unset.
export const getTransport = (chain: Chain): Transport => {
  const urls = [...(rpcUrl ? [rpcUrl] : []), ...(PUBLIC_FALLBACK_RPCS[chain.id] ?? [])];
  if (urls.length === 0) return http();
  if (urls.length === 1) return http(urls[0]);
  return fallback(urls.map((url) => http(url)));
};

const chain = getChain(chainId);

const publicClient = createPublicClient({
  chain,
  transport: getTransport(chain),
});

export default publicClient;
