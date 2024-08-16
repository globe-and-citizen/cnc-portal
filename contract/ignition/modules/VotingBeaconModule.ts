import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const votingBeaconModule = buildModule("VotingBeaconModule", (m) => {
  const beaconAdmin = m.getAccount(0);
  const votingImplementation = m.contract("Voting");
  const beacon = m.contract("Beacon", [votingImplementation], {
    from: beaconAdmin,
  });

  return { beacon, votingImplementation };
});

export default votingBeaconModule;
