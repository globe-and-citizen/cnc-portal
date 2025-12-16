import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'
import fs from 'fs'
import path from 'path'
import { network } from 'hardhat'

function getDeployedAddresses() {
  let chainId: number | undefined
  
  if (network.name === "localhost")
    chainId = 31337
  else 
    chainId = network.config.chainId

  console.log(`chainId`, chainId)
  console.log(`name`, network.name)

  // Construct the path to the deployed_addresses.json file
  const deployedAddressesPath = path.join(
    __dirname,
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
  const factoryBeaconAddress = deployedAddresses["ExpenseAccountEIP712Module#FactoryBeacon"]

  if (!factoryBeaconAddress) {
    throw new Error(`No FactoryBeacon address found in the deployed addresses`)
  }
  // Attach to the already deployed FactoryBeacon
  const expenseAccountFactoryBeacon = m.contractAt('FactoryBeacon', factoryBeaconAddress)

  // Deploy the new implementation contract
  const newExpenseAccountImplementation = m.contract('ExpenseAccountEIP712')

  // Call the beacon's upgrade function to set the new implementation
  m.call(expenseAccountFactoryBeacon, 'upgradeTo', [newExpenseAccountImplementation], {
    from: beaconOwner,
  })

  return { newExpenseAccountImplementation, expenseAccountFactoryBeacon }
})
