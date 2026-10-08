import { ProviderReadError, ProviderReadStore, ReadRecord } from '../store';

interface Entry extends ReadRecord {
  token?: string;
  until?: number;
}
interface Budget {
  next: number;
  blocked: number;
  token?: string;
  until: number;
}
export class MemoryStore implements ProviderReadStore {
  readonly records = new Map<string, Entry>();
  readonly budgets = new Map<string, Budget>();
  async find(key: string) {
    return this.records.get(key) ?? null;
  }
  async claim(key: string, token: string, now: Date, until: Date) {
    const record = this.records.get(key) ?? { payload: null, expiresAt: null };
    if ((record.until ?? 0) > now.getTime()) return false;
    this.records.set(key, { ...record, token, until: until.getTime() });
    return true;
  }
  async save(key: string, token: string, payload: unknown, expiresAt: Date) {
    if (this.records.get(key)?.token !== token) throw new ProviderReadError(503);
    this.records.set(key, { payload, expiresAt });
  }
  async release(key: string, token: string) {
    const record = this.records.get(key);
    if (record?.token === token) {
      record.token = undefined;
      record.until = undefined;
    }
  }
  async expire(prefix: string, safeAddress?: string) {
    for (const [key, record] of this.records)
      if (key.startsWith(prefix)) {
        if (
          safeAddress &&
          (record.payload as { body?: { safe?: string } })?.body?.safe?.toLowerCase() !==
            safeAddress.toLowerCase()
        )
          continue;
        record.expiresAt = new Date(0);
        record.token = undefined;
        record.until = undefined;
      }
  }
  async permit(provider: string, token: string, now: Date, gap: number) {
    const budget = this.budgets.get(provider) ?? { next: 0, blocked: 0, until: 0 };
    if (budget.blocked > now.getTime())
      throw new ProviderReadError(
        429,
        Math.ceil((budget.blocked - now.getTime()) / 1000),
        'provider-cooldown'
      );
    if (budget.until > now.getTime()) return 250;
    if (budget.next > now.getTime()) return budget.next - now.getTime();
    this.budgets.set(provider, {
      ...budget,
      next: now.getTime() + gap,
      token,
      until: now.getTime() + 20_000,
    });
    return 0;
  }
  async finish(provider: string, token: string) {
    const budget = this.budgets.get(provider);
    if (budget?.token === token) {
      budget.token = undefined;
      budget.until = 0;
    }
  }
  async block(provider: string, until: Date) {
    const budget = this.budgets.get(provider)!;
    budget.blocked = Math.max(budget.blocked, until.getTime());
  }
}
