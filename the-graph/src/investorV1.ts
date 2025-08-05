import {
  Minted as MintedEvent,
  DividendDistributed as DividendDistributedEvent,
  Transfer as TransferEvent,
  Approval as ApprovalEvent,
} from "../generated/templates/InvestorV1/InvestorV1";
import { Transaction } from "../generated/schema";
import { Address } from "@graphprotocol/graph-ts";

export function handleMint(event: MintedEvent): void {
  let transaction = new Transaction(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  transaction.from = Address.zero();
  transaction.to = event.params.shareholder;
  transaction.amount = event.params.amount;
  transaction.contractType = "InvestorsV1";
  transaction.contractAddress = event.address;
  transaction.transactionType = "mint";
  transaction.tokenAddress = event.address;
  transaction.blockNumber = event.block.number;
  transaction.blockTimestamp = event.block.timestamp;
  transaction.transactionHash = event.transaction.hash;
  transaction.save();
}

export function handleDividendDistributed(
  event: DividendDistributedEvent
): void {
  let transaction = new Transaction(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  transaction.from = event.address; // Contract distributing dividends
  transaction.to = event.params.shareholder;
  transaction.amount = event.params.amount;
  transaction.contractType = "InvestorsV1";
  transaction.contractAddress = event.address;
  transaction.transactionType = "dividend";
  transaction.tokenAddress = Address.zero(); // ETH dividends
  transaction.blockNumber = event.block.number;
  transaction.blockTimestamp = event.block.timestamp;
  transaction.transactionHash = event.transaction.hash;
  transaction.save();
}

export function handleTransfer(event: TransferEvent): void {
  // Skip mints (handled by handleMint)
  if (event.params.from.equals(Address.zero())) {
    return;
  }
  // Skip burns (not used in this contract)
  if (event.params.to.equals(Address.zero())) {
    return;
  }
  // Only track real shareholder-to-shareholder transfers
  let transaction = new Transaction(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  transaction.from = event.params.from;
  transaction.to = event.params.to;
  transaction.amount = event.params.value;
  transaction.contractType = "InvestorsV1";
  transaction.contractAddress = event.address;
  transaction.transactionType = "transfer";
  transaction.tokenAddress = event.address;
  transaction.blockNumber = event.block.number;
  transaction.blockTimestamp = event.block.timestamp;
  transaction.transactionHash = event.transaction.hash;
  transaction.save();
}
