import assert from 'node:assert/strict'
import test from 'node:test'
import { checkIntegratedReadiness, REQUIRED_DEPLOYMENTS } from '../check-integrated-readiness.mjs'

const manifest = Object.fromEntries(
  REQUIRED_DEPLOYMENTS.map((key, index) => [key, `0x${(index + 1).toString(16).padStart(40, '0')}`])
)

function localResponses({ backendStatus = 200, chainId = '0x7a69', missingCode } = {}) {
  const methods = []
  return {
    methods,
    fetchImpl: async (url, options = {}) => {
      const requestUrl = new URL(url)
      if (requestUrl.pathname === '/api/health/readiness') {
        return Response.json(
          {
            success: backendStatus === 200,
            status: backendStatus === 200 ? 'ready' : 'not_ready',
            checks: { database: backendStatus === 200 ? 'ready' : 'unready', chain: 'ready' },
            chainId: 31_337,
            expectedChainId: 31_337
          },
          { status: backendStatus }
        )
      }
      if (options.method === 'POST') {
        const { method, params } = JSON.parse(options.body)
        methods.push(method)
        return Response.json({
          jsonrpc: '2.0',
          id: 1,
          result: method === 'eth_chainId' ? chainId : params[0] === missingCode ? '0x' : '0x6000'
        })
      }
      return new Response('frontend', { status: 200 })
    }
  }
}

function checkWith(fetchImpl, deployments = manifest) {
  return checkIntegratedReadiness({
    frontendUrl: new URL('http://127.0.0.1:5173'),
    backendUrl: new URL('http://127.0.0.1:3000'),
    rpcUrl: new URL('http://127.0.0.1:8545'),
    manifest: deployments,
    fetchImpl
  })
}

test('checks service readiness, chain identity, and shared contracts', async () => {
  const responses = localResponses()
  assert.equal(await checkWith(responses.fetchImpl), REQUIRED_DEPLOYMENTS.length)
  assert.equal(responses.methods.filter((method) => method === 'eth_chainId').length, 1)
  assert.equal(
    responses.methods.filter((method) => method === 'eth_getCode').length,
    REQUIRED_DEPLOYMENTS.length
  )
})

test('stops before chain checks when the backend reports an unready database', async () => {
  const responses = localResponses({ backendStatus: 503 })
  await assert.rejects(checkWith(responses.fetchImpl), /readiness returned HTTP 503/)
  assert.deepEqual(responses.methods, [])
})

test('rejects a different local chain', async () => {
  const responses = localResponses({ chainId: '0x1' })
  await assert.rejects(checkWith(responses.fetchImpl), /does not match/)
  assert.deepEqual(responses.methods, ['eth_chainId'])
})

test('rejects missing manifest entries or missing deployment code', async () => {
  const responses = localResponses()
  const incomplete = { ...manifest }
  delete incomplete['Officer#FactoryBeacon']
  await assert.rejects(checkWith(responses.fetchImpl, incomplete), /missing Officer#FactoryBeacon/)

  const missingCode = localResponses({ missingCode: manifest['MockTokens#USDC'] })
  await assert.rejects(checkWith(missingCode.fetchImpl), /missing code for MockTokens#USDC/)
})

test('does not make a feature-specific deployment a shared prerequisite', async () => {
  const responses = localResponses({ missingCode: '0x00000000000000000000000000000000000000ff' })
  const withSafe = {
    ...manifest,
    'SafeInfraModule#SafeL2': '0x00000000000000000000000000000000000000ff'
  }
  assert.equal(await checkWith(responses.fetchImpl, withSafe), REQUIRED_DEPLOYMENTS.length)
  assert.equal(
    responses.methods.filter((method) => method === 'eth_getCode').length,
    REQUIRED_DEPLOYMENTS.length
  )
})
