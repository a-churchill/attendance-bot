// credit to https://stackoverflow.com/a/4929629
/**
 * Given a JavaScript Date object, gets the date in the format m/d/yyyy
 * @param dateObj the date to get the textual representation of
 */
function getDateText(dateObj: Date): string {
  let day = String(dateObj.getDate());
  let month = String(dateObj.getMonth() + 1); //January is 0!
  let year = dateObj.getFullYear();
  return `${month}/${day}/${year}`;
}

/**
 * Makes the response text. This is the text shown in an ephemeral message to
 * the user, confirming that they updated the spreadsheet and giving information
 * about the event they updated. It does not include the success message or any
 * alerts (e.g. alert about updating response too late)
 * @param sheet current sheet
 * @param col column of event updated
 * @param userIn true if the user is in, false if they are out for this event
 */
function makeResponseText(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  col: number,
  userIn: boolean
): string {
  let eventCount = parseInt(sheet.getRange(COUNT_ROW, col).getDisplayValue());
  let response = "You're ";
  if (userIn) {
    response += `in for ${getEventDescriptionForCol(sheet, col)}!`;
    response +=
      eventCount === 1
        ? ""
        : ` So far ${eventCount - 1} ${
            eventCount - 1 === 1 ? "other person is" : "other people are"
          } in as well!`;
  } else {
    // user out
    response += `out for ${getEventDescriptionForCol(sheet, col, false)}.`;
    response +=
      eventCount === 0
        ? ""
        : ` At least ${eventCount} ${
            eventCount === 1 ? "person" : "people"
          } (so far) will be missing you :cry:.`;
  }
  return response;
}

/**
 * Returns a description of the event, in the following format:
 * `"[eventType] on [eventDate] (from [eventTime] at [eventLocation])"`, where
 * time and location are included if `includeTimeLoc` is true.
 * @param event event to get information about
 * @param includeTimeLoc whether to include the time and location in the result
 */
function getEventDescription(event: EventInfo, includeTimeLoc = true): string {
  if (includeTimeLoc) {
    return `${event.eventType} on ${event.eventDate} from ${event.eventTime} at ${event.eventLocation}`;
  }
  return `${event.eventType} on ${event.eventDate}`;
}

/**
 * If event is one word, makes it lowercase; otherwise does not touch case
 * @param eventName name of event from spreadsheet
 */
function fixCase(eventName: string): string {
  if (eventName.split(" ").length > 1) return eventName;
  return eventName.toLowerCase();
}

/**
 * Returns the number of columns offset from the current. So for an offset "#1",
 * this would return 0; for "#2", this would return 1, etc. Throws error if result
 * is less than 0.
 * @param offset string in format "#[number]"
 */
function getNumberFromOffset(offset: string): number {
  const result = parseInt(offset.substring(1)) - 1;
  if (result < 0)
    throw `Invalid offset ${offset}; offsets should be positive and 1-indexed`;
  return result;
}
