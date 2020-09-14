/**
 * Tries to fetch the given key from the cache. Returns cache if lookup failed.
 * @param key key to look up in cache.
 */
function tryFetchCache(
  key: string
): { hit: boolean; result: GoogleAppsScript.Cache.Cache | string } {
  const cache = CacheService.getScriptCache();
  const cached = cache.get(key);
  if (cached != null) {
    return { hit: true, result: cached };
  }
  return { hit: false, result: cache };
}
