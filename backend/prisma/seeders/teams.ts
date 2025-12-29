// backend/prisma/seeders/teams.ts

import { PrismaClient, User } from '@prisma/client';
import { faker } from '@faker-js/faker';
import { type SeedConfig } from './config';
import { distributeDate } from './helpers';

// All available contract types
const CONTRACT_TYPES = [
  'Bank',
  'InvestorV1',
  'Voting',
  'BoardOfDirectors',
  'ExpenseAccount',
  'ExpenseAccountEIP712',
  'CashRemunerationEIP712',
  'Campaign',
] as const;

export async function seedTeams(prisma: PrismaClient, config: SeedConfig, users: User[]) {
  console.log('\n🏢 Seeding teams...');

  const createdTeams = [];
  let totalMembers = 0;

  for (let i = 0; i < config.teams; i++) {
    const owner = users[i % users.length];
    const officerAddress = faker.finance.ethereumAddress();
    const teamCreatedAt = distributeDate(i, config.teams);

    // Select additional members (excluding owner)
    const memberCount = Math.min(config.membersPerTeam - 1, users.length - 1);
    const availableUsers = users.filter((u) => u.address !== owner.address);
    const selectedUsers = availableUsers.slice(0, memberCount);

    // All team members including owner
    const allMembers = [owner, ...selectedUsers];

    // Create team with owner, members, and contracts
    const team = await prisma.team.create({
      data: {
        name: faker.company.name(),
        description: faker.company.catchPhrase(),
        ownerAddress: owner.address,
        officerAddress: officerAddress,
        createdAt: teamCreatedAt,
        members: {
          connect: allMembers.map((user) => ({ address: user.address })),
        },
        teamContracts: {
          create: CONTRACT_TYPES.map((contractType) => ({
            type: contractType,
            address: faker.finance.ethereumAddress(),
            deployer: owner.address,
            createdAt: teamCreatedAt,
          })),
        },
      },
    });

    // Create MemberTeamsData records for tracking membership with specific timestamps
    for (let j = 0; j < allMembers.length; j++) {
      const memberCreatedAt =
        j === 0
          ? teamCreatedAt
          : new Date(teamCreatedAt.getTime() + Math.random() * 30 * 24 * 60 * 60 * 1000);

      await prisma.memberTeamsData.create({
        data: {
          teamId: team.id,
          memberAddress: allMembers[j].address,
          createdAt: memberCreatedAt,
        },
      });
      totalMembers++;
    }

    createdTeams.push(team);
  }

  console.log(`  ✓ Created ${createdTeams.length} teams with ${totalMembers} memberships`);
  return createdTeams;
}
