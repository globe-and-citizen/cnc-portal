import { randomBytes } from 'node:crypto';
import express, { Request } from 'express';
import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import teamRoutes from '../../routes/teamRoutes';
import { prisma } from '../../utils';

describe('[AC-US-COMPANIES-008-02] team deletion cascades', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('removes populated membership, Officer, and contract records through the deletion route', async () => {
    if (process.env.CNC_E2E_DISPOSABLE_DATABASE !== '1') {
      throw new Error('This test requires an explicitly disposable database');
    }

    const suffix = randomBytes(20).toString('hex');
    const ownerAddress = `0x${suffix}` as const;
    const officerAddress = `0x${randomBytes(20).toString('hex')}`;
    const contractAddress = `0x${randomBytes(20).toString('hex')}`;
    let teamId: number | undefined;

    const app = express();
    app.use((req: Request, _res, next) => {
      req.address = ownerAddress;
      next();
    });
    app.use('/teams', teamRoutes);

    try {
      await prisma.user.create({ data: { address: ownerAddress, nonce: 'e2e' } });
      const team = await prisma.team.create({
        data: {
          name: 'Cascade E2E Company',
          slug: `cascade-e2e-${suffix}`,
          owner: { connect: { address: ownerAddress } },
          members: { connect: { address: ownerAddress } },
          memberTeamsData: { create: { memberAddress: ownerAddress } },
        },
      });
      teamId = team.id;
      const officer = await prisma.teamOfficer.create({
        data: { address: officerAddress, deployer: ownerAddress, teamId },
      });
      await prisma.teamContract.create({
        data: {
          address: contractAddress,
          type: 'Investor',
          deployer: ownerAddress,
          teamId,
          officerId: officer.id,
        },
      });

      expect(await prisma.memberTeamsData.count({ where: { teamId } })).toBe(1);
      expect(await prisma.teamOfficer.count({ where: { teamId } })).toBe(1);
      expect(await prisma.teamContract.count({ where: { teamId } })).toBe(1);

      const response = await request(app).delete(`/teams/${teamId}`);
      expect(response.status).toBe(204);
      expect(await prisma.team.findUnique({ where: { id: teamId } })).toBeNull();
      expect(await prisma.memberTeamsData.count({ where: { teamId } })).toBe(0);
      expect(await prisma.teamOfficer.count({ where: { teamId } })).toBe(0);
      expect(await prisma.teamContract.count({ where: { teamId } })).toBe(0);
    } finally {
      if (teamId !== undefined) {
        await prisma.team.deleteMany({ where: { id: teamId } });
      }
      await prisma.user.deleteMany({ where: { address: ownerAddress } });
    }
  });
});
