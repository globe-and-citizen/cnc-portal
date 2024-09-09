import * as fs from 'fs'
import * as path from 'path'

const sourceDir = path.join(__dirname, 'ignition/deployments')

const destinationDir = path.resolve(__dirname, '../app/src/artifacts/deployed_addresses')

if (!fs.existsSync(destinationDir)) {
  fs.mkdirSync(destinationDir, { recursive: true })
}

function copyDeployedAddresses() {
  const chainDirs = fs.readdirSync(sourceDir)

  chainDirs.forEach((chainDir) => {
    const chainPath = path.join(sourceDir, chainDir)
    const deployedFilePath = path.join(chainPath, 'deployed_addresses.json')

    if (fs.existsSync(deployedFilePath)) {
      const destFilePath = path.join(destinationDir, `${chainDir}-deployed_addresses.json`)
      fs.copyFileSync(deployedFilePath, destFilePath)
      console.log(`Copied ${deployedFilePath} to ${destFilePath}`)
    }
  })
}

copyDeployedAddresses()
