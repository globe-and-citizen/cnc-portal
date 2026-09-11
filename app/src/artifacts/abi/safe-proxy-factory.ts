import { getProxyFactoryDeployment } from '@safe-global/safe-deployments'
import type { Abi } from 'viem'
import { SAFE_VERSION } from '@/types/safe'

const deployment = getProxyFactoryDeployment({ version: SAFE_VERSION })
if (!deployment) throw new Error(`Safe Proxy Factory ${SAFE_VERSION} deployment is unavailable`)

export const SAFE_PROXY_FACTORY_ABI = deployment.abi as Abi
