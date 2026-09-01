import { describe, expect, it, vi } from 'vitest';
import { generateUniqueSlug, slugify } from '../slug.util';

describe('slugify', () => {
  it('lowercases and hyphenates words', () => {
    expect(slugify('Acme Corp')).toBe('acme-corp');
  });

  it('collapses runs of non-alphanumerics into a single hyphen', () => {
    expect(slugify('Acme   Corp!!! & Co')).toBe('acme-corp-co');
  });

  it('trims leading and trailing hyphens', () => {
    expect(slugify('  --Hello World--  ')).toBe('hello-world');
  });

  it('keeps digits', () => {
    expect(slugify('Team 42')).toBe('team-42');
  });

  it('drops accented / non-ascii characters', () => {
    expect(slugify('Café Déjà')).toBe('caf-d-j');
  });

  it('falls back to "team" when nothing usable remains', () => {
    expect(slugify('!!!')).toBe('team');
    expect(slugify('   ')).toBe('team');
    expect(slugify('')).toBe('team');
  });

  it('always produces a value that matches the slug regex', () => {
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    expect(slugify('Hello, World! 123')).toMatch(slugRegex);
    expect(slugify('###')).toMatch(slugRegex);
  });
});

describe('generateUniqueSlug', () => {
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
