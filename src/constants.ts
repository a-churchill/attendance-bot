// if true, uses testing workspace and sheet; if false, uses production workspace and sheet
const TESTING = true;
// app configuration
const CURRENT_SHEET = TESTING ? "Spring (testing)" : "Spring";
const ANNOUNCE_CHANNEL_ID = TESTING ? "CT2197CMP" : "C03D3MVC6"; // testing-attendancebot: CST5V9275; announce: C03D3MVC6
const API_TOKEN = PropertiesService.getScriptProperties().getProperty(
  TESTING ? "API_TOKEN_TESTING" : "API_TOKEN"
);
const SLACK_SEND_MESSAGE_URL = "https://slack.com/api/chat.postMessage";
const SLACK_OPEN_MODAL_URL = "https://slack.com/api/views.open";
const SLACK_SEND_EPHEMERAL_URL = "https://slack.com/api/chat.postEphemeral";
const SLACK_USER_INFO_URL = "https://slack.com/api/users.info";
const SLACK_UPDATE_MESSAGE_URL = "https://slack.com/api/chat.update";
const MAX_EVENT_SEARCH_DISTANCE = 7;
const AUTHORIZED_ANNOUNCERS = TESTING
  ? ["chu.andrew.8", "chu.andrew.8202"]
  : ["adchurch", "milesacb", "vdey123", "rowley"];
const ANNOUNCE_PICTURE_URL =
  "https://zn9zxq.bn.files.1drv.com/y4mV6VyeBzHtQSym10dE0dMd91KLlMO1EGLPoiiZaB1eBhpmuXzpRGBqqqetJLrQiH1kt48qRc-RbqivZAfsy65YdUfURsYtRc5L2WvDRhaBqhI-Y1v2u7c0Y7G11dwcex5ClfV_dEBvdOrWUlsFvGLypYs1uhi9hv_DoQp2U8ingapZOtOxAeRWbjkin9YfUE9qS80rsbo88CpwArOyVULjA?width=1000&height=1000&cropmode=none";
const REASON_BLOCK_ID = "reason_block";
const REASON_ACTION_ID = "reason_action";
const GITHUB_ISSUE_URL =
  "https://github.com/xxaxdxcxx/attendance-bot/issues/new";
const OFFSET_SPECIFIER_PREFIX = "#";

// cache configuration
const CACHE_DURATION = 1500; // 25 minutes
const CACHE_DURATION_SHORT = 60; // long enough to span a request; not as long to allow for updates to count if necessary (although when necessary, count is fetched directly)
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
const ANNOUNCE_SUCCESS_RESPONSE = ":heavy_check_mark: Sent announcement for ";
const ANNOUNCE_FAILURE_RESPONSE = ":scrub_arjun: Couldn't send announcement: ";
const ANNOUNCE_HEADER_TEXT =
  "<!channel|channel> Reply here to update the attendance spreadsheet.";
const HELP_TEXT = `Thanks for using AttendanceBot!\n\n:information_source: Just so you know, all you ever need to do is type */in* (in any channel) to automatically put a yes in the spreadsheet for the next practice. But for more details, here are the available commands:\n\n:one: */in* [date] [note]: marks you as a yes on the spreadsheet for the given date. If you don't specify a date, the default will be the next practice. The note is optional.\n\n:two: */out* [date] [reason]: marks you as a no on the spreadsheet for the given date. If you don't specify a date, the default will be the next practice. The reason is _mandatory_.\n\n:three: */help*: the command you just used!\n\n_Note: there is also an */announce* command, but it is only accessible to captains :wink:_\n\nTo submit an issue, <${GITHUB_ISSUE_URL}|go here>.`;
const ANNOUNCE_HELP_TEXT = `Thanks for using AttendanceBot!\n\n:information_source: Just so you know, all you ever need to do is type */announce* to automatically announce the next practice. You can add a note as well, if you want.\n\n:exclamation:If there are two events on the same day, you can specify an offset. */announce #1* (or just */announce*) will announce the first event, */announce #2* will announce the second event, and so on. Please only use this feature for events on the same day, as behavior is not guaranteed in other cases.\n\nTo submit an issue, <${GITHUB_ISSUE_URL}|go here>.`;

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
