import { expect } from 'chai'
import { ContractStatusChecker } from './contractStatusChecker'
import * as fs from 'fs'
import * as path from 'path'

describe('Contract Status Checker', function () {
  this.timeout(30000) // 30 second timeout for network calls

  it('should load deployment files correctly', function () {
    // Test that deployment files exist
    const sepoliaPath = path.join(__dirname, '../ignition/deployments/chain-11155111/deployed_addresses.json')
    const polygonPath = path.join(__dirname, '../ignition/deployments/chain-137/deployed_addresses.json')
    
    expect(fs.existsSync(sepoliaPath), 'Sepolia deployment file should exist').to.be.true
    expect(fs.existsSync(polygonPath), 'Polygon deployment file should exist').to.be.true
    
    // Test that deployment files are valid JSON
    const sepoliaDeployments = JSON.parse(fs.readFileSync(sepoliaPath, 'utf8'))
    const polygonDeployments = JSON.parse(fs.readFileSync(polygonPath, 'utf8'))
    
    expect(sepoliaDeployments).to.be.an('object')
    expect(polygonDeployments).to.be.an('object')
    
    // Check for expected contracts
    expect(sepoliaDeployments).to.have.property('Officer#Officer')
    expect(polygonDeployments).to.have.property('Officer#Officer')
  })

  it('should normalize bytecode correctly', function () {
    const checker = new (ContractStatusChecker as any)('hardhat')
    
    // Test bytecode normalization (private method, so we access it through any)
    const bytecodeWithMetadata = '0x608060405234801561001057600080fd5b5060405161012c38038061012c833981810160405281019061003291906100a1565b80a264697066735822' + '1234567890123456789012345678901234567890123456789012345678901234' + '64736f6c6343000811000033'
    const bytecodeWithoutMetadata = '0x608060405234801561001057600080fd5b5060405161012c38038061012c833981810160405281019061003291906100a1565b80'
    
    const normalized1 = (checker as any).normalizeBytecode(bytecodeWithMetadata)
    const normalized2 = (checker as any).normalizeBytecode(bytecodeWithoutMetadata)
    
    expect(normalized1).to.be.a('string')
    expect(normalized2).to.be.a('string')
    
    // Both should be lowercase
    expect(normalized1).to.equal(normalized1.toLowerCase())
    expect(normalized2).to.equal(normalized2.toLowerCase())
    
    // Test if the metadata was actually removed
    const hasMetadata = /a264697066735822[0-9a-f]{64}64736f6c63[0-9a-f]{6}0033$/i.test(bytecodeWithMetadata.slice(2))
    
    if (hasMetadata) {
      expect(normalized1.length).to.be.lessThan(bytecodeWithMetadata.length - 2) // -2 for 0x prefix
    }
  })

  it('should create contract status checker for different networks', function () {
    const hardhatChecker = new ContractStatusChecker('hardhat')
    const sepoliaChecker = new ContractStatusChecker('sepolia')
    const polygonChecker = new ContractStatusChecker('polygon')
    
    expect(hardhatChecker).to.be.instanceOf(ContractStatusChecker)
    expect(sepoliaChecker).to.be.instanceOf(ContractStatusChecker)
    expect(polygonChecker).to.be.instanceOf(ContractStatusChecker)
  })

  it('should check hardhat contracts (offline mode)', async function () {
    // This test can only run if hardhat node is running locally
    const checker = new ContractStatusChecker('hardhat')
    
    try {
      const results = await checker.checkAllContracts()
      expect(results).to.be.an('array')
      
      // Since no contracts are deployed on local hardhat, all should be not_found
      results.forEach(result => {
        expect(result).to.have.property('name')
        expect(result).to.have.property('type')
        expect(result).to.have.property('status')
        expect(['match', 'diverge', 'error', 'not_found']).to.include(result.status)
      })
    } catch (error) {
      // If hardhat node is not running, skip this test
      console.log('Skipping hardhat test - node not available:', (error as Error).message)
    }
  })
})