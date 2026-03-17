import { index, onchainTable, relations } from "ponder";

// One Officer proxy = one team
export const team = onchainTable(
  "team",
  (t) => ({
    address: t.hex().primaryKey(),
    deployer: t.hex().notNull(),
    blockNumber: t.bigint().notNull(),
    timestamp: t.integer().notNull(),
  }),
  (table) => ({
    deployerIdx: index("team_deployer_index").on(table.deployer),
  }),
);

// Sub-contracts deployed by each Officer proxy
export const teamContract = onchainTable(
  "team_contract",
  (t) => ({
    id: t.text().primaryKey(), // `${officerAddress}-${contractType}`
    teamAddress: t.hex().notNull(),
    contractType: t.text().notNull(),
    contractAddress: t.hex().notNull(),
    blockNumber: t.bigint().notNull(),
    timestamp: t.integer().notNull(),
  }),
  (table) => ({
    teamAddressIdx: index("team_contract_team_index").on(table.teamAddress),
  }),
);

export const teamRelations = relations(team, ({ many }) => ({
  contracts: many(teamContract),
}));

export const teamContractRelations = relations(teamContract, ({ one }) => ({
  team: one(team, {
    fields: [teamContract.teamAddress],
    references: [team.address],
  }),
}));
