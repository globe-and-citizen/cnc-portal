import {
  Transfer as TransferEvent,
  Deposited as DepositedEvent,
  TokenTransfer as TokenTransferEvent,
  TokenDeposited as TokenDepositedEvent
} from '../generated/templates/ExpenseAccountEIP712/ExpenseAccountEIP712'
import { Transaction } from '../generated/schema'
import { Address } from '@graphprotocol/graph-ts'

export function handleTransfer(event: TransferEvent): void {
  let entity = new Transaction(event.transaction.hash.concatI32(event.logIndex.toI32()))
  entity.from = event.params.withdrawer
  entity.to = event.params.to
  entity.amount = event.params.amount

  entity.contractType = 'ExpenseAccountEIP712'
  entity.contractAddress = event.address
  entity.transactionType = 'transfer'
  entity.tokenAddress = Address.zero()

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleTokenTransfer(event: TokenTransferEvent): void {
  let entity = new Transaction(event.transaction.hash.concatI32(event.logIndex.toI32()))
  entity.from = event.params.withdrawer
  entity.to = event.params.to
  entity.amount = event.params.amount

  entity.contractType = 'ExpenseAccountEIP712'
  entity.contractAddress = event.address
  entity.transactionType = 'transfer'
  entity.tokenAddress = event.params.token

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleDeposited(event: DepositedEvent): void {
  let entity = new Transaction(event.transaction.hash.concatI32(event.logIndex.toI32()))
  entity.from = event.params.depositor
  entity.to = event.address
  entity.amount = event.params.amount

  entity.contractType = 'ExpenseAccountEIP712'
  entity.contractAddress = event.address
  entity.transactionType = 'deposit'
  entity.tokenAddress = Address.zero()

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleTokenDeposited(event: TokenDepositedEvent): void {
  let entity = new Transaction(event.transaction.hash.concatI32(event.logIndex.toI32()))
  entity.from = event.params.depositor
  entity.to = event.address
  entity.amount = event.params.amount

  entity.contractType = 'ExpenseAccountEIP712'
  entity.contractAddress = event.address
  entity.transactionType = 'deposit'
  entity.tokenAddress = event.params.token

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}