import fetch from "node-fetch";
import * as Constants from "./Constants";
import { tryGetCache } from "./cache";

/**
 * Given a valid userId, fetches the URL for the 48x48 version of their profile
 * image.
 * @param userId Slack user ID, should start with "U"
 */
export async function getUserAvatarUrl(userId: string) {
  const requestUrl = `${Constants.SLACK_USER_INFO_URL}?token=${
    Constants.API_TOKEN.split(" ")[1]
  }&user=${userId}`;
  let cacheResult = await tryGetCache(
    userId,
    fetch(requestUrl).then(response => response.text()) // on miss
  );
  return cacheResult;
}
