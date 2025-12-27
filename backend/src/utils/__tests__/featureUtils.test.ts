import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prisma } from '../dependenciesUtil';
import {
  findAllFeatures,
  findFeatureByName,
  insertFeature,
  patchFeature,
  removeFeature,
  featureExists,
  teamExists,
  overrideExists,
  insertOverride,
  patchOverride,
  removeOverrideRecord,
  getEffectiveStatus,
} from '../featureUtils';
import type { FeatureStatus } from '../../validation/featureValidation';

vi.mock('../dependenciesUtil', () => ({
  prisma: {
    globalSetting: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    team: {
      findUnique: vi.fn(),
    },
    teamFunctionOverride: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

describe('featureUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('findAllFeatures', () => {
    it('should return all features with overrides count', async () => {
      const mockFeatures = [
        {
          id: 1,
          functionName: 'SUBMIT_RESTRICTION',
          status: 'ENABLED',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
          teamFunctionOverrides: [{ id: 1 }, { id: 2 }],
        },
        {
          id: 2,
          functionName: 'WITHDRAW_FEE',
          status: 'DISABLED',
          createdAt: new Date('2024-01-02'),
          updatedAt: new Date('2024-01-02'),
          teamFunctionOverrides: [{ id: 3 }],
        },
      ];

      vi.mocked(prisma.globalSetting.findMany).mockResolvedValue(mockFeatures);

      const result = await findAllFeatures();

      expect(prisma.globalSetting.findMany).toHaveBeenCalledWith({
        orderBy: { functionName: 'asc' },
        include: {
          teamFunctionOverrides: {
            select: { id: true },
          },
        },
      });
      expect(result).toEqual([
        { ...mockFeatures[0], overridesCount: 2 },
        { ...mockFeatures[1], overridesCount: 1 },
      ]);
    });

    it('should return empty array when no features exist', async () => {
      vi.mocked(prisma.globalSetting.findMany).mockResolvedValue([]);

      const result = await findAllFeatures();

      expect(result).toEqual([]);
    });
  });

  describe('findFeatureByName', () => {
    it('should return feature with team overrides when feature exists', async () => {
      const mockFeature = {
        id: 1,
        functionName: 'SUBMIT_RESTRICTION',
        status: 'ENABLED',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        teamFunctionOverrides: [
          {
            id: 1,
            teamId: 100,
            functionName: 'SUBMIT_RESTRICTION',
            status: 'DISABLED',
            createdAt: new Date('2024-01-02'),
            updatedAt: new Date('2024-01-02'),
            team: { id: 100, name: 'Team Alpha' },
          },
        ],
      };

      vi.mocked(prisma.globalSetting.findUnique).mockResolvedValue(mockFeature);

      const result = await findFeatureByName('SUBMIT_RESTRICTION');

      expect(prisma.globalSetting.findUnique).toHaveBeenCalledWith({
        where: { functionName: 'SUBMIT_RESTRICTION' },
        include: {
          teamFunctionOverrides: {
            include: {
              team: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      expect(result).toEqual({
        id: 1,
        functionName: 'SUBMIT_RESTRICTION',
        status: 'ENABLED',
        createdAt: mockFeature.createdAt,
        updatedAt: mockFeature.updatedAt,
        teamFunctionOverrides: [
          {
            id: 1,
            teamId: 100,
            functionName: 'SUBMIT_RESTRICTION',
            status: 'DISABLED',
            createdAt: mockFeature.teamFunctionOverrides[0].createdAt,
            updatedAt: mockFeature.teamFunctionOverrides[0].updatedAt,
            team: { id: 100, name: 'Team Alpha' },
          },
        ],
      });
    });

    it('should return null when feature does not exist', async () => {
      vi.mocked(prisma.globalSetting.findUnique).mockResolvedValue(null);

      const result = await findFeatureByName('NON_EXISTENT_FEATURE');

      expect(result).toBeNull();
    });
  });

  describe('insertFeature', () => {
    it('should create a new feature with specified status', async () => {
      const mockFeature = {
        id: 1,
        functionName: 'NEW_FEATURE',
        status: 'ENABLED' as FeatureStatus,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      vi.mocked(prisma.globalSetting.create).mockResolvedValue(mockFeature);

      const result = await insertFeature('NEW_FEATURE', 'ENABLED');

      expect(prisma.globalSetting.create).toHaveBeenCalledWith({
        data: {
          functionName: 'NEW_FEATURE',
          status: 'ENABLED',
        },
      });
      expect(result).toEqual(mockFeature);
    });

    it('should create a disabled feature', async () => {
      const mockFeature = {
        id: 2,
        functionName: 'DISABLED_FEATURE',
        status: 'DISABLED' as FeatureStatus,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      vi.mocked(prisma.globalSetting.create).mockResolvedValue(mockFeature);

      const result = await insertFeature('DISABLED_FEATURE', 'DISABLED');

      expect(result.status).toBe('DISABLED');
    });
  });

  describe('patchFeature', () => {
    it('should update feature status', async () => {
      const mockUpdatedFeature = {
        id: 1,
        functionName: 'SUBMIT_RESTRICTION',
        status: 'DISABLED' as FeatureStatus,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-15'),
      };

      vi.mocked(prisma.globalSetting.update).mockResolvedValue(mockUpdatedFeature);

      const result = await patchFeature('SUBMIT_RESTRICTION', 'DISABLED');

      expect(prisma.globalSetting.update).toHaveBeenCalledWith({
        where: { functionName: 'SUBMIT_RESTRICTION' },
        data: { status: 'DISABLED' },
      });
      expect(result).toEqual(mockUpdatedFeature);
    });

    it('should handle status change from DISABLED to ENABLED', async () => {
      const mockUpdatedFeature = {
        id: 2,
        functionName: 'WITHDRAW_FEE',
        status: 'ENABLED' as FeatureStatus,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-15'),
      };

      vi.mocked(prisma.globalSetting.update).mockResolvedValue(mockUpdatedFeature);

      const result = await patchFeature('WITHDRAW_FEE', 'ENABLED');

      expect(result.status).toBe('ENABLED');
    });
  });

  describe('removeFeature', () => {
    it('should delete feature and its overrides, returning true on success', async () => {
      vi.mocked(prisma.teamFunctionOverride.deleteMany).mockResolvedValue({ count: 2 });
      vi.mocked(prisma.globalSetting.delete).mockResolvedValue({
        id: 1,
        functionName: 'SUBMIT_RESTRICTION',
        status: 'ENABLED',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await removeFeature('SUBMIT_RESTRICTION');

      expect(prisma.teamFunctionOverride.deleteMany).toHaveBeenCalledWith({
        where: { functionName: 'SUBMIT_RESTRICTION' },
      });
      expect(prisma.globalSetting.delete).toHaveBeenCalledWith({
        where: { functionName: 'SUBMIT_RESTRICTION' },
      });
      expect(result).toBe(true);
    });

    it('should return false when deletion fails', async () => {
      vi.mocked(prisma.teamFunctionOverride.deleteMany).mockRejectedValue(
        new Error('Database error')
      );

      const result = await removeFeature('NON_EXISTENT_FEATURE');

      expect(result).toBe(false);
    });

    it('should delete overrides even if there are none', async () => {
      vi.mocked(prisma.teamFunctionOverride.deleteMany).mockResolvedValue({ count: 0 });
      vi.mocked(prisma.globalSetting.delete).mockResolvedValue({
        id: 1,
        functionName: 'FEATURE_WITHOUT_OVERRIDES',
        status: 'ENABLED',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await removeFeature('FEATURE_WITHOUT_OVERRIDES');

      expect(result).toBe(true);
    });
  });

  describe('featureExists', () => {
    it('should return true when feature exists', async () => {
      vi.mocked(prisma.globalSetting.findUnique).mockResolvedValue({
        functionName: 'SUBMIT_RESTRICTION',
      });

      const result = await featureExists('SUBMIT_RESTRICTION');

      expect(prisma.globalSetting.findUnique).toHaveBeenCalledWith({
        where: { functionName: 'SUBMIT_RESTRICTION' },
        select: { functionName: true },
      });
      expect(result).toBe(true);
    });

    it('should return false when feature does not exist', async () => {
      vi.mocked(prisma.globalSetting.findUnique).mockResolvedValue(null);

      const result = await featureExists('NON_EXISTENT_FEATURE');

      expect(result).toBe(false);
    });
  });

  describe('teamExists', () => {
    it('should return true when team exists', async () => {
      vi.mocked(prisma.team.findUnique).mockResolvedValue({ id: 100 });

      const result = await teamExists(100);

      expect(prisma.team.findUnique).toHaveBeenCalledWith({
        where: { id: 100 },
        select: { id: true },
      });
      expect(result).toBe(true);
    });

    it('should return false when team does not exist', async () => {
      vi.mocked(prisma.team.findUnique).mockResolvedValue(null);

      const result = await teamExists(999);

      expect(result).toBe(false);
    });
  });

  describe('overrideExists', () => {
    it('should return true when override exists for team and function', async () => {
      vi.mocked(prisma.teamFunctionOverride.findUnique).mockResolvedValue({ id: 1 });

      const result = await overrideExists('SUBMIT_RESTRICTION', 100);

      expect(prisma.teamFunctionOverride.findUnique).toHaveBeenCalledWith({
        where: { unique_team_function: { teamId: 100, functionName: 'SUBMIT_RESTRICTION' } },
        select: { id: true },
      });
      expect(result).toBe(true);
    });

    it('should return false when override does not exist', async () => {
      vi.mocked(prisma.teamFunctionOverride.findUnique).mockResolvedValue(null);

      const result = await overrideExists('SUBMIT_RESTRICTION', 999);

      expect(result).toBe(false);
    });
  });

  describe('insertOverride', () => {
    it('should create a new team override', async () => {
      const mockOverride = {
        id: 1,
        teamId: 100,
        functionName: 'SUBMIT_RESTRICTION',
        status: 'DISABLED' as FeatureStatus,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        team: { id: 100, name: 'Team Alpha' },
      };

      vi.mocked(prisma.teamFunctionOverride.create).mockResolvedValue(mockOverride);

      const result = await insertOverride('SUBMIT_RESTRICTION', 100, 'DISABLED');

      expect(prisma.teamFunctionOverride.create).toHaveBeenCalledWith({
        data: { functionName: 'SUBMIT_RESTRICTION', teamId: 100, status: 'DISABLED' },
        include: { team: { select: { id: true, name: true } } },
      });
      expect(result).toEqual(mockOverride);
    });

    it('should create an enabled override', async () => {
      const mockOverride = {
        id: 2,
        teamId: 200,
        functionName: 'WITHDRAW_FEE',
        status: 'ENABLED' as FeatureStatus,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        team: { id: 200, name: 'Team Beta' },
      };

      vi.mocked(prisma.teamFunctionOverride.create).mockResolvedValue(mockOverride);

      const result = await insertOverride('WITHDRAW_FEE', 200, 'ENABLED');

      expect(result.status).toBe('ENABLED');
      expect(result.team.name).toBe('Team Beta');
    });
  });

  describe('patchOverride', () => {
    it('should update an existing override status', async () => {
      const mockUpdatedOverride = {
        id: 1,
        teamId: 100,
        functionName: 'SUBMIT_RESTRICTION',
        status: 'ENABLED' as FeatureStatus,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-15'),
        team: { id: 100, name: 'Team Alpha' },
      };

      vi.mocked(prisma.teamFunctionOverride.update).mockResolvedValue(mockUpdatedOverride);

      const result = await patchOverride('SUBMIT_RESTRICTION', 100, 'ENABLED');

      expect(prisma.teamFunctionOverride.update).toHaveBeenCalledWith({
        where: { unique_team_function: { teamId: 100, functionName: 'SUBMIT_RESTRICTION' } },
        data: { status: 'ENABLED' },
        include: { team: { select: { id: true, name: true } } },
      });
      expect(result).toEqual(mockUpdatedOverride);
    });

    it('should handle status change from ENABLED to DISABLED', async () => {
      const mockUpdatedOverride = {
        id: 2,
        teamId: 200,
        functionName: 'WITHDRAW_FEE',
        status: 'DISABLED' as FeatureStatus,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-15'),
        team: { id: 200, name: 'Team Beta' },
      };

      vi.mocked(prisma.teamFunctionOverride.update).mockResolvedValue(mockUpdatedOverride);

      const result = await patchOverride('WITHDRAW_FEE', 200, 'DISABLED');

      expect(result.status).toBe('DISABLED');
    });
  });

  describe('removeOverrideRecord', () => {
    it('should delete override and return true on success', async () => {
      vi.mocked(prisma.teamFunctionOverride.delete).mockResolvedValue({
        id: 1,
        teamId: 100,
        functionName: 'SUBMIT_RESTRICTION',
        status: 'DISABLED',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await removeOverrideRecord('SUBMIT_RESTRICTION', 100);

      expect(prisma.teamFunctionOverride.delete).toHaveBeenCalledWith({
        where: { unique_team_function: { teamId: 100, functionName: 'SUBMIT_RESTRICTION' } },
      });
      expect(result).toBe(true);
    });

    it('should return false when deletion fails', async () => {
      vi.mocked(prisma.teamFunctionOverride.delete).mockRejectedValue(new Error('Not found'));

      const result = await removeOverrideRecord('NON_EXISTENT', 999);

      expect(result).toBe(false);
    });
  });

  describe('getEffectiveStatus', () => {
    it('should return override status when override exists', async () => {
      vi.mocked(prisma.teamFunctionOverride.findUnique).mockResolvedValue({
        status: 'DISABLED' as FeatureStatus,
      });

      const result = await getEffectiveStatus('SUBMIT_RESTRICTION', 100);

      expect(prisma.teamFunctionOverride.findUnique).toHaveBeenCalledWith({
        where: { unique_team_function: { teamId: 100, functionName: 'SUBMIT_RESTRICTION' } },
        select: { status: true },
      });
      expect(result).toBe('DISABLED');
    });

    it('should return global status when no override exists', async () => {
      vi.mocked(prisma.teamFunctionOverride.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.globalSetting.findUnique).mockResolvedValue({
        status: 'ENABLED' as FeatureStatus,
      });

      const result = await getEffectiveStatus('SUBMIT_RESTRICTION', 100);

      expect(prisma.teamFunctionOverride.findUnique).toHaveBeenCalled();
      expect(prisma.globalSetting.findUnique).toHaveBeenCalledWith({
        where: { functionName: 'SUBMIT_RESTRICTION' },
        select: { status: true },
      });
      expect(result).toBe('ENABLED');
    });

    it('should return null when neither override nor global setting exists', async () => {
      vi.mocked(prisma.teamFunctionOverride.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.globalSetting.findUnique).mockResolvedValue(null);

      const result = await getEffectiveStatus('NON_EXISTENT_FEATURE', 100);

      expect(result).toBeNull();
    });

    it('should prioritize override over global setting', async () => {
      vi.mocked(prisma.teamFunctionOverride.findUnique).mockResolvedValue({
        status: 'DISABLED' as FeatureStatus,
      });
      vi.mocked(prisma.globalSetting.findUnique).mockResolvedValue({
        status: 'ENABLED' as FeatureStatus,
      });

      const result = await getEffectiveStatus('SUBMIT_RESTRICTION', 100);

      expect(result).toBe('DISABLED');
      // Global setting should not even be queried when override exists
      expect(prisma.globalSetting.findUnique).not.toHaveBeenCalled();
    });
  });
});
