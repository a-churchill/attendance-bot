// if true, uses testing workspace and sheet; if false, uses production workspace and sheet
const TESTING = true;
// app configuration
const CURRENT_SHEET = TESTING ? "Spring (testing)" : "Spring";
const GOOGLE_EVENT_INFO_NAME = "event-info";
const GOOGLE_EVENT_COUNT_NAME = "event-count";
const MAX_EVENT_SEARCH_DISTANCE = 7;
const OFFSET_SPECIFIER_PREFIX = "#";

// cache configuration
const CACHE_DURATION = 21600; // 6 hours
const CACHE_DURATION_SHORT = 1500;
const DATE_ROW_CACHE_KEY = TESTING ? "date_row_testing" : "date_row";
const EVENT_INFO_CACHE_KEY_PREFIX = TESTING
  ? "event_info_col_testing_"
  : "event_info_col_";
const USERNAME_COL_CACHE_KEY = TESTING ? "user_col_testing" : "user_col";

// user response variables
const SUCCESS_RESPONSE = ":heavy_check_mark: Updated spreadsheet. ";
const NO_CHANGE_RESPONSE = ":thumbsup_all: No change necessary. ";
const FAILURE_RESPONSE = ":scrub_arjun: Couldn't update the spreadsheet: ";
const NO_REASON_ERROR = "please add a reason for why you're missing practice.";
const DATE_HELP_INFO =
  "\n:information_source: If you just want to choose the next upcoming practice, no need to specify the date";
const LATE_CHANGE_ALERT =
  "\n:exclamation: If you're changing to a no this close to practice, please send a note to your team explaining.";
const PAST_CHANGE_ALERT =
  "\n:exclamation: The date you just updated is in the past.";
const BLACKED_OUT_ALERT =
  "\n:information_source: Your cell was blacked out. You may want to check the spreadsheet.";

// spreadsheet layout variables
const HEADER_ROWS = 6;
const HEADER_COLS = 2;
const DESCRIPTION_ROW = 1;
const DATE_ROW = 2;
const TIME_ROW = 3;
const LOCATION_ROW = 4;
const COUNT_ROW = 5;
const USERNAME_COL = 2;
const FIRST_INFO_ROW = DESCRIPTION_ROW;
const LAST_INFO_ROW = COUNT_ROW;

// useful constants
const ONE_DAY = 24 * 60 * 60 * 1000;
const TWO_HOURS = 2 * 60 * 60 * 1000;
const BLACK_COLOR = "#000000";
const WHITE_COLOR = "#ffffff";
