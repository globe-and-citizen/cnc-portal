import {
  Deposited as DepositedEvent,
  Withdraw as WithdrawEvent,
} from "../generated/templates/CashRemunerationEIP712/CashRemunerationEIP712";
import { Transaction } from "../generated/schema";
import { Address } from "@graphprotocol/graph-ts";

export function handleDeposited(event: DepositedEvent): void {
  let entity = new Transaction(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.from = event.params.depositor;
  entity.to = event.address;
  entity.amount = event.params.amount;

  entity.contractType = "CashRemunerationEIP712";
  entity.contractAddress = event.address;
  entity.transactionType = "deposit";
  entity.tokenAddress = Address.zero();

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

export function handleWithdraw(event: WithdrawEvent): void {
  let entity = new Transaction(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.from = event.address;
  entity.to = event.params.withdrawer;
  entity.amount = event.params.amount;

  entity.contractType = "CashRemunerationEIP712";
  entity.contractAddress = event.address;
  entity.transactionType = "withdraw";
  entity.tokenAddress = Address.zero();

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}
