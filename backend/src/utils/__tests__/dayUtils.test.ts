import { describe, expect, it } from 'vitest';
import { getMondayStart, todayMidnight } from '../dayUtils';

describe('dayUtils', () => {
  describe('getMondayStart', () => {
    it('should return the Monday of the current week for a Tuesday', () => {
      // Tuesday, January 9, 2024
      const tuesday = new Date('2024-01-09T15:30:00');
      const mondayStart = getMondayStart(tuesday);

      expect(mondayStart.getDay()).toBe(1); // Monday
      expect(mondayStart.getHours()).toBe(0);
      expect(mondayStart.getMinutes()).toBe(0);
      expect(mondayStart.getSeconds()).toBe(0);
      expect(mondayStart.getMilliseconds()).toBe(0);
      expect(mondayStart.toISOString().split('T')[0]).toBe('2024-01-08');
    });

    it('should return the same day at midnight if date is already Monday', () => {
      // Monday, January 8, 2024
      const monday = new Date('2024-01-08T15:30:00');
      const mondayStart = getMondayStart(monday);

      expect(mondayStart.getDay()).toBe(1); // Monday
      expect(mondayStart.getHours()).toBe(0);
      expect(mondayStart.toISOString().split('T')[0]).toBe('2024-01-08');
    });

    it('should go back to the previous Monday for a Sunday', () => {
      // Sunday, January 14, 2024
      const sunday = new Date('2024-01-14T15:30:00');
      const mondayStart = getMondayStart(sunday);

      expect(mondayStart.getDay()).toBe(1); // Monday
      expect(mondayStart.getHours()).toBe(0);
      expect(mondayStart.toISOString().split('T')[0]).toBe('2024-01-08');
    });

    it('should handle dates at the start of the year', () => {
      // Friday, January 5, 2024
      const friday = new Date('2024-01-05T10:00:00');
      const mondayStart = getMondayStart(friday);

      expect(mondayStart.getDay()).toBe(1); // Monday
      expect(mondayStart.toISOString().split('T')[0]).toBe('2024-01-01');
    });

    it('should handle dates at the end of the year', () => {
      // Saturday, December 30, 2023
      const saturday = new Date('2023-12-30T10:00:00');
      const mondayStart = getMondayStart(saturday);

      expect(mondayStart.getDay()).toBe(1); // Monday
      expect(mondayStart.toISOString().split('T')[0]).toBe('2023-12-25');
    });
  });

  describe('todayMidnight', () => {
    it('should return the same date at midnight', () => {
      const date = new Date('2024-01-15T15:30:45.123');
      const midnight = todayMidnight(date);

      expect(midnight.getFullYear()).toBe(2024);
      expect(midnight.getMonth()).toBe(0); // January
      expect(midnight.getDate()).toBe(15);
      expect(midnight.getHours()).toBe(0);
      expect(midnight.getMinutes()).toBe(0);
      expect(midnight.getSeconds()).toBe(0);
      expect(midnight.getMilliseconds()).toBe(0);
    });

    it('should handle dates already at midnight', () => {
      const date = new Date('2024-01-15T00:00:00.000');
      const midnight = todayMidnight(date);

      expect(midnight.getHours()).toBe(0);
      expect(midnight.getMinutes()).toBe(0);
      expect(midnight.getSeconds()).toBe(0);
      expect(midnight.getMilliseconds()).toBe(0);
    });

    it('should handle dates near midnight', () => {
      const lateNight = new Date('2024-01-15T23:59:59.999');
      const midnight = todayMidnight(lateNight);

      expect(midnight.getDate()).toBe(15);
      expect(midnight.getHours()).toBe(0);
      expect(midnight.getMinutes()).toBe(0);
      expect(midnight.getSeconds()).toBe(0);
      expect(midnight.getMilliseconds()).toBe(0);
    });

    it('should not modify the original date object', () => {
      const originalDate = new Date('2024-01-15T15:30:00');
      const originalTime = originalDate.getTime();

      todayMidnight(originalDate);

      expect(originalDate.getTime()).toBe(originalTime);
    });
  });
});
