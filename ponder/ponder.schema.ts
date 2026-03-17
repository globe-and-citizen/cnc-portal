import { index, onchainTable } from "ponder";

export const beaconProxy = onchainTable(
  "beacon_proxy",
  (t) => ({
    address: t.hex().primaryKey(),
    deployer: t.hex().notNull(),
    blockNumber: t.bigint().notNull(),
    timestamp: t.integer().notNull(),
  }),
  (table) => ({
    deployerIdx: index("deployer_index").on(table.deployer),
  }),
);
