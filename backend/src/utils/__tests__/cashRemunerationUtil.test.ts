import { describe, expect, it, vi, beforeEach } from 'vitest';
import { isCashRemunerationOwner } from '../cashRemunerationUtil';
import { prisma } from '../';
import publicClient from '../viem.config';

// Mock dependencies
vi.mock('../', async () => {
  const actual = await vi.importActual('../');
  return {
    ...actual,
    prisma: {
      teamContract: {
        findFirst: vi.fn(),
      },
    },
  };
});

vi.mock('../viem.config', () => ({
  default: {
    readContract: vi.fn(),
  },
}));

describe('[US-PAYROLL-008] Cash Remuneration ownership', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isCashRemunerationOwner', () => {
    it('returns true if user is the owner', async () => {
      const userAddress = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as `0x${string}`;
      const teamId = 1;

      vi.mocked(prisma.teamContract.findFirst).mockResolvedValue({
        id: 1,
        teamId,
        address: '0x1234567890123456789012345678901234567890',
        type: 'CashRemunerationEIP712',
        deployer: userAddress,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      vi.mocked(publicClient.readContract).mockResolvedValue(userAddress);

      const result = await isCashRemunerationOwner(userAddress, teamId);

      expect(result).toBe(true);
      expect(prisma.teamContract.findFirst).toHaveBeenCalledWith({
        where: {
          teamId,
          type: 'CashRemunerationEIP712',
          officer: { nextOfficer: { is: null } },
        },
      });
      expect(publicClient.readContract).toHaveBeenCalledWith({
        address: '0x1234567890123456789012345678901234567890',
        abi: expect.any(Array),
        functionName: 'owner',
      });
    });

    it('returns false if user is not the owner', async () => {
      const userAddress = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as `0x${string}`;
      const ownerAddress = '0x9999999999999999999999999999999999999999';
      const teamId = 1;

      vi.mocked(prisma.teamContract.findFirst).mockResolvedValue({
        id: 1,
        teamId,
        address: '0x1234567890123456789012345678901234567890',
        type: 'CashRemunerationEIP712',
        deployer: ownerAddress,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      vi.mocked(publicClient.readContract).mockResolvedValue(ownerAddress);

      const result = await isCashRemunerationOwner(userAddress, teamId);

      expect(result).toBe(false);
    });

    it('returns false for an invalid contract address', async () => {
      const userAddress = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as `0x${string}`;
      const teamId = 1;

      vi.mocked(prisma.teamContract.findFirst).mockResolvedValue({
        id: 1,
        teamId,
        address: 'invalid-address',
        type: 'CashRemunerationEIP712',
        deployer: userAddress,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(isCashRemunerationOwner(userAddress, teamId)).resolves.toBe(false);
      expect(publicClient.readContract).not.toHaveBeenCalled();
    });

    it('returns false if owner cannot be retrieved', async () => {
      const userAddress = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as `0x${string}`;
      const teamId = 1;

      vi.mocked(prisma.teamContract.findFirst).mockResolvedValue(null);

      const result = await isCashRemunerationOwner(userAddress, teamId);

      expect(result).toBe(false);
      expect(publicClient.readContract).not.toHaveBeenCalled();
    });

    it('returns false and logs an error when owner lookup fails', async () => {
      const userAddress = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as `0x${string}`;
      const teamId = 1;
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      vi.mocked(prisma.teamContract.findFirst).mockRejectedValue(new Error('Database error'));

      const result = await isCashRemunerationOwner(userAddress, teamId);

      expect(result).toBe(false);
      // The function calls getCashRemunerationOwner which logs the error
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error getting Cash Remuneration owner:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });
});
