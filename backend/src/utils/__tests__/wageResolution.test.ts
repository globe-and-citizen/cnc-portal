import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import utc from 'dayjs/plugin/utc';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  resolveWageForWeek,
  resolveCurrentWage,
  nextMondayUtc,
  isScheduledWage,
  weekHasClaims,
  effectiveFromForChange,
  membersWithClaimsThisWeek,
  pickWageForWeek,
  splitCurrentAndScheduled,
} from '../wageResolution';

dayjs.extend(utc);
dayjs.extend(isoWeek);

vi.mock('../dependenciesUtil', () => ({
  prisma: {
    wage: {
      findMany: vi.fn(),
    },
    weeklyClaim: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from '../dependenciesUtil';

const week = (iso: string) => dayjs.utc(iso).startOf('isoWeek').toDate();
const at = (iso: string) => new Date(iso);

describe('wageResolution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('resolveWageForWeek', () => {
    it('returns null when the member has no wage at all', async () => {
      vi.mocked(prisma.wage.findMany).mockResolvedValue([]);

      expect(await resolveWageForWeek(1, '0xabc', week('2026-08-12'))).toBeNull();
    });

    it('returns the only wage when the chain has a single link', async () => {
      const v1 = { id: 1, effectiveFrom: null, createdAt: at('2026-01-01T00:00:00Z') };
      vi.mocked(prisma.wage.findMany).mockResolvedValue([v1] as never);

      expect(await resolveWageForWeek(1, '0xabc', week('2026-08-12'))).toEqual(v1);
    });

    it('returns the old wage for a week that predates a scheduled change', async () => {
      // v2 takes effect Mon 17 Aug; the claim targets the week of Mon 10 Aug.
      const v1 = { id: 1, effectiveFrom: null, createdAt: at('2026-01-01T00:00:00Z') };
      const v2 = { id: 2, effectiveFrom: at('2026-08-17T00:00:00Z'), createdAt: at('2026-08-12') };
      vi.mocked(prisma.wage.findMany).mockResolvedValue([v1, v2] as never);

      expect(await resolveWageForWeek(1, '0xabc', week('2026-08-12'))).toEqual(v1);
    });

    it('returns the new wage once its effective week has started', async () => {
      const v1 = { id: 1, effectiveFrom: null, createdAt: at('2026-01-01T00:00:00Z') };
      const v2 = { id: 2, effectiveFrom: at('2026-08-17T00:00:00Z'), createdAt: at('2026-08-12') };
      vi.mocked(prisma.wage.findMany).mockResolvedValue([v1, v2] as never);

      expect(await resolveWageForWeek(1, '0xabc', week('2026-08-18'))).toEqual(v2);
    });

    it('picks the right link when several changes have happened', async () => {
      const v1 = { id: 1, effectiveFrom: null, createdAt: at('2026-01-01T00:00:00Z') };
      const v2 = { id: 2, effectiveFrom: at('2026-08-10T00:00:00Z'), createdAt: at('2026-08-05') };
      const v3 = { id: 3, effectiveFrom: at('2026-08-24T00:00:00Z'), createdAt: at('2026-08-19') };
      vi.mocked(prisma.wage.findMany).mockResolvedValue([v1, v2, v3] as never);

      // Backdating onto the week of Mon 10 Aug must land on v2, not v3.
      expect(await resolveWageForWeek(1, '0xabc', week('2026-08-12'))).toEqual(v2);
    });

    it('falls back to the earliest wage for a week before any wage existed', async () => {
      // Legacy rows carry createdAt only, which is a technical timestamp —
      // rejecting here would break historical weeks that were legitimately
      // claimed.
      const v1 = { id: 1, effectiveFrom: null, createdAt: at('2026-08-10T00:00:00Z') };
      vi.mocked(prisma.wage.findMany).mockResolvedValue([v1] as never);

      expect(await resolveWageForWeek(1, '0xabc', week('2026-07-01'))).toEqual(v1);
    });
  });

  describe('splitCurrentAndScheduled', () => {
    const now = at('2026-08-12T15:00:00Z'); // a Wednesday; week starts Mon 10 Aug

    it('reports no wage for an empty chain', () => {
      expect(splitCurrentAndScheduled([], now)).toEqual({ current: null, scheduled: null });
    });

    it('separates the wage in force from the change queued behind it', () => {
      const v1 = { id: 1, effectiveFrom: null, createdAt: at('2026-01-01T00:00:00Z') };
      const v2 = { id: 2, effectiveFrom: at('2026-08-17T00:00:00Z'), createdAt: at('2026-08-12') };

      expect(splitCurrentAndScheduled([v1, v2], now)).toEqual({ current: v1, scheduled: v2 });
    });

    it('reports nothing scheduled once the change has taken effect', () => {
      const v1 = { id: 1, effectiveFrom: null, createdAt: at('2026-01-01T00:00:00Z') };
      const v2 = { id: 2, effectiveFrom: at('2026-08-10T00:00:00Z'), createdAt: at('2026-08-05') };

      expect(splitCurrentAndScheduled([v1, v2], now)).toEqual({ current: v2, scheduled: null });
    });

    it('agrees with the claim engine on a legacy mid-week change', () => {
      // Rows predating `effectiveFrom` carry a mid-week `createdAt`. Reading the
      // chain's leaf would show v2 while claims for this week are still priced
      // on v1 — the screen and the server must not disagree.
      const v1 = { id: 1, effectiveFrom: null, createdAt: at('2026-01-01T00:00:00Z') };
      const v2 = { id: 2, effectiveFrom: null, createdAt: at('2026-08-12T09:00:00Z') };

      const { current } = splitCurrentAndScheduled([v1, v2], now);

      expect(current).toEqual(v1);
      expect(current).toEqual(pickWageForWeek([v1, v2], week('2026-08-12')));
    });
  });

  describe('resolveCurrentWage', () => {
    it('ignores a wage scheduled for a future week', async () => {
      const v1 = { id: 1, effectiveFrom: null, createdAt: at('2026-01-01T00:00:00Z') };
      const v2 = { id: 2, effectiveFrom: at('2026-08-17T00:00:00Z'), createdAt: at('2026-08-12') };
      vi.mocked(prisma.wage.findMany).mockResolvedValue([v1, v2] as never);

      expect(await resolveCurrentWage(1, '0xabc', at('2026-08-12T15:00:00Z'))).toEqual(v1);
    });
  });

  describe('nextMondayUtc', () => {
    it('returns the next Monday at 00:00 UTC', () => {
      const result = nextMondayUtc(at('2026-08-12T15:30:00.000Z')); // a Wednesday

      expect(result.toISOString()).toBe('2026-08-17T00:00:00.000Z');
    });

    it('returns the following Monday even when called on a Monday', () => {
      const result = nextMondayUtc(at('2026-08-17T10:00:00.000Z'));

      expect(result.toISOString()).toBe('2026-08-24T00:00:00.000Z');
    });
  });

  describe('isScheduledWage', () => {
    const now = at('2026-08-12T12:00:00Z');

    it('is false for a wage with no effectiveFrom', () => {
      expect(isScheduledWage({ effectiveFrom: null }, now)).toBe(false);
    });

    it('is false once effectiveFrom has passed', () => {
      expect(isScheduledWage({ effectiveFrom: at('2026-08-10T00:00:00Z') }, now)).toBe(false);
    });

    it('is true while effectiveFrom is still ahead', () => {
      expect(isScheduledWage({ effectiveFrom: at('2026-08-17T00:00:00Z') }, now)).toBe(true);
    });

    it('is false for a missing wage', () => {
      expect(isScheduledWage(null, now)).toBe(false);
    });
  });

  describe('weekHasClaims', () => {
    it('only counts weeks that hold claims', async () => {
      // A goals-only row must not count: nothing has been priced against it, so
      // a change still applies to that week.
      vi.mocked(prisma.weeklyClaim.count).mockResolvedValue(0);

      expect(await weekHasClaims(1, '0xabc', week('2026-08-12'))).toBe(false);
      expect(vi.mocked(prisma.weeklyClaim.count).mock.calls[0][0]).toMatchObject({
        where: { claims: { some: {} } },
      });
    });

    it('is true once the member has submitted hours', async () => {
      vi.mocked(prisma.weeklyClaim.count).mockResolvedValue(1);

      expect(await weekHasClaims(1, '0xabc', week('2026-08-12'))).toBe(true);
    });
  });

  describe('effectiveFromForChange', () => {
    // Wednesday.
    const now = at('2026-08-12T15:00:00.000Z');

    it('waits for next Monday when hours are already submitted', () => {
      expect(effectiveFromForChange(true, now).toISOString()).toBe('2026-08-17T00:00:00.000Z');
    });

    it('covers the current week whole when nothing is submitted yet', () => {
      // Not "now": resolution compares the effective date against the start of
      // the week, so a mid-week timestamp would skip the week it targets.
      expect(effectiveFromForChange(false, now).toISOString()).toBe('2026-08-10T00:00:00.000Z');
    });

    it('always lands on a Monday, so a wage boundary is always a week boundary', () => {
      expect(effectiveFromForChange(true, now).getUTCDay()).toBe(1);
      expect(effectiveFromForChange(false, now).getUTCDay()).toBe(1);
    });

    it('applies to the week just worked when saved on a Sunday', () => {
      const sunday = at('2026-08-16T22:00:00.000Z');

      expect(effectiveFromForChange(false, sunday).toISOString()).toBe('2026-08-10T00:00:00.000Z');
    });
  });

  describe('membersWithClaimsThisWeek', () => {
    it('returns the members who have submitted hours this week', async () => {
      vi.mocked(prisma.weeklyClaim.findMany).mockResolvedValue([
        { memberAddress: '0xabc' },
        { memberAddress: '0xdef' },
      ] as never);

      const members = await membersWithClaimsThisWeek(1, at('2026-08-12T15:00:00.000Z'));

      expect(members).toEqual(new Set(['0xabc', '0xdef']));
      expect(vi.mocked(prisma.weeklyClaim.findMany).mock.calls[0][0]).toMatchObject({
        where: { claims: { some: {} } },
      });
    });

    it('is empty when nobody has submitted anything', async () => {
      vi.mocked(prisma.weeklyClaim.findMany).mockResolvedValue([]);

      expect((await membersWithClaimsThisWeek(1)).size).toBe(0);
    });
  });
});
