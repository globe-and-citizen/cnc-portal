import { TeamOfficer } from '@prisma/client';
import express, { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import officerVersionRoutes from '../../routes/officerVersionRoutes';
import { prisma } from '../../utils';
import publicClient from '../../utils/viem.config';

vi.mock('../../utils', async () => {
  const actual = await vi.importActual('../../utils');
  return {
    ...actual,
    prisma: {
      teamOfficer: {
        findMany: vi.fn(),
        updateMany: vi.fn(),
      },
    },
  };
});

vi.mock('../../utils/viem.config', () => ({
  default: {
    chain: { id: 137 },
    readContract: vi.fn(),
    getStorageAt: vi.fn(),
  },
}));

const app = express();
app.use(express.json());
app.use((req: Request, res: Response, next: NextFunction) => {
  req.address = '0x1234567890123456789012345678901234567890';
  next();
});
app.use('/', officerVersionRoutes);

// Polygon Officer#FactoryBeacon addresses, per contract/versions/<V>/deployed_addresses.
const V1_BEACON = '0x91EBBe1BD92A5c22B1Fd2CB2BDd19E774834F1dE';
const V2_BEACON = '0xF4265dC2236012C2Fd5bC771D0f6c3f30D210FFc';

// A beacon address as it comes out of the ERC-1967 storage slot: left-padded to
// a full 32-byte word.
const asStorageWord = (address: string) => `0x${address.slice(2).toLowerCase().padStart(64, '0')}`;

type OfficerRow = TeamOfficer & {
  team: { name: string };
  nextOfficer: { id: number } | null;
};

const buildOfficer = (overrides: Partial<OfficerRow> = {}): OfficerRow =>
  ({
    id: 1,
    address: '0x1111111111111111111111111111111111111111',
    teamId: 1,
    deployer: '0x1234567890123456789012345678901234567890',
    deployBlockNumber: null,
    deployedAt: null,
    previousOfficerId: null,
    version: 'legacy',
    createdAt: new Date(),
    updatedAt: new Date(),
    team: { name: 'Team A' },
    nextOfficer: null,
    ...overrides,
  }) as OfficerRow;

const syncRequest = (body: Record<string, unknown> = {}) =>
  request(app).post('/sync').send(body).expect(200);

describe('officerVersionController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.teamOfficer.updateMany).mockResolvedValue({ count: 0 });
    // Default: nothing on-chain answers, so every Officer is unresolved unless
    // a test says otherwise.
    vi.mocked(publicClient.readContract).mockRejectedValue(new Error('no version()'));
    vi.mocked(publicClient.getStorageAt).mockResolvedValue(undefined);
  });

  it('writes the on-chain version() when the Officer exposes one', async () => {
    vi.mocked(prisma.teamOfficer.findMany).mockResolvedValue([buildOfficer()]);
    vi.mocked(publicClient.readContract).mockResolvedValue('2.0.0');

    const response = await syncRequest();

    expect(response.body).toMatchObject({ scanned: 1, updated: 1, unchanged: 0, unresolved: 0 });
    expect(response.body.results[0]).toMatchObject({
      from: 'legacy',
      to: '2.0.0',
      source: 'onchain',
      status: 'updated',
    });
    expect(prisma.teamOfficer.updateMany).toHaveBeenCalledWith({
      where: { id: { in: [1] } },
      data: { version: '2.0.0' },
    });
  });

  it('falls back to the ERC-1967 beacon for Officers predating version()', async () => {
    vi.mocked(prisma.teamOfficer.findMany).mockResolvedValue([buildOfficer()]);
    vi.mocked(publicClient.getStorageAt).mockResolvedValue(asStorageWord(V1_BEACON));

    const response = await syncRequest();

    expect(response.body.results[0]).toMatchObject({
      to: '1.0.0',
      source: 'beacon',
      status: 'updated',
    });
    expect(prisma.teamOfficer.updateMany).toHaveBeenCalledWith({
      where: { id: { in: [1] } },
      data: { version: '1.0.0' },
    });
  });

  it('leaves an Officer untouched when its generation cannot be resolved', async () => {
    vi.mocked(prisma.teamOfficer.findMany).mockResolvedValue([buildOfficer({ version: 'v0.10' })]);

    const response = await syncRequest();

    expect(response.body).toMatchObject({ scanned: 1, updated: 0, unresolved: 1 });
    expect(response.body.results[0]).toMatchObject({
      from: 'v0.10',
      to: null,
      source: null,
      status: 'unresolved',
    });
    expect(prisma.teamOfficer.updateMany).not.toHaveBeenCalled();
  });

  it('reports an already-aligned Officer as unchanged', async () => {
    vi.mocked(prisma.teamOfficer.findMany).mockResolvedValue([buildOfficer({ version: '2.0.0' })]);
    vi.mocked(publicClient.readContract).mockResolvedValue('2.0.0');

    const response = await syncRequest();

    expect(response.body).toMatchObject({ scanned: 1, updated: 0, unchanged: 1, unresolved: 0 });
    expect(response.body.results[0].status).toBe('unchanged');
    expect(prisma.teamOfficer.updateMany).not.toHaveBeenCalled();
  });

  it('writes nothing on a dry run but still reports the plan', async () => {
    vi.mocked(prisma.teamOfficer.findMany).mockResolvedValue([buildOfficer()]);
    vi.mocked(publicClient.readContract).mockResolvedValue('2.0.0');

    const response = await syncRequest({ dryRun: true });

    expect(response.body).toMatchObject({ dryRun: true, updated: 1 });
    expect(prisma.teamOfficer.updateMany).not.toHaveBeenCalled();
  });

  it('groups the writes by target version rather than one per Officer', async () => {
    vi.mocked(prisma.teamOfficer.findMany).mockResolvedValue([
      buildOfficer({ id: 1, address: '0xaaa1' }),
      buildOfficer({ id: 2, address: '0xaaa2' }),
      buildOfficer({ id: 3, address: '0xaaa3' }),
    ]);
    vi.mocked(publicClient.getStorageAt).mockImplementation(async ({ address }) =>
      address === '0xaaa3' ? asStorageWord(V2_BEACON) : asStorageWord(V1_BEACON)
    );

    const response = await syncRequest();

    expect(response.body).toMatchObject({ scanned: 3, updated: 3 });
    expect(prisma.teamOfficer.updateMany).toHaveBeenCalledTimes(2);
    expect(prisma.teamOfficer.updateMany).toHaveBeenCalledWith({
      where: { id: { in: [1, 2] } },
      data: { version: '1.0.0' },
    });
    expect(prisma.teamOfficer.updateMany).toHaveBeenCalledWith({
      where: { id: { in: [3] } },
      data: { version: '2.0.0' },
    });
  });

  it('flags the current Officer of each team', async () => {
    vi.mocked(prisma.teamOfficer.findMany).mockResolvedValue([
      buildOfficer({ id: 1, nextOfficer: { id: 2 } }),
      buildOfficer({ id: 2, nextOfficer: null }),
    ]);

    const response = await syncRequest();

    expect(response.body.results.map((r: { isCurrent: boolean }) => r.isCurrent)).toEqual([
      false,
      true,
    ]);
  });

  it('returns 500 when the officer lookup fails', async () => {
    vi.mocked(prisma.teamOfficer.findMany).mockRejectedValue(new Error('db down'));

    await request(app).post('/sync').send({}).expect(500);
  });
});
