import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'
import SafeL2Artifact from '@safe-global/safe-contracts/build/artifacts/contracts/SafeL2.sol/SafeL2.json' with { type: 'json' }
import SafeProxyFactoryArtifact from '@safe-global/safe-contracts/build/artifacts/contracts/proxies/SafeProxyFactory.sol/SafeProxyFactory.json' with { type: 'json' }
import CompatibilityFallbackHandlerArtifact from '@safe-global/safe-contracts/build/artifacts/contracts/handler/CompatibilityFallbackHandler.sol/CompatibilityFallbackHandler.json' with { type: 'json' }

// Local-network-only: Safe v1.4.1 infrastructure (Singleton, ProxyFactory,
// CompatibilityFallbackHandler) is already live at fixed canonical addresses
// on Polygon and every other supported network, so it is never deployed
// there. A fresh Hardhat node has none of it, so we deploy our own copies
// here from the official prebuilt artifacts (not compiled by this project)
// purely to make local Safe deployment/testing possible.
export default buildModule('SafeInfraModule', (m) => {
  const singleton = m.contract('SafeL2', SafeL2Artifact, [])
  const proxyFactory = m.contract('SafeProxyFactory', SafeProxyFactoryArtifact, [])
  const fallbackHandler = m.contract(
    'CompatibilityFallbackHandler',
    CompatibilityFallbackHandlerArtifact,
    []
  )

  return { singleton, proxyFactory, fallbackHandler }
})
