/**
 * Given a valid userId, fetches the URL for the 48x48 version of their profile
 * image.
 * @param userId Slack user ID, should start with "U"
 */
function getUserAvatarUrl(userId: string): string {
  const cache = CacheService.getScriptCache();
  const cached = cache.get(userId);
  if (cached != null) {
    return cached;
  }

  let requestUrl = `${SLACK_USER_INFO_URL}?token=${
    API_TOKEN.split(" ")[1]
  }&user=${userId}`;
  let userResponse = UrlFetchApp.fetch(requestUrl);
  let userInfo: SlackUserRequestInfo = JSON.parse(
    userResponse.getContentText()
  );
  const result = userInfo.user.profile.image_48;
  cache.put(userId, result, 1500); // cache for 25 minutes
  return result;
}
