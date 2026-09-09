import { describe, expect, it, vi } from 'vitest';
import { generateUniqueSlug } from '../slug.util';

describe('generateUniqueSlug', () => {
  it.each([
    ['Acme Corp', 'acme-corp'],
    ['Acme   Corp!!! & Co', 'acme-corp-co'],
    ['  --Hello World--  ', 'hello-world'],
    ['Team 42', 'team-42'],
    ['Café Déjà', 'caf-d-j'],
    ['!!!', 'team'],
    ['   ', 'team'],
    ['', 'team'],
  ])('normalizes %j before checking uniqueness', async (input, expected) => {
    const exists = vi.fn().mockResolvedValue(false);

    await expect(generateUniqueSlug(input, exists)).resolves.toBe(expected);
    expect(exists).toHaveBeenCalledWith(expected);
    expect(expected).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  });

  it('returns the base slug when it is free', async () => {
    const exists = vi.fn().mockResolvedValue(false);
    await expect(generateUniqueSlug('Acme Corp', exists)).resolves.toBe('acme-corp');
    expect(exists).toHaveBeenCalledWith('acme-corp');
    expect(exists).toHaveBeenCalledTimes(1);
  });

  it('appends -2 on the first collision', async () => {
    const exists = vi.fn(async (slug: string) => slug === 'acme-corp');
    await expect(generateUniqueSlug('Acme Corp', exists)).resolves.toBe('acme-corp-2');
  });

  it('keeps incrementing until a free slug is found', async () => {
    const taken = new Set(['acme-corp', 'acme-corp-2', 'acme-corp-3']);
    const exists = vi.fn(async (slug: string) => taken.has(slug));
    await expect(generateUniqueSlug('Acme Corp', exists)).resolves.toBe('acme-corp-4');
  });

  it('slugifies the base before checking', async () => {
    const exists = vi.fn().mockResolvedValue(false);
    await expect(generateUniqueSlug('  Weird Name!! ', exists)).resolves.toBe('weird-name');
    expect(exists).toHaveBeenCalledWith('weird-name');
  });
});
