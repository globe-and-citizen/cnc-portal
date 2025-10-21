// modules/CashRemunerationEIP712UpgradeModule.ts
import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'

export default buildModule('OfficerUpgradeModule', (m) => {
	const beaconOwner = m.getAccount(0)

	// If you want to deploy a new implementation
	// Step 1: Deploy new implementation with a unique ID
	const newImpl = m.contract('Officer', [], {
		id: 'Officer_v2' // Use a unique ID for this upgrade
	})

	// Alternatively, if you need to revert to an existing implementation
	// Step 1: Reference an exisiting implementation - NB: Set the correct address for the network and a unique ID
	// const newImpl = m.contractAt('Officer', '<existing_implementation_address>', { id: '<unique_implementation_id>' })

	// If implementation needs to be initialized
	// Step 2: Initialize the new (or old) implementation accordingly
	// const beaconConfigs = [
	// 	{ beaconType: 'Bank', beaconAddress: '<network_bank_beacon_address>' },
  //   { beaconType: 'Elections', beaconAddress: '<network_elections_beacon_address>' },
  //   { beaconType: 'Proposals', beaconAddress: '<network_proposal_beacon_address>' },
  //   { beaconType: 'BoardOfDirectors', beaconAddress: '<network_bod_address>' },
  //   { beaconType: 'ExpenseAccountEIP712', beaconAddress: '<network_expense_account_eip712_address>' },
  //   { beaconType: 'InvestorV1', beaconAddress: '<investors_v1_beacon_address>' },
  //   { beaconType: 'CashRemunerationEIP712', beaconAddress: '<cash_remuneration_eip712_beacon_address>' }
	// ]

	// m.call(newImpl, 'initialize', [beaconOwner, beaconConfigs, [], false])

	// Step 3: Reference the already-deployed beacon - NB: Set the correct beacon address for the network and a unique ID
	const factoryBeacon = m.contractAt(
		'FactoryBeacon',
		'0xfb43E04F2CEAdC5ED45F58CF96795818FC32b874', // Polygon chain 137 Officer#FactoryBeacon
		{ id: 'FactoryBeacon_v2' }
	)

	// Call upgradeTo on the beacon and pass new implementation address
	m.call(factoryBeacon, 'upgradeTo', [newImpl], { from: beaconOwner })

	return { factoryBeacon, newImpl }
})