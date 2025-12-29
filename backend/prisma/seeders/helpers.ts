// backend/prisma/seeders/helpers.ts

import { faker } from '@faker-js/faker';
import { HARDHAT_ADDRESSES, type Environment } from './config';

export function generateNonce(): string {
  return Math.random().toString(36).substring(2, 15);
}

export function randomStatus<T extends string>(statuses: T[]): T {
  return statuses[Math.floor(Math.random() * statuses.length)];
}

export function getEthereumAddress(index: number, environment: Environment): string {
  if (environment === 'test') {
    return HARDHAT_ADDRESSES[index % HARDHAT_ADDRESSES.length];
  }
  if (environment === 'development' && index < HARDHAT_ADDRESSES.length) {
    return HARDHAT_ADDRESSES[index];
  }
  return faker.finance.ethereumAddress();
}

/**
 * Distributes dates across different time ranges with weighted probability
 * - 30% in last 7 days
 * - 40% in last 30 days
 * - 20% in last 90 days
 * - 10% older than 90 days (up to 1 year)
 */
export function distributeDate(index: number, total: number): Date {
  const now = new Date();
  const ratio = index / total;

  if (ratio < 0.3) {
    // 30% in last 7 days
    return faker.date.recent({ days: 7 });
  } else if (ratio < 0.7) {
    // 40% in last 30 days (but older than 7 days)
    return faker.date.between({
      from: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      to: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    });
  } else if (ratio < 0.9) {
    // 20% in last 90 days (but older than 30 days)
    return faker.date.between({
      from: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
      to: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
    });
  } else {
    // 10% older than 90 days (up to 1 year)
    return faker.date.between({
      from: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000),
      to: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
    });
  }
}

export function getMondayAtMidnight(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getDateAtMidnight(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}
