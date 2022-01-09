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
  // expensive but worth it for accuracy
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
 * Represents a locator for a column in the spreadsheet. The locator consists of
 * a date (which must exist in the spreadsheet) and an offset (where "" and "#1"
 * refer to the same offset, "#2" is next, then "#3", etc.).
 *
 * Much safer than using raw strings everywhere. Type is immutable after first
 * initialization, invalid until initialization.
 */
class ColumnLocator {
  private offset: string; // will always start with '#', followed by valid integer
  private date: string; // always in format m/d/yyyy (no leading zeroes)
  private initialized: boolean;
  static readonly DATE_REGEX = /^1?\d\/[1-3]?\d$/i;
  static readonly DATE_REGEX_WITH_YEAR = /^1?\d\/[1-3]?\d\/(\d{2}|\d{4})$/i;
  private static readonly ERROR_MESSAGE = "ColumnLocator uninitialized";
  /**
   * Initializes empty ColumnLocator object
   */
  constructor() {
    this.initialized = false;
  }

  /**
   * Creates a new ColumnLocator; throws an error if the input string is invalid.
   * A valid input string has the format `[date](#[offset])?`, where `[date]` is
   * in the form `m/d(/(yy)?yy)?`, and `[offset]` is a valid integer, in range [1, 9].
   * @param dateInput the input given by the user (everything after slash command but before space), or string representation from toString.
   */
  initialize(dateInput: string): DateParseResult {
    let [dateStr, ...offsetList] = dateInput.split(OFFSET_SPECIFIER_PREFIX); // remove offset for checking, add it back at the end
    if (dateStr.length == 0) {
      return DateParseResult.addToReason;
    }
    if (
      !dateStr.match(ColumnLocator.DATE_REGEX) &&
      !dateStr.match(ColumnLocator.DATE_REGEX_WITH_YEAR)
    ) {
      return DateParseResult.addToReason;
    }
    if (dateStr.match(ColumnLocator.DATE_REGEX_WITH_YEAR)) {
      dateStr = dateStr.substring(0, dateStr.lastIndexOf("/")); // strip year
    }
    // now guaranteed that dateStr matches DATE_REGEX; add sanity check
    if (!dateStr.match(ColumnLocator.DATE_REGEX))
      throw new Error(`Assertion failed, ${dateStr} doesn't match format`);

    // append year to date to follow rep invariant
    const currentYear = new Date(Date.now()).getFullYear();
    dateStr = `${dateStr}/${currentYear}`;

    // handle offset
    let offsetStr = OFFSET_SPECIFIER_PREFIX + offsetList.join(OFFSET_SPECIFIER_PREFIX);
    if (offsetStr.length == OFFSET_SPECIFIER_PREFIX.length)
      // no offset specified, give default
      offsetStr = OFFSET_SPECIFIER_PREFIX + "1";
    const result = parseInt(offsetStr.substring(OFFSET_SPECIFIER_PREFIX.length));
    if (isNaN(result) || result < 1 || result > 9) return DateParseResult.addToReason;
    this.offset = offsetStr;
    this.date = dateStr;
    this.initialized = true;
    return DateParseResult.success;
  }

  /**
   * Returns the date, in the format m/d/yyyy (no leading zeroes)
   */
  getDate(): string {
    if (!this.initialized) throw new Error(ColumnLocator.ERROR_MESSAGE);
    return this.date;
  }

  /**
   * Returns the offset, where offset for "#n" is n - 1 (so "#2" -> 1)
   */
  getOffset(): number {
    if (!this.initialized) throw new Error(ColumnLocator.ERROR_MESSAGE);
    return parseInt(this.offset.substring(OFFSET_SPECIFIER_PREFIX.length)) - 1;
  }

  /**
   * Returns object in representation that can be parsed by the constructor.
   */
  toString(): string {
    if (!this.initialized) throw new Error(ColumnLocator.ERROR_MESSAGE);
    return this.date + this.offset;
  }

  /**
   * Returns true if object is initialized (so it has valid data), false otherwise.
   */
  isValid(): boolean {
    return this.initialized;
  }
}
