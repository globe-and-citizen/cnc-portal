import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'
import fs from 'node:fs'
import path from 'node:path'

function getDeployedAddresses() {
  const networkName = process.env.HARDHAT_NETWORK ?? 'default'
  const chainId = networkName === 'polygon' ? 137 : 31337

  console.log(`chainId`, chainId)
  console.log(`name`, networkName)

  // Construct the path to the deployed_addresses.json file
  const deployedAddressesPath = path.join(
    import.meta.dirname,
    `../deployments/chain-${chainId}/deployed_addresses.json`
  )

  console.log(`deployedAddresesPath`, deployedAddressesPath)

  // Check if the file exists
  if (!fs.existsSync(deployedAddressesPath)) {
    throw new Error(`No deployed addresses found for chainId: ${chainId}`)
  }

  // Load and parse the deployed addresses JSON
  return JSON.parse(fs.readFileSync(deployedAddressesPath, 'utf-8'))
}

export default buildModule('ExpenseAccountUpgradeModule', (m) => {
  const beaconOwner = m.getAccount(0)

  const deployedAddresses = getDeployedAddresses()

  console.log(`factoryBeaconAddress`, deployedAddresses)

  // Retrieve the FactoryBeacon address from the loaded addresses
  const factoryBeaconAddress = deployedAddresses['ExpenseAccountEIP712Module#FactoryBeacon']

  if (!factoryBeaconAddress) {
    throw new Error(`No FactoryBeacon address found in the deployed addresses`)
  }
  // Attach to the already deployed FactoryBeacon
  const expenseAccountFactoryBeacon = m.contractAt('FactoryBeacon', factoryBeaconAddress)

  // Deploy the new implementation contract
  const newExpenseAccountImplementation = m.contract('ExpenseAccountEIP712')

  // Call the beacon's upgrade function to set the new implementation
  m.call(expenseAccountFactoryBeacon, 'upgradeTo', [newExpenseAccountImplementation], {
    from: beaconOwner
  })

  return { newExpenseAccountImplementation, expenseAccountFactoryBeacon }
})
