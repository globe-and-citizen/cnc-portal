import {
  Transfer as TransferEvent,
  Deposited as DepositedEvent,
  TokenTransfer as TokenTransferEvent
} from '../generated/templates/ExpenseAccountEIP712/ExpenseAccountEIP712'
import { Transfer, Deposited } from '../generated/schema'
import { Address } from '@graphprotocol/graph-ts'

export function handleTransfer(event: TransferEvent): void {
  let entity = new Transfer(event.transaction.hash.concatI32(event.logIndex.toI32()))
  entity.from = event.params.withdrawer
  entity.to = event.params.to
  entity.tokenAddress = Address.zero()
  entity.amount = event.params.amount

  entity.contractType = 'ExpenseAccountEIP712'
  entity.contractAddress = event.address

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleTokenTransfer(event: TokenTransferEvent): void {
  let entity = new Transfer(event.transaction.hash.concatI32(event.logIndex.toI32()))
  entity.from = event.params.withdrawer
  entity.to = event.params.to
  entity.tokenAddress = event.params.token
  entity.amount = event.params.amount

  entity.contractType = 'ExpenseAccountEIP712'
  entity.contractAddress = event.address

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleDeposited(event: DepositedEvent): void {
  let entity = new Deposited(event.transaction.hash.concatI32(event.logIndex.toI32()))
  entity.from = event.params.depositor
  entity.to = event.address
  entity.amount = event.params.amount

  entity.contractType = 'ExpenseAccountEIP712'
  entity.contractAddress = event.address

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}
