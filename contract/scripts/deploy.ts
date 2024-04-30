import { ethers, upgrades } from 'hardhat'

async function main() {
  const TipsImplementation = await ethers.getContractFactory('Tips')
  const tipsProxy = await upgrades.deployProxy(TipsImplementation)
  const contract = await tipsProxy.waitForDeployment()
  
  const implementationAddress = await upgrades.erc1967.getImplementationAddress(
    await contract.getAddress()
  );


  console.log('Tips deployed to:', await contract.getAddress())
  
  console.log("Implementation contract address: " + implementationAddress);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
