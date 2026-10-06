import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const EXPECTED_CHAIN_ID = 31_337
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]'])

export const REQUIRED_DEPLOYMENTS = [
  'Officer#FactoryBeacon',
  'BankBeaconModule#Beacon',
  'MockTokens#USDC',
  'MockTokens#USDCe',
  'MockTokens#USDT'
]

function localUrl(value, label) {
  if (!value) throw new Error(`${label} is required for integrated E2E preflight`)
  const url = new URL(value)
  if (
    url.protocol !== 'http:' ||
    !LOCAL_HOSTS.has(url.hostname) ||
    url.username !== '' ||
    url.password !== ''
  ) {
    throw new Error(`${label} must point to a local HTTP service`)
  }
  return url
}

async function rpc(fetchImpl, rpcUrl, method, params = []) {
  const response = await fetchImpl(rpcUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method, params, id: 1 }),
    signal: AbortSignal.timeout(5_000)
  })
  if (!response.ok) throw new Error(`Local chain ${method} returned HTTP ${response.status}`)
  const body = await response.json()
  if (body.error || typeof body.result !== 'string') {
    throw new Error(`Local chain ${method} returned an invalid RPC result`)
  }
  return body.result
}

export async function checkIntegratedReadiness({
  frontendUrl,
  backendUrl,
  rpcUrl,
  manifest,
  fetchImpl = fetch
}) {
  const frontendResponse = await fetchImpl(frontendUrl, { signal: AbortSignal.timeout(5_000) })
  if (!frontendResponse.ok) {
    throw new Error(`Integrated frontend returned HTTP ${frontendResponse.status}`)
  }

  const readinessResponse = await fetchImpl(new URL('/api/health/readiness', backendUrl), {
    signal: AbortSignal.timeout(5_000)
  })
  if (!readinessResponse.ok) {
    throw new Error(`Integrated backend readiness returned HTTP ${readinessResponse.status}`)
  }
  const readiness = await readinessResponse.json()
  if (
    readiness.success !== true ||
    readiness.status !== 'ready' ||
    readiness.checks?.database !== 'ready' ||
    readiness.checks?.chain !== 'ready' ||
    readiness.chainId !== EXPECTED_CHAIN_ID ||
    readiness.expectedChainId !== EXPECTED_CHAIN_ID
  ) {
    throw new Error('Integrated backend database or chain is not ready on the expected network')
  }

  const observedChainId = await rpc(fetchImpl, rpcUrl, 'eth_chainId')
  if (Number.parseInt(observedChainId, 16) !== EXPECTED_CHAIN_ID) {
    throw new Error('The local chain does not match the integrated backend network')
  }

  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    throw new Error('The integrated deployment manifest is invalid')
  }
  for (const key of REQUIRED_DEPLOYMENTS) {
    if (!Object.hasOwn(manifest, key)) {
      throw new Error(`The integrated deployment manifest is missing ${key}`)
    }
  }

  const deployments = REQUIRED_DEPLOYMENTS.map((key) => [key, manifest[key]])
  for (const [key, address] of deployments) {
    if (typeof address !== 'string' || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
      throw new Error(`The integrated deployment manifest has an invalid ${key} address`)
    }
  }
  await Promise.all(
    deployments.map(async ([key, address]) => {
      const code = await rpc(fetchImpl, rpcUrl, 'eth_getCode', [address, 'latest'])
      if (code === '0x') throw new Error(`The integrated deployment is missing code for ${key}`)
    })
  )

  return deployments.length
}

async function main() {
  const manifestUrl = new URL(
    '../src/artifacts/deployed_addresses/chain-31337.json',
    import.meta.url
  )
  const manifest = JSON.parse(await readFile(manifestUrl, 'utf8'))
  const count = await checkIntegratedReadiness({
    frontendUrl: localUrl(process.env.BASE_URL ?? 'http://127.0.0.1:5173', 'BASE_URL'),
    backendUrl: localUrl(process.env.CNC_E2E_BACKEND_URL, 'CNC_E2E_BACKEND_URL'),
    rpcUrl: localUrl(process.env.CNC_E2E_RPC_URL ?? 'http://127.0.0.1:8545', 'Local E2E RPC'),
    manifest
  })
  console.log(`Integrated E2E preflight passed (${count} shared contracts verified)`)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}
