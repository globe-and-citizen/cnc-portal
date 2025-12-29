// backend/prisma/seeders/helpers.ts

import { faker } from '@faker-js/faker';
import { HARDHAT_ADDRESSES, type Environment } from './config';

export function generateNonce(): string {
  return Math.random().toString(36).substring(2, 15);
}

export function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
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

export function getDateRanges() {
  const now = new Date();
  return {
    last7d: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    last30d: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
    last90d: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
    lastYear: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000),
  };
}

export function distributeDate(index: number, total: number): Date {
  const ranges = getDateRanges();
  const now = new Date();

  // 30% in last 7 days, 40% in last 30 days, 20% in last 90 days, 10% older
  const ratio = index / total;
  if (ratio < 0.3) {
    return randomDate(ranges.last7d, now);
  } else if (ratio < 0.7) {
    return randomDate(ranges.last30d, ranges.last7d);
  } else if (ratio < 0.9) {
    return randomDate(ranges.last90d, ranges.last30d);
  } else {
    return randomDate(ranges.lastYear, ranges.last90d);
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
