const TTL_MS = 30 * 60 * 1000;

type CacheEntry<T> = {
  data: T;
  expiresAt: number;
};

const cache = new Map<string, CacheEntry<unknown>>();

export function getCached<T>(key: string): T | null {
  const entry = cache.get(key);

  if (!entry) {
    return null;
  }

  if (Date.now() >= entry.expiresAt) {
    cache.delete(key);
    return null;
  }

  return entry.data as T;
}

export function setCached<T>(key: string, data: T): void {
  cache.set(key, {
    data,
    expiresAt: Date.now() + TTL_MS
  });
}

export function getCachedValue<T>(key: string): T | null {
  return getCached<T>(key);
}

export function setCachedValue<T>(key: string, value: T): void {
  setCached(key, value);
}
