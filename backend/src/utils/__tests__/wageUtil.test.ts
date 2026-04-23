import { describe, expect, it } from 'vitest';
import { formatMinutesAsDuration } from '../wageUtil';

describe('wageUtil', () => {
  it('formats durations for hour-only, minute-only and mixed values', () => {
    expect(formatMinutesAsDuration(120)).toBe('2h');
    expect(formatMinutesAsDuration(45)).toBe('45min');
    expect(formatMinutesAsDuration(125)).toBe('2h 5min');
  });
});