import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import featureRoutes from '../featureRoutes';
import * as featureUtils from '../../utils/featureUtils';

vi.mock('../../utils/featureUtils', () => ({
  featureExists: vi.fn(),
  teamExists: vi.fn(),
  overrideExists: vi.fn(),
  patchOverride: vi.fn(),
  removeOverrideRecord: vi.fn(),
  findAllFeatures: vi.fn(),
  findFeatureByName: vi.fn(),
  getEffectiveStatus: vi.fn(),
  insertFeature: vi.fn(),
  insertOverride: vi.fn(),
  patchFeature: vi.fn(),
  removeFeature: vi.fn(),
}));

const app = express();
app.use(express.json());
app.use('/', featureRoutes);

describe('feature team route parameters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(featureUtils.featureExists).mockResolvedValue(true);
    vi.mocked(featureUtils.teamExists).mockResolvedValue(true);
    vi.mocked(featureUtils.overrideExists).mockResolvedValue(true);
  });

  it('passes the validated numeric team ID to the update operation', async () => {
    vi.mocked(featureUtils.patchOverride).mockResolvedValue({} as never);
    const response = await request(app)
      .put('/SUBMIT_RESTRICTION/teams/12')
      .send({ status: 'enabled' });
    expect(response.status).toBe(200);
    expect(featureUtils.patchOverride).toHaveBeenCalledWith('SUBMIT_RESTRICTION', 12, 'enabled');
  });

  it('passes the validated numeric team ID to the delete operation', async () => {
    vi.mocked(featureUtils.removeOverrideRecord).mockResolvedValue(true as never);
    const response = await request(app).delete('/SUBMIT_RESTRICTION/teams/12');
    expect(response.status).toBe(204);
    expect(featureUtils.removeOverrideRecord).toHaveBeenCalledWith('SUBMIT_RESTRICTION', 12);
  });
});
