import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const TipsModule = buildModule("TipsModule", (m) => {
  const tips = m.contract("Tips");

  return { tips };
});

export default TipsModule;
