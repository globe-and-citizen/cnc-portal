import { getAddress } from 'viem';
import { ProviderReadGateway, ProviderRequest } from './gateway';
import { ProviderReadError } from './store';

const NETWORKS: Record<number, string> = {
  1: 'eth',
  137: 'pol',
  11155111: 'sep',
  42161: 'arb1',
  80002: 'amoy',
};
type Row = Record<string, unknown>;
interface Page {
  next: string | null;
  results: Row[];
  count: number;
}
interface Snapshot {
  rows: Row[];
  syncedAt: number;
  reconciledAt: number;
}

export class SafeReadService {
  constructor(
    private readonly gateway: ProviderReadGateway,
    private readonly now = Date.now
  ) {}

  async invalidate(chainId: number, address: string) {
    if (!NETWORKS[chainId]) throw new ProviderReadError(400, 0, 'unsupported-network');
    const normalized = getAddress(address.toLowerCase());
    await Promise.all([
      this.gateway.store.expire(
        `http:safe:https://api.safe.global/tx-service/${NETWORKS[chainId]}/api/v1/safes/${normalized}/`
      ),
      this.gateway.store.expire(`safe-history:${chainId}:api/v1/safes/${normalized}/`),
      this.gateway.store.expire(
        `missing:http:safe:https://api.safe.global/tx-service/${NETWORKS[chainId]}/api/v1/safes/${normalized}/`
      ),
      this.gateway.store.expire(
        `http:safe:https://api.safe.global/tx-service/${NETWORKS[chainId]}/api/v1/multisig-transactions/`,
        normalized
      ),
    ]);
  }

  async read(chainId: number, path: string, params: URLSearchParams): Promise<unknown> {
    const network = NETWORKS[chainId];
    if (!network) throw new ProviderReadError(400, 0, 'unsupported-network');
    const match = path.match(
      /^api\/v1\/safes\/(0x[0-9a-fA-F]{40})(?:\/(incoming-transfers|transfers|multisig-transactions))?\/?$/
    );
    const detail = path.match(/^api\/v1\/multisig-transactions\/(0x[0-9a-fA-F]{64})\/?$/);
    if (!match && !detail) throw new ProviderReadError(400, 0, 'unsupported-safe-resource');
    const normalizedPath = match
      ? `api/v1/safes/${getAddress(match[1].toLowerCase())}/${match[2] ? `${match[2]}/` : ''}`
      : `api/v1/multisig-transactions/${detail![1].toLowerCase()}/`;
    const url = new URL(`https://api.safe.global/tx-service/${network}/${normalizedPath}`);
    for (const [key, value] of params) {
      if (!['limit', 'executed'].includes(key))
        throw new ProviderReadError(400, 0, 'invalid-safe-query');
      if (key === 'limit' && (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 500)) {
        throw new ProviderReadError(400, 0, 'invalid-page-size');
      }
      if (key === 'executed' && value !== 'true')
        throw new ProviderReadError(400, 0, 'invalid-safe-query');
      url.searchParams.set(key, value);
    }
    const headers = process.env.SAFE_API_KEY
      ? { Authorization: `Bearer ${process.env.SAFE_API_KEY}` }
      : undefined;
    const request: ProviderRequest = { provider: 'safe', url, headers };
    const history =
      match?.[2] === 'incoming-transfers' ||
      match?.[2] === 'transfers' ||
      (match?.[2] === 'multisig-transactions' && params.get('executed') === 'true');
    if (!history) return this.gateway.json(request, match?.[2] || detail ? 30_000 : 300_000);
    // A page-size preference does not partition the complete shared history.
    url.searchParams.set('limit', '500');
    const key = `safe-history:${chainId}:${normalizedPath}:${params.get('executed') ?? ''}`;
    const snapshot = await this.gateway.cached<Snapshot>(key, 120_000, async (previous) => {
      const old = previous as Snapshot | undefined;
      const started = this.now();
      const full = !old || started - old.reconciledAt >= 86_400_000;
      const since = full ? null : new Date(old.syncedAt - 86_400_000).toISOString();
      if (since) url.searchParams.set('execution_date__gte', since);
      url.searchParams.set('execution_date__lte', new Date(started).toISOString());
      const rows = await this.pages({ ...request, url }, started);
      const unique = new Map<string, Row>();
      for (const row of [
        ...(full
          ? []
          : old!.rows.filter(
              (item) => Date.parse(String(item.executionDate)) < Date.parse(since!)
            )),
        ...rows,
      ]) {
        const id = row.transferId ?? row.safeTxHash;
        if (typeof id !== 'string' || !id)
          throw new ProviderReadError(502, 2, 'history-identity-unavailable');
        unique.set(id, row);
      }
      return {
        rows: [...unique.values()].sort(
          (a, b) => Date.parse(String(b.executionDate)) - Date.parse(String(a.executionDate))
        ),
        syncedAt: started,
        reconciledAt: full ? started : old!.reconciledAt,
      };
    });
    return { count: snapshot.rows.length, next: null, previous: null, results: snapshot.rows };
  }

  private async pages(input: ProviderRequest, started: number) {
    const rows: Row[] = [];
    let expectedCount: number | null = null;
    const visited = new Set<string>();
    const initial = input.url;
    let url: URL | null = initial;
    while (url) {
      if (visited.has(url.href) || visited.size >= 100 || this.now() - started > 120_000) {
        throw new ProviderReadError(502, 2, 'history-scan-incomplete');
      }
      // Never forward credentials to a pagination link outside this exact resource.
      if (url.origin !== initial.origin || url.pathname !== initial.pathname) {
        throw new ProviderReadError(502, 2, 'invalid-pagination-target');
      }
      for (const [key, value] of initial.searchParams) {
        if (url.searchParams.get(key) !== value)
          throw new ProviderReadError(502, 2, 'invalid-pagination-filter');
      }
      visited.add(url.href);
      const page: Page = await this.gateway.json({ ...input, url }, 0);
      if (
        !Array.isArray(page.results) ||
        !('next' in page) ||
        !Number.isSafeInteger(page.count) ||
        page.count < 0
      )
        throw new ProviderReadError(502, 2, 'invalid-provider-page');
      if (expectedCount !== null && expectedCount !== page.count)
        throw new ProviderReadError(502, 2, 'history-changed-during-scan');
      expectedCount = page.count;
      for (const row of page.results) {
        if (
          !row ||
          typeof row !== 'object' ||
          typeof row.executionDate !== 'string' ||
          !Number.isFinite(Date.parse(row.executionDate))
        ) {
          throw new ProviderReadError(502, 2, 'history-timestamp-unavailable');
        }
      }
      rows.push(...page.results);
      url = page.next ? new URL(page.next, url) : null;
    }
    const identities = new Set(rows.map((row) => row.transferId ?? row.safeTxHash));
    if (identities.size !== expectedCount)
      throw new ProviderReadError(502, 2, 'history-count-incomplete');
    return rows;
  }
}
