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

    // Create team with owner, members, current Officer, and memberships.
    // Contracts are created in a follow-up step so we can link them to both
    // the team (required FK) and the officer (so they surface via the
    // currentOfficerWithContractsInclude relation).
    const team = await prisma.team.create({
      data: {
        name: faker.company.name(),
        description: faker.company.catchPhrase(),
        ownerAddress: owner.address,
        createdAt: teamCreatedAt,
        members: {
          connect: allMembers.map((user) => ({ address: user.address })),
        },
        teamOfficers: {
          create: {
            address: officerAddress,
            deployer: owner.address,
            createdAt: teamCreatedAt,
          },
        },
        memberTeamsData: {
          create: allMembers.map((member, index) => ({
            memberAddress: member.address,
            createdAt:
              index === 0
                ? teamCreatedAt
                : faker.date.between({
                    from: teamCreatedAt,
                    to: new Date(),
                  }),
          })),
        },
      },
      include: { teamOfficers: true },
    });

    const officerId = team.teamOfficers[0].id;
    await prisma.teamContract.createMany({
      data: CONTRACT_TYPES.map((contractType) => ({
        type: contractType,
        address: faker.finance.ethereumAddress(),
        deployer: owner.address,
        teamId: team.id,
        officerId,
        createdAt: teamCreatedAt,
      })),
    });

    totalMembers += allMembers.length;
    createdTeams.push(team);
  }

  console.log(`  ✓ Created ${createdTeams.length} teams with ${totalMembers} memberships`);
  return createdTeams;
}
