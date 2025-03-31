import { Address } from "@graphprotocol/graph-ts";
import { Transaction } from "../generated/schema";
import {
  Transfer as TransferEvent,
  Deposited as DepositedEvent
} from "../generated/templates/Bank/Bank";

export function handleTransfer(event: TransferEvent): void {
  let entity = new Transaction(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.from = event.params.sender;
  entity.to = event.params.to;
  entity.amount = event.params.amount;

  entity.contractType = "Bank";
  entity.contractAddress = event.address;
  entity.transactionType = "transfer";
  entity.tokenAddress = Address.zero();

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

export function handleDeposited(event: DepositedEvent): void {
  let entity = new Transaction(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.from = event.params.depositor;
  entity.to = event.address;
  entity.amount = event.params.amount;

  entity.contractType = "Bank";
  entity.contractAddress = event.address;
  entity.transactionType = "deposit";
  entity.tokenAddress = Address.zero();

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}
