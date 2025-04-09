import {
  Deposited as DepositedEvent,
  Withdraw as WithdrawEvent,
} from "../generated/templates/CashRemunerationEIP712/CashRemunerationEIP712";
import { MonthlyWithdrawn, Transaction } from "../generated/schema";
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
  calculateMonthYear(event);

  entity.save();
}

function calculateMonthYear(event: WithdrawEvent): void {
  let timestamp = event.block.timestamp.toI64();
  let date = new Date(timestamp * 1000); // convert to milliseconds
  let year = date.getUTCFullYear().toString();
  let month = (date.getUTCMonth() + 1).toString().padStart(2, "0");
  let monthAndYear = `${year}-${month}`; // format as YYYY-MM

  let monthlyWithdrawn = MonthlyWithdrawn.load(monthAndYear);
  if (monthlyWithdrawn == null) {
    monthlyWithdrawn = new MonthlyWithdrawn(monthAndYear);
    monthlyWithdrawn.totalAmount = event.params.amount;
  } else {
    monthlyWithdrawn.totalAmount = monthlyWithdrawn.totalAmount.plus(
      event.params.amount
    );
  }
  monthlyWithdrawn.contractType = "CashRemunerationEIP712";
  monthlyWithdrawn.contractAddress = event.address;

  monthlyWithdrawn.save();
}
