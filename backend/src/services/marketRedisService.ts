import { createClient } from 'redis';

let client: ReturnType<typeof createClient> | undefined;
let connecting: Promise<ReturnType<typeof createClient>> | undefined;

/** A missing cache must not turn every browser request into an upstream request. */
export async function getMarketRedis() {
  if (client?.isReady) return client;
  if (connecting) return connecting;
  const url = process.env.REDIS_URL;
  if (!url) throw new Error('Market cache is not configured');

  client = createClient({
    url,
    disableOfflineQueue: true,
    socket: { connectTimeout: 2000, reconnectStrategy: false },
  });
  // Do not log connection strings or provider credentials.
  client.on('error', () => console.warn('Market cache connection unavailable'));
  const nextClient = client;
  connecting = nextClient.connect().then(() => nextClient);
  try {
    return await connecting;
  } finally {
    connecting = undefined;
  }
}
