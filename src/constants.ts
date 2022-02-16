// if true, uses testing workspace and sheet; if false, uses production workspace and sheet
export const TESTING = process.env.TESTING === "true";
// app configuration
export const ANNOUNCE_CHANNEL_ID = TESTING ? "CT2197CMP" : "C03D3MVC6"; // testing-attendancebot in MIT-ultimate: CST5V9275; announce: C03D3MVC6
export const API_TOKEN = TESTING
  ? (process.env.API_TOKEN_TESTING as string)
  : (process.env.API_TOKEN as string);

// Google Apps Script interface

export const GOOGLE_URL = TESTING
  ? // this URL is for the latest version of the code
    "https://script.google.com/macros/s/AKfycbzQAWGCo5H1bczQM-U9AcUDciIhAsnCml6DynT1dHlh/dev"
  : // this URL is for the latest deployment, guaranteed by the DEPLOYMENT_ID set in the
    // GitHub Action that creates deployments.
    "https://script.google.com/macros/s/AKfycbx6pvmyrKI9iIa5N4uTC-tDCqNdprze6g3x8vekaIhtKBXqJkkK12rlmIaIgAeObz-YwQ/exec";
export const GOOGLE_CLEAR_CACHE_NAME = "clear-cache";
export const GOOGLE_EVENT_INFO_NAME = "event-info";
export const GOOGLE_EVENT_COUNT_NAME = "event-count";
export const GOOGLE_GET_ADMINS_NAME = "get-admins";

// Slack URLs
export const SLACK_SEND_MESSAGE_URL = "https://slack.com/api/chat.postMessage";
export const SLACK_OPEN_MODAL_URL = "https://slack.com/api/views.open";
export const SLACK_SEND_EPHEMERAL_URL = "https://slack.com/api/chat.postEphemeral";
export const SLACK_USER_INFO_URL = "https://slack.com/api/users.info";
export const SLACK_UPDATE_MESSAGE_URL = "https://slack.com/api/chat.update";
export const MAX_EVENT_SEARCH_DISTANCE = 7;
export const ANNOUNCE_PICTURE_URL =
  "https://zn9zxq.bn.files.1drv.com/y4mV6VyeBzHtQSym10dE0dMd91KLlMO1EGLPoiiZaB1eBhpmuXzpRGBqqqetJLrQiH1kt48qRc-RbqivZAfsy65YdUfURsYtRc5L2WvDRhaBqhI-Y1v2u7c0Y7G11dwcex5ClfV_dEBvdOrWUlsFvGLypYs1uhi9hv_DoQp2U8ingapZOtOxAeRWbjkin9YfUE9qS80rsbo88CpwArOyVULjA?width=1000&height=1000&cropmode=none";
export const REASON_BLOCK_ID = "reason_block";
export const REASON_ACTION_ID = "reason_action";
export const GITHUB_ISSUE_URL =
  "https://github.com/a-churchill/attendance-bot/issues/new";
export const OFFSET_SPECIFIER_PREFIX = "#";
export const URL_SAFE_OFFSET_SPECIFIER_PREFIX = "@";

// cache configuration
export const REDIS_CACHE_EXPIRATION_KEY = "EX";
export const CACHE_DURATION = 21600; // 6 hours
export const CACHE_DURATION_SHORT = 1500;
export const ADMINS_CACHE_KEY = TESTING ? "admins_testing" : "admins";
export const DATE_ROW_CACHE_KEY = TESTING ? "date_row_testing" : "date_row";
export const EVENT_INFO_CACHE_KEY_PREFIX = TESTING
  ? "event_info_col_testing_"
  : "event_info_col_";
export const USERNAME_COL_CACHE_KEY = TESTING ? "user_col_testing" : "user_col";

// user response variables
export const SUCCESS_RESPONSE = ":heavy_check_mark: Updated spreadsheet. ";
export const NO_CHANGE_RESPONSE = ":thumbsup_all: No change necessary. ";
export const FAILURE_RESPONSE = ":scrub_arjun: Couldn't update the spreadsheet: ";
export const NO_REASON_ERROR = "please add a reason for why you're missing practice.";
export const DATE_HELP_INFO =
  "\n:information_source: If you just want to choose the next upcoming practice, no need to specify the date";
export const LATE_CHANGE_ALERT =
  "\n:exclamation: If you're changing to a no this close to practice, please send a note to your team explaining.";
export const PAST_CHANGE_ALERT =
  "\n:exclamation: The date you just updated is in the past.";
export const BLACKED_OUT_ALERT =
  "\n:information_source: Your cell was blacked out. You may want to check the spreadsheet.";
export const ANNOUNCE_SUCCESS_RESPONSE = ":heavy_check_mark: Sent announcement for ";
export const ANNOUNCE_FAILURE_RESPONSE = ":scrub_arjun: Couldn't send announcement: ";
export const ANNOUNCE_HEADER_TEXT =
  "<!channel|channel> Reply here to update the attendance spreadsheet.";
export const HELP_TEXT = `Thanks for using AttendanceBot!\n\n:information_source: Just so you know, all you ever need to do is type */in* (in any channel) to automatically put a yes in the spreadsheet for the next practice. But for more details, here are the available commands:\n\n:one: */in* [date] [note]: marks you as a yes on the spreadsheet for the given date. If you don't specify a date, the default will be the next practice. The note is optional.\n\n:two: */out* [date] [reason]: marks you as a no on the spreadsheet for the given date. If you don't specify a date, the default will be the next practice. The reason is _mandatory_.\n\n:three: */help*: the command you just used!\n\n_Note: there is also an */announce* command, but it is only accessible to captains :wink:_\n\nTo submit an issue, <${GITHUB_ISSUE_URL}|go here>.`;
export const ANNOUNCE_HELP_TEXT = `Thanks for using AttendanceBot!\n\n:information_source: Just so you know, all you ever need to do is type */announce* to automatically announce the next practice. You can add a note as well, if you want.\n\n:exclamation:If there are two events on the same day, you can specify an offset. */announce #1* (or just */announce*) will announce the first event, */announce #2* will announce the second event, and so on. Please only use this feature for events on the same day, as behavior is not guaranteed in other cases.\n\nTo submit an issue, <${GITHUB_ISSUE_URL}|go here>.`;

// spreadsheet layout variables
export const HEADER_ROWS = 6;
export const HEADER_COLS = 2;
export const DESCRIPTION_ROW = 1;
export const DATE_ROW = 2;
export const TIME_ROW = 3;
export const LOCATION_ROW = 4;
export const COUNT_ROW = 5;
export const USERNAME_COL = 2;
export const FIRST_INFO_ROW = DESCRIPTION_ROW;
export const LAST_INFO_ROW = COUNT_ROW;

// useful constants
export const ONE_DAY = 24 * 60 * 60 * 1000;
export const TWO_HOURS = 2 * 60 * 60 * 1000;
export const BLACK_COLOR = "#000000";
export const WHITE_COLOR = "#ffffff";
export const JSON_CONTENT_HEADERS = { "Content-Type": "application/json" };
