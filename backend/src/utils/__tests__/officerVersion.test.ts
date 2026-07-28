import { describe, expect, it, vi } from 'vitest';
import {
  getActiveOfficerFolder,
  getActiveOfficerVersion,
  isActiveOfficerVersion,
  semverForVersionFolder,
} from '../officerVersion';

vi.mock('../viem.config', () => ({
  default: {
    chain: { id: 137 },
    readContract: vi.fn(),
    getStorageAt: vi.fn(),
  },
}));

describe('officerVersion', () => {
  describe('generation floors', () => {
    it('maps each registry folder to its on-chain floor', () => {
      expect(semverForVersionFolder('V0')).toBe('0.0.0');
      expect(semverForVersionFolder('V0.1')).toBe('0.1.0');
      expect(semverForVersionFolder('V1')).toBe('1.0.0');
      expect(semverForVersionFolder('V2')).toBe('2.0.0');
    });

    it('reports the active generation for the configured network', () => {
      expect(getActiveOfficerFolder()).toBe('V2');
      expect(getActiveOfficerVersion()).toBe('2.0.0');
    });
  });

  describe('isActiveOfficerVersion', () => {
    it('accepts the floor of the active generation', () => {
      expect(isActiveOfficerVersion('2.0.0')).toBe(true);
    });

    // The regression this range check exists for: an === '2.0.0' comparison
    // reported every team on a point release as not migrated.
    it('accepts point releases inside the active generation', () => {
      expect(isActiveOfficerVersion('2.0.1')).toBe(true);
      expect(isActiveOfficerVersion('2.1.0')).toBe(true);
      expect(isActiveOfficerVersion('2.14.3')).toBe(true);
      expect(isActiveOfficerVersion('2.999.999')).toBe(true);
    });

    it('rejects generations below the active one', () => {
      expect(isActiveOfficerVersion('1.0.0')).toBe(false);
      expect(isActiveOfficerVersion('1.999.999')).toBe(false);
      expect(isActiveOfficerVersion('0.1.0')).toBe(false);
      expect(isActiveOfficerVersion('0.0.0')).toBe(false);
    });

    it('rejects a generation above the active one', () => {
      expect(isActiveOfficerVersion('3.0.0')).toBe(false);
    });

    it('rejects every legacy tag vocabulary', () => {
      expect(isActiveOfficerVersion('legacy')).toBe(false);
      expect(isActiveOfficerVersion('v0.10')).toBe(false);
      expect(isActiveOfficerVersion('V2')).toBe(false);
      expect(isActiveOfficerVersion('unknown')).toBe(false);
      expect(isActiveOfficerVersion('2.0.0-beta')).toBe(false);
    });

    it('rejects a missing version', () => {
      expect(isActiveOfficerVersion(null)).toBe(false);
      expect(isActiveOfficerVersion(undefined)).toBe(false);
      expect(isActiveOfficerVersion('')).toBe(false);
    });

    it('tolerates a short semver by padding the missing parts', () => {
      expect(isActiveOfficerVersion('2')).toBe(true);
      expect(isActiveOfficerVersion('2.1')).toBe(true);
      expect(isActiveOfficerVersion('1.9')).toBe(false);
    });

    it('returns false for a network with no active generation configured', () => {
      expect(isActiveOfficerVersion('2.0.0', 999)).toBe(false);
    });
  });
});
