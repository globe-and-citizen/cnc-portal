import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import { Transaction } from "../generated/schema";

export function getOrCreateTransaction(
  transactionHash: Bytes,
  logIndex: BigInt,
  from: Bytes,
  to: Bytes,
  contractType: string,
  tokenAddress: Bytes,
  amount: BigInt,
  contractAddress: Bytes,
  transactionType: string
): Transaction {
  let id = transactionHash.concatI32(logIndex.toI32());
  let transaction = Transaction.load(id);

  if (transaction === null) {
    transaction = new Transaction(id);
    transaction.from = from;
    transaction.to = to;
    transaction.contractType = contractType;
    transaction.tokenAddress = tokenAddress;
    transaction.amount = amount;
    transaction.contractAddress = contractAddress;
    transaction.transactionType = transactionType;
    transaction.blockNumber = BigInt.fromI32(0);
    transaction.blockTimestamp = BigInt.fromI32(0);
    transaction.transactionHash = transactionHash;
  }

  return transaction;
}
