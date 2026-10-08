/** Persistent cache and leases; implementations must coordinate multiple API processes. */
export interface ReadRecord {
  payload: unknown;
  expiresAt: Date | null;
}

export interface ProviderReadStore {
  find(key: string): Promise<ReadRecord | null>;
  claim(key: string, token: string, now: Date, until: Date): Promise<boolean>;
  save(key: string, token: string, payload: unknown, expiresAt: Date): Promise<void>;
  release(key: string, token: string): Promise<void>;
  expire(prefix: string, safeAddress?: string): Promise<void>;
  permit(provider: string, token: string, now: Date, gapMs: number): Promise<number>;
  finish(provider: string, token: string): Promise<void>;
  block(provider: string, until: Date): Promise<void>;
}

export class ProviderReadError extends Error {
  constructor(
    public readonly status: number,
    public readonly retryAfter: number = 0,
    public readonly reason = 'provider-unavailable'
  ) {
    super(reason);
  }
}
