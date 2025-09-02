import { ethers } from 'hardhat'
// import { expect } from 'chai'
import { /*BoardOfDirectors,*/ Beacon } from '../typechain-types'

describe('BoardOfDirectors Upgrade Test', function () {
  it('Should verify the implementation address after upgrade', async function () {
    // 1. Get the Beacon contract instance
    const beaconAddress = '<beacon_address>' //use correct address for the network
    const Beacon = (await ethers.getContractFactory('Beacon')) as unknown as Beacon
    const beacon = Beacon.attach(beaconAddress) as unknown as Beacon
    // 2. Get the implementation address from the beacon
    const implementationAddress = await beacon.implementation()
    // 3. Verify the implementation address is correct
    console.log('Current BoardOfDirectors implementation address:', implementationAddress)
    // Optional: Verify the implementation is the expected contract
    // const Implementation = await ethers.getContractFactory('BoardOfDirectors')
    // const implementation = Implementation.attach(
    //   implementationAddress
    // ) as unknown as Bank
    // Test some function to verify it's the right contract
    // Replace with an actual function from your implementation
    // const version = await implementation.getVersion();
    // expect(version).to.exist;
    // expect(version).to.equal("2.0.0");
  })
})
