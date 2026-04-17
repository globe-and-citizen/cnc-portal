import * as fs from 'fs'
import * as path from 'path'

const sourceDir = path.join(__dirname, '../ignition/deployments')

const destinationDirs = [
  path.resolve(__dirname, '../../app/src/artifacts/deployed_addresses'),
  path.resolve(__dirname, '../../dashboard/app/artifacts/deployed_addresses'),
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

copyDeployedAddresses()
