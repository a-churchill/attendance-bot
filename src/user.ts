/**
 * Given a valid userId, fetches the URL for the 48x48 version of their profile
 * image.
 * @param userId Slack user ID, should start with "U"
 */
function getUserAvatarUrl(userId: string): string {
  let cacheResult = tryFetchCache(userId);
  if (cacheResult.hit) return cacheResult.result as string;
  // not a hit, fetch and add to cache
  const cache = cacheResult.result as GoogleAppsScript.Cache.Cache;
  const requestUrl = `${SLACK_USER_INFO_URL}?token=${
    API_TOKEN.split(" ")[1]
  }&user=${userId}`;
  const userResponse = UrlFetchApp.fetch(requestUrl);
  const userInfo: SlackUserRequestInfo = JSON.parse(
    userResponse.getContentText()
  );
  const result = userInfo.user.profile.image_48;
  cache.put(userId, result, CACHE_DURATION); // cache for 25 minutes
  return result;
}
