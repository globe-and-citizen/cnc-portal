import * as fs from 'fs'
import * as path from 'path'

const sourceDir = path.join(__dirname, '../ignition/deployments')

const destinationDirs = [
  path.resolve(__dirname, '../../app/src/artifacts/deployed_addresses'),
  path.resolve(__dirname, '../../dashboard/app/artifacts/deployed_addresses'),
  path.resolve(__dirname, '../../ponder/artifacts/deployed_addresses')
]

// The version registry (source of truth mapping Officer-generation tags to
// artifact-folder versions) is fanned out to every consumer as
// `version-registry.json`. Each consumer's version-aware resolver reads it.
// Backend is included even though it doesn't consume deployed_addresses — it
// resolves a team's version from this registry.
const registrySource = path.resolve(__dirname, '../versions/registry.json')
const registryDestinations = [
  path.resolve(__dirname, '../../app/src/artifacts/version-registry.json'),
  path.resolve(__dirname, '../../dashboard/app/artifacts/version-registry.json'),
  path.resolve(__dirname, '../../ponder/artifacts/version-registry.json'),
  path.resolve(__dirname, '../../backend/src/artifacts/version-registry.json')
]

destinationDirs.forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
})

function copyDeployedAddresses() {
  const chainDirs = fs.readdirSync(sourceDir)

  chainDirs.forEach((chainDir) => {
    const chainPath = path.join(sourceDir, chainDir)
    const deployedFilePath = path.join(chainPath, 'deployed_addresses.json')

    if (fs.existsSync(deployedFilePath)) {
      destinationDirs.forEach((dir) => {
        const destFilePath = path.join(dir, `${chainDir}.json`)
        fs.copyFileSync(deployedFilePath, destFilePath)
        console.log(`Copied ${deployedFilePath} to ${destFilePath}`)
      })
    }
  })
}

function copyVersionRegistry() {
  if (!fs.existsSync(registrySource)) {
    console.warn(`Version registry not found at ${registrySource}; skipping.`)
    return
  }
  registryDestinations.forEach((destFilePath) => {
    fs.mkdirSync(path.dirname(destFilePath), { recursive: true })
    fs.copyFileSync(registrySource, destFilePath)
    console.log(`Copied ${registrySource} to ${destFilePath}`)
  })
}

copyDeployedAddresses()
copyVersionRegistry()
