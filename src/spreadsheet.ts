// gets the row of the given username. Expects the Slack usernames to be in
// USERNAME_COL. Throws error if username not found.
function getUserRow(
  username: string,
  sheet: GoogleAppsScript.Spreadsheet.Sheet
): number {
  let lastRow = sheet.getLastRow();
  let usernamesDeep = sheet.getRange(1, USERNAME_COL, lastRow, 1).getValues();
  let usernames = usernamesDeep.map(x => x[0]);
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
  if (date.indexOf("#") !== -1) {
    // date includes offset; handle here
    offset = getNumberFromOffset(date.substring(date.indexOf("#")));
    if (isNaN(offset)) throw "Invalid offset";
    date = date.split("#")[0];
  }

  let dates = getDateRowValues(sheet);
  let col = dates.indexOf(date, HEADER_COLS);
  if (col === -1) {
    let nextPrac: string;
    try {
      let nextPracCol = getNextPracticeDateCol(sheet);
      nextPrac = sheet.getRange(DATE_ROW, nextPracCol).getDisplayValue();
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

// fetches the values of every date on the spreadsheet
function getDateRowValues(
  sheet: GoogleAppsScript.Spreadsheet.Sheet
): Array<string> {
  let lastCol = sheet.getLastColumn();
  let dates = sheet.getRange(DATE_ROW, 1, 1, lastCol).getDisplayValues()[0];
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

// gets event description for given column. Will be string of format:
// [event type] on [event date] from [event time] at [event location].
// includeTimeLoc defaults to true.
// if includeTimeLoc is false, it will just be [event type] on [event date].
function getEventDescriptionForCol(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  col: number,
  includeTimeLoc = true
) {
  let eventInfo: EventInfo = {
    eventType: fixCase(sheet.getRange(DESCRIPTION_ROW, col).getDisplayValue()),
    eventDate: sheet.getRange(DATE_ROW, col).getDisplayValue(),
    eventTime: sheet.getRange(TIME_ROW, col).getDisplayValue(),
    eventLocation: sheet.getRange(LOCATION_ROW, col).getDisplayValue()
  };
  // don't include time and location for highlighted events
  includeTimeLoc =
    includeTimeLoc &&
    sheet.getRange(DESCRIPTION_ROW, col).getBackground() === WHITE_COLOR;
  return getEventDescription(eventInfo, includeTimeLoc);
}
