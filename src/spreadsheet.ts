// gets the row of the given username. Expects the Slack usernames to be in
// USERNAME_COL. Throws error if username not found.
function getUserRow(
  username: string,
  sheet: GoogleAppsScript.Spreadsheet.Sheet
): number {
  // check cache for usernames
  let usernames = [];
  const cacheResult = tryFetchCache(USERNAME_COL_CACHE_KEY);
  if (cacheResult.hit) {
    const result = cacheResult.result as string;
    usernames = JSON.parse(result);
  } else {
    // cache miss
    const lastRow = sheet.getLastRow();
    const usernamesDeep = sheet
      .getRange(1, USERNAME_COL, lastRow, 1)
      .getValues();
    usernames = usernamesDeep.map(x => x[0]);
    const cache = cacheResult.result as GoogleAppsScript.Cache.Cache;
    cache.put(
      USERNAME_COL_CACHE_KEY,
      JSON.stringify(usernames),
      CACHE_DURATION
    );
  }
  let row = usernames.indexOf(username, HEADER_ROWS);
  if (row === -1) {
    throw "username " + username + " not found on spreadsheet!";
  }
  return row + 1;
}

// gets the column of the given date. Expects the dates to be in
// DATE_ROW, and date arg may have offset attached, must have full year. Throws error if date not found, or offset is invalid.
function getDateCol(
  date: string,
  sheet: GoogleAppsScript.Spreadsheet.Sheet
): number {
  if (date.length === 0) {
    // just select next practice
    try {
      return getNextPracticeDateCol(sheet);
    } catch (err) {
      // no practice in next 7 days
      throw err;
    }
  }
  let offset = 0;
  if (date.indexOf(OFFSET_SPECIFIER_PREFIX) !== -1) {
    // date includes offset; handle here
    offset = getNumberFromOffset(
      date.substring(date.indexOf(OFFSET_SPECIFIER_PREFIX))
    );
    if (isNaN(offset)) throw "Invalid offset";
    date = date.split(OFFSET_SPECIFIER_PREFIX)[0];
  }

  let dates = getDateRowValues(sheet);
  let col = dates.indexOf(date, HEADER_COLS);
  if (col === -1) {
    let nextPrac: string;
    try {
      let nextPracCol = getNextPracticeDateCol(sheet);
      nextPrac = dates[nextPracCol - 1]; // account for zero-indexing
    } catch (err) {
      throw "couldn't find any event on " + date + "." + DATE_HELP_INFO;
    }
    throw "couldn't find any event on " +
      date +
      ". Next practice is on " +
      nextPrac +
      "." +
      DATE_HELP_INFO;
  }
  return col + offset + 1;
}

/**
 * Gets a list containing the date string for the entire date row. Cached for
 * CACHE_DURATION after first fetch.
 * @param sheet current sheet
 */
function getDateRowValues(
  sheet: GoogleAppsScript.Spreadsheet.Sheet
): Array<string> {
  const cacheResult = tryFetchCache(DATE_ROW_CACHE_KEY);
  if (cacheResult.hit) {
    const result = cacheResult.result as string;
    return JSON.parse(result);
  }
  const lastCol = sheet.getLastColumn();
  const dates = sheet.getRange(DATE_ROW, 1, 1, lastCol).getDisplayValues()[0];
  const cache = cacheResult.result as GoogleAppsScript.Cache.Cache;
  cache.put(DATE_ROW_CACHE_KEY, JSON.stringify(dates), CACHE_DURATION); // cache for 25 minutes
  return dates;
}

// fetches column of next practice. Throws error if no practice within next
// MAX_EVENT_SEARCH_DISTANCE days.
function getNextPracticeDateCol(
  sheet: GoogleAppsScript.Spreadsheet.Sheet
): number {
  console.log("Trying to fetch next practice date");
  let date = new Date();
  let dates = getDateRowValues(sheet);
  for (let i = 0; i < MAX_EVENT_SEARCH_DISTANCE; i++) {
    let col = dates.indexOf(getDateText(date), HEADER_COLS);
    if (col === -1) {
      // credit to https://stackoverflow.com/a/23081320
      date.setTime(date.getTime() + ONE_DAY);
      continue;
    }
    return col + 1;
  }
  throw "no practice in next " + MAX_EVENT_SEARCH_DISTANCE + " days.";
}

/**
 * Fetches the event information for the given column. Fetches the eventType,
 * eventDate, eventTime, eventLocation, count, and includeTimeLoc properties of
 * the EventInfo interface. Cached for CACHE_DURATION_SHORT, by column
 * @param sheet current sheet
 * @param col column of event to fetch
 */
function getEventInfoFromCol(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  col: number
): EventInfo {
  const cacheKey = EVENT_INFO_CACHE_KEY_PREFIX + col;
  const cacheResult = tryFetchCache(cacheKey);
  if (cacheResult.hit) {
    const result = cacheResult.result as string;
    return JSON.parse(result);
  }
  const infoRange = sheet.getRange(
    FIRST_INFO_ROW,
    col,
    LAST_INFO_ROW - FIRST_INFO_ROW + 1
  );
  const displayValues = infoRange.getDisplayValues().map(x => x[0]); // flatten
  const eventType = fixCase(displayValues[DESCRIPTION_ROW - FIRST_INFO_ROW]);
  const eventDate = displayValues[DATE_ROW - FIRST_INFO_ROW];
  const eventTime = displayValues[TIME_ROW - FIRST_INFO_ROW];
  const eventLocation = displayValues[LOCATION_ROW - FIRST_INFO_ROW];
  const count = parseInt(displayValues[COUNT_ROW - FIRST_INFO_ROW]);
  let eventInfo: EventInfo = {
    eventType,
    eventDate,
    eventTime,
    eventLocation,
    count,
    includeTimeLoc: infoRange.getBackground() === WHITE_COLOR
  };
  const cache = cacheResult.result as GoogleAppsScript.Cache.Cache;
  cache.put(cacheKey, JSON.stringify(eventInfo), CACHE_DURATION_SHORT);
  return eventInfo;
}

// gets event description for given column. Will be string of format:
// [event type] on [event date] from [event time] at [event location].
// includeTimeLoc defaults to true.
// if includeTimeLoc is false, it will just be [event type] on [event date].
function getEventDescriptionForCol(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  col: number,
  includeTimeLoc = true
) {
  let eventInfo = getEventInfoFromCol(sheet, col);
  // don't include time and location for highlighted events
  includeTimeLoc = includeTimeLoc && eventInfo.includeTimeLoc;
  return getEventDescription(eventInfo, includeTimeLoc);
}
