// backend/prisma/seeders/config.ts

type Environment = 'development' | 'test' | 'staging' | 'production';

export interface SeedConfig {
  users: number;
  teams: number;
  membersPerTeam: number;
  wagesPerUser: number;
  weeklyClaimsPerUser: number;
  claimsPerWeeklyClaim: number;
  expensesPerTeam: number;
  contractsPerTeam: number;
  actionsPerTeam: number;
  notificationsPerUser: number;
}

export const CONFIGS: Record<Environment, SeedConfig> = {
  development: {
    users: 10,
    teams: 5,
    membersPerTeam: 3,
    wagesPerUser: 3,
    weeklyClaimsPerUser: 4,
    claimsPerWeeklyClaim: 5,
    expensesPerTeam: 3,
    contractsPerTeam: 2,
    actionsPerTeam: 4,
    notificationsPerUser: 5,
  },
  test: {
    users: 3,
    teams: 2,
    membersPerTeam: 2,
    wagesPerUser: 2,
    weeklyClaimsPerUser: 2,
    claimsPerWeeklyClaim: 3,
    expensesPerTeam: 2,
    contractsPerTeam: 2,
    actionsPerTeam: 3,
    notificationsPerUser: 2,
  },
  staging: {
    users: 50,
    teams: 20,
    membersPerTeam: 5,
    wagesPerUser: 4,
    weeklyClaimsPerUser: 8,
    claimsPerWeeklyClaim: 7,
    expensesPerTeam: 5,
    contractsPerTeam: 3,
    actionsPerTeam: 5,
    notificationsPerUser: 10,
  },
  production: {
    users: 0,
    teams: 0,
    membersPerTeam: 0,
    wagesPerUser: 0,
    weeklyClaimsPerUser: 0,
    claimsPerWeeklyClaim: 0,
    expensesPerTeam: 0,
    contractsPerTeam: 0,
    actionsPerTeam: 0,
    notificationsPerUser: 0,
  },
};

// Hardhat test accounts
export const HARDHAT_ADDRESSES = [
  '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
  '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
  '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
  '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
  '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65',
];

export type { Environment };
