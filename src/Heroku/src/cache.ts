import Redis = require("ioredis");
import * as Constants from "./Constants";

const redis = new Redis(process.env.REDIS_URL);

/**
 * Tries to fetch given key from cache. Handles adding value returned from
 * onMiss to cache.
 * @param key key to fetch from cache
 * @param onMiss async function called if cache misses
 * @param duration duration to keep value in cache
 */
export async function tryGetCache(
  key: string,
  onMiss: Promise<string>,
  duration = Constants.CACHE_DURATION
) {
  return await redis
    .get(key + Constants.TESTING ? "_test" : "")
    .then(async (value: string) => {
      if (value) {
        // middleware, logs cache hit/miss

        console.log(`Cache hit: for key ${key} got ${value}`);
        return value;
      } else {
        // cache miss, add value to cache
        console.log(`Cache miss: for key ${key}`);
        return await onMiss.then((value: string) => {
          console.log(`Inserting to cache: for key ${key} inserting ${value}`);
          redis.setex(key, duration, value);
          return value;
        });
      }
    });
}
