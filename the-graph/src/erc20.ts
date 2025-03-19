import {
  Transfer as TransferEvent
} from '../generated/USDC/ERC20'
import { Transaction, ContractDeployed } from '../generated/schema'
// import { Address } from '@graphprotocol/graph-ts'

export function handleTransferUsdc(event: TransferEvent): void {
    // entity.contractType = 'ExpenseAccountEIP712'
  const contractDeployed = ContractDeployed.load(event.params.to)
  
  if (contractDeployed) {
    let entity = new Transaction(event.transaction.hash.concatI32(event.logIndex.toI32()))
    
    entity.from = event.params.from
    entity.to = event.params.to
    entity.amount = event.params.value

    entity.contractAddress = event.params.to
    entity.transactionType = 'deposit'
    entity.tokenAddress = event.address
    entity.contractType = 'USDC'
  
    entity.blockNumber = event.block.number
    entity.blockTimestamp = event.block.timestamp
    entity.transactionHash = event.transaction.hash
  
    entity.save()
  }
}

export function handleTransferUsdt(event: TransferEvent): void {
  // entity.contractType = 'ExpenseAccountEIP712'
const contractDeployed = ContractDeployed.load(event.params.to)

if (contractDeployed) {
  let entity = new Transaction(event.transaction.hash.concatI32(event.logIndex.toI32()))
  
  entity.from = event.params.from
  entity.to = event.params.to
  entity.amount = event.params.value

  entity.contractAddress = event.params.to
  entity.transactionType = 'deposit'
  entity.tokenAddress = event.address
  entity.contractType = 'USDT'

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}
}