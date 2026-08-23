import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveCurrentWage } from '../wageResolution';

vi.mock('../dependenciesUtil', () => ({
  prisma: {
    wage: {
      findFirst: vi.fn(),
    },
  },
}));

import { prisma } from '../dependenciesUtil';

describe('resolveCurrentWage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the current leaf of the member wage chain', async () => {
    const currentWage = { id: 7, teamId: 1, userAddress: '0xabc', nextWageId: null };
    vi.mocked(prisma.wage.findFirst).mockResolvedValue(currentWage as never);

    await expect(resolveCurrentWage(1, '0xabc')).resolves.toEqual(currentWage);
    expect(prisma.wage.findFirst).toHaveBeenCalledWith({
      where: { teamId: 1, userAddress: '0xabc', nextWageId: null },
    });
  });

  it('returns null when the member has no current wage', async () => {
    vi.mocked(prisma.wage.findFirst).mockResolvedValue(null);

    await expect(resolveCurrentWage(1, '0xabc')).resolves.toBeNull();
  });
});
