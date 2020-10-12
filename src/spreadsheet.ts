import fetch from 'node-fetch';

import { tryGetCache } from './cache';
import * as Constants from './constants';
import * as Enums from './enums';
import * as Types from './interfaces';
import { ColumnLocator } from './text';

/**
 * Gets the event info from the spreadsheet (all required fields) wrapped in GoogleResponse
 * @param date date of event info to get; if null, gets info for next event
 * @param process function called on resulting event info
 */
export async function getEventInfo(date: ColumnLocator | null) {
  if (date) {
    return await tryGetCache(
      date.toString(),
      sendGetRequest(
        Constants.GOOGLE_EVENT_INFO_NAME,
        date.toString().replace(Constants.OFFSET_SPECIFIER_PREFIX, "@")
      ), // to call on miss
      Constants.CACHE_DURATION_SHORT
    );
  } else {
    // no date given, get next date
    console.log("Skipping cache, fetching info for next date");
    return await sendGetRequest(Constants.GOOGLE_EVENT_INFO_NAME, "");
  }
}

/**
 * Gets the most up-to-date count for the given event.
 * @param date date to fetch count for
 */
export async function getEventCount(date: ColumnLocator) {
  if (!date.isValid()) {
    throw "Trying to fetch event count for invalid date";
  }
  return await sendGetRequest(Constants.GOOGLE_EVENT_COUNT_NAME, date.toString());
}

/**
 * Updates the user status on the spreadsheet.
 * @param userStatus valid user status. Must have valid date or empty date; no other validation done.
 */
export async function setUserStatus(userStatus: Types.UserStatus) {
  return await fetch(Constants.GOOGLE_URL, {
    method: "POST",
    body: JSON.stringify(userStatus),
    headers: Constants.JSON_CONTENT_HEADERS,
  }).then((res) => res.text());
}

/**
 * Send a request to the Google Apps Script API.
 * @param method method for Google Apps Script API
 * @param value value for Google Apps Script API
 */
async function sendGetRequest(method: string, value: string) {
  const url = Constants.GOOGLE_URL + queryStringify({ method, value });
  console.log("Sending request to " + url);
  const response = await fetch(url, {
    method: "GET",
  });
  console.log(`Got response to ${method} call`);
  return response.text();
}

/**
 * Turns object into query string, so { foo: 1, bar: 2 } becomes "?foo=1&bar=2".
 * @param query object to convert into query string
 */
function queryStringify(query: { [key: string]: string }) {
  let result: Array<string> = [];
  for (let key in query) {
    result.push(`${key}=${query[key]}`);
  }
  return result.length > 0 ? "?" + result.join("&") : "";
}
