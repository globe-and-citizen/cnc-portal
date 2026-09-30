import { describe, expect, it } from 'vitest';
import {
  addFixedReturnOfferingBodySchema,
  getFixedReturnOfferingsQuerySchema,
} from '../fixedReturnOffering';

describe('fixedReturnOffering schemas', () => {
  describe('addFixedReturnOfferingBodySchema', () => {
    it('validates a body with title and purpose', () => {
      const validData = {
        teamId: '1',
        offerId: '2',
        title: 'Riverside Expansion Note',
        purpose: 'Working capital for Q3',
      };

      const result = addFixedReturnOfferingBodySchema.parse(validData);
      expect(result.teamId).toBe(1);
      expect(result.offerId).toBe(2);
      expect(result.title).toBe('Riverside Expansion Note');
      expect(result.purpose).toBe('Working capital for Q3');
    });

    it('validates a body without purpose', () => {
      const validData = { teamId: '1', offerId: '2', title: 'Riverside Expansion Note' };
      const result = addFixedReturnOfferingBodySchema.parse(validData);
      expect(result.purpose).toBeUndefined();
    });

    it('trims the title', () => {
      const result = addFixedReturnOfferingBodySchema.parse({
        teamId: '1',
        offerId: '2',
        title: '  Riverside Expansion Note  ',
      });
      expect(result.title).toBe('Riverside Expansion Note');
    });

    it('throws error for an empty title', () => {
      const invalidData = { teamId: '1', offerId: '2', title: '' };
      expect(() => addFixedReturnOfferingBodySchema.parse(invalidData)).toThrow(
        'Title is required'
      );
    });

    it('throws error for a missing teamId', () => {
      const invalidData = { offerId: '2', title: 'Note' };
      expect(() => addFixedReturnOfferingBodySchema.parse(invalidData)).toThrow();
    });

    it('throws error for a non-positive offerId', () => {
      const invalidData = { teamId: '1', offerId: '0', title: 'Note' };
      expect(() => addFixedReturnOfferingBodySchema.parse(invalidData)).toThrow();
    });
  });

  describe('getFixedReturnOfferingsQuerySchema', () => {
    it('validates a query with only teamId', () => {
      const result = getFixedReturnOfferingsQuerySchema.parse({ teamId: '1' });
      expect(result.teamId).toBe(1);
      expect(result.offerId).toBeUndefined();
    });

    it('validates a query with teamId and offerId', () => {
      const result = getFixedReturnOfferingsQuerySchema.parse({ teamId: '1', offerId: '2' });
      expect(result.teamId).toBe(1);
      expect(result.offerId).toBe(2);
    });

    it('throws error for a missing teamId', () => {
      expect(() => getFixedReturnOfferingsQuerySchema.parse({})).toThrow();
    });

    it('throws error for a non-positive offerId', () => {
      expect(() =>
        getFixedReturnOfferingsQuerySchema.parse({ teamId: '1', offerId: '-1' })
      ).toThrow();
    });
  });
});
