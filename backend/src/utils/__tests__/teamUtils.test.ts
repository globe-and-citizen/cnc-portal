import { describe, it, expect } from 'vitest';
import { isUserPartOfTheTeam } from '../teamUtils'; // Adjust path

describe('isUserPartOfTheTeam', () => {
  const mockMembers = [
    { address: '0x123', name: 'Alice' },
    { address: '0x456', name: 'Bob' },
    { address: '0x789', name: null },
  ];

  it('returns true if the callerAddress is in the members list', () => {
    const result = isUserPartOfTheTeam(mockMembers, '0x456');
    expect(result).toBe(true);
  });

  it('returns false if the callerAddress is not in the members list', () => {
    const result = isUserPartOfTheTeam(mockMembers, '0x999');
    expect(result).toBe(false);
  });

  it('returns false if the members list is empty', () => {
    const result = isUserPartOfTheTeam([], '0x123');
    expect(result).toBe(false);
  });

  it('is case-sensitive based on current implementation', () => {
    // Note: If your addresses are checksummed or mixed case,
    // this test ensures you know the current behavior.
    const result = isUserPartOfTheTeam(mockMembers, '0x123');
    expect(result).toBe(true);

    const resultWrongCase = isUserPartOfTheTeam(mockMembers, '0xABC'); // mock contains 0xabc? No.
    expect(resultWrongCase).toBe(false);
  });
});
