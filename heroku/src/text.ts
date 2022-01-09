import * as Constants from "./constants";
import * as Enums from "./enums";
import * as Types from "./interfaces";

/**
 * Returns a description of the event, in the following format:
 * `"[eventType] on [eventDate] (from [eventTime] at [eventLocation])"`, where
 * time and location are included if `includeTimeLoc` is true.
 * @param event event to get information about
 * @param includeTimeLoc whether to include the time and location in the result
 */
export function getEventDescription(
  event: Types.EventInfo,
  includeTimeLoc = true
): string {
  if (includeTimeLoc) {
    return `${event.eventType} on ${event.eventDate} from ${event.eventTime} at ${event.eventLocation}`;
  }
  return `${event.eventType} on ${event.eventDate}`;
}

export function getSlashCommand(command: string): Enums.SlashCommand {
  switch (command) {
    case "/in":
      return Enums.SlashCommand.in;
    case "/out":
      return Enums.SlashCommand.out;
    case "/announce":
      return Enums.SlashCommand.announce;
    case "/h":
      return Enums.SlashCommand.help;
    case "/clear-cache":
      return Enums.SlashCommand.clearCache;
    default:
      // should never happen
      throw new Error("Unimplemented slash command " + command);
  }
}

export function parseAnnounceNote(
  note: string,
  eventDate: string
): { newNote: string; date: ColumnLocator } {
  const date = new ColumnLocator();
  if (note.charAt(0) === Constants.OFFSET_SPECIFIER_PREFIX) {
    // specified offset
    const potentialOffset = note.split(" ")[0];
    date.initialize(eventDate + potentialOffset);
    if (!date.isValid()) date.initialize(eventDate);
    else {
      // valid offset, remove it from note
      note = note.split(" ").slice(1).join(" ");
      console.log(`Offset of ${potentialOffset}; remaining note: ${note}`);
    }
  } else {
    date.initialize(eventDate);
  }
  return { newNote: note, date };
}

/**
 * Represents a locator for a column in the spreadsheet. The locator consists of
 * a date (which must exist in the spreadsheet) and an offset (where "" and "#1"
 * refer to the same offset, "#2" is next, then "#3", etc.).
 *
 * Much safer than using raw strings everywhere. Type is immutable after first
 * initialization, invalid until initialization.
 */
export class ColumnLocator {
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
  initialize(dateInput: string): Enums.DateParseResult {
    let [dateStr, ...offsetList] = dateInput.split(Constants.OFFSET_SPECIFIER_PREFIX); // remove offset for checking, add it back at the end
    if (dateStr.length == 0) {
      return Enums.DateParseResult.addToReason;
    }
    if (
      !dateStr.match(ColumnLocator.DATE_REGEX) &&
      !dateStr.match(ColumnLocator.DATE_REGEX_WITH_YEAR)
    ) {
      return Enums.DateParseResult.addToReason;
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
    let offsetStr =
      Constants.OFFSET_SPECIFIER_PREFIX +
      offsetList.join(Constants.OFFSET_SPECIFIER_PREFIX);
    if (offsetStr.length == Constants.OFFSET_SPECIFIER_PREFIX.length)
      // no offset specified, give default
      offsetStr = Constants.OFFSET_SPECIFIER_PREFIX + "1";
    const result = parseInt(
      offsetStr.substring(Constants.OFFSET_SPECIFIER_PREFIX.length)
    );
    if (isNaN(result) || result < 1 || result > 9)
      return Enums.DateParseResult.addToReason;
    this.offset = offsetStr;
    this.date = dateStr;
    this.initialized = true;
    return Enums.DateParseResult.success;
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
    return (
      parseInt(this.offset.substring(Constants.OFFSET_SPECIFIER_PREFIX.length)) - 1
    );
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
