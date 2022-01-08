function clearCache(): void {
  const cache = CacheService.getScriptCache();
  let toRemove = [DATE_ROW_CACHE_KEY, USERNAME_COL_CACHE_KEY];
  for (let i = 0; i < 100; i++) {
    toRemove.push(EVENT_INFO_CACHE_KEY_PREFIX + i);
  }
  cache.removeAll(toRemove);
}
