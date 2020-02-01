var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
/**
 * Handles an event announcement request, coming from a "/announce" command. Returns the
 * response to send to the user who initiated the announcement.
 * @param context info for event to send announcement for
 * @param sheet current sheet
 */
function handleAnnounce(context, sheet) {
    // make sure user is authorized
    if (AUTHORIZED_ANNOUNCERS.indexOf(context.username) === -1) {
        return sendResponse(ANNOUNCE_FAILURE_RESPONSE + "you're not authorized to announce practices.");
    }
    // send announcement
    try {
        var note = context.text;
        if (note === "help")
            return sendResponse(ANNOUNCE_HELP_TEXT);
        var dateStr = getNextPracticeDate(sheet, false);
        var date = new ColumnLocator();
        if (note.charAt(0) === OFFSET_SPECIFIER_PREFIX) {
            // specified offset
            var potentialOffset = note.split(" ")[0];
            date.initialize(dateStr + potentialOffset);
            if (!date.isValid())
                date.initialize(dateStr);
            else {
                // valid offset, remove it from note
                note = note
                    .split(" ")
                    .slice(1)
                    .join(" ");
                console.log("Offset of " + potentialOffset + "; remaining note: " + note);
            }
        }
        else {
            date.initialize(dateStr);
        }
        var col = getDateCol(date, sheet);
        var eventDescription = getEventDescriptionForCol(sheet, col);
        sendAnnouncement(sheet, date, note);
        return sendResponse(ANNOUNCE_SUCCESS_RESPONSE + eventDescription);
    }
    catch (err) {
        return sendResponse(ANNOUNCE_FAILURE_RESPONSE + (err.message || err));
    }
}
// makes blocks for event. Expects eventInfo to have eventType, eventDate (no year),
// eventTime, eventLocation, note.
/**
 * Makes SlackBlocks for an announcement, to send to the announce channel.
 * Includes text block asking users to reply, section with event details and picture
 * of frisbee, context section with text and avatars of users already in, and
 * button section with in and out buttons. The action block_id will have a
 * stringified version of the eventInfo.
 * @param eventInfo info about event, should contain eventType, eventDate (no year), eventTime, eventLocation at least.
 */
function makeAnnouncementBlocks(eventInfo) {
    // make context block
    var avatarCount = (eventInfo.userAvatars || []).length;
    var contextBlock = {
        type: "context",
        elements: [
            {
                type: "plain_text",
                emoji: true,
                text: avatarCount > 0
                    ? "+ " + (eventInfo.count - avatarCount) + " more already in"
                    : eventInfo.count + " already in"
            }
        ]
    };
    if (avatarCount > 0) {
        eventInfo.userAvatars.forEach(function (image_url) {
            contextBlock.elements.unshift({
                type: "image",
                image_url: image_url,
                alt_text: "player"
            });
        });
    }
    return [
        {
            type: "section",
            text: {
                type: "mrkdwn",
                text: ANNOUNCE_HEADER_TEXT
            }
        },
        {
            type: "section",
            text: {
                type: "mrkdwn",
                text: "*What:* " +
                    eventInfo.eventType +
                    "\n*When:* " +
                    eventInfo.eventDate +
                    ", " +
                    eventInfo.eventTime +
                    "\n*Where:* " +
                    eventInfo.eventLocation +
                    (eventInfo.note ? "\n*Note:* " + eventInfo.note : "")
            },
            accessory: {
                type: "image",
                image_url: ANNOUNCE_PICTURE_URL,
                alt_text: "frisbee"
            }
        },
        contextBlock,
        {
            type: "actions",
            elements: [
                {
                    type: "button",
                    action_id: "in " + eventInfo.dateForColumnLocator,
                    text: {
                        type: "plain_text",
                        emoji: true,
                        text: "In"
                    },
                    style: "primary",
                    value: JSON.stringify(eventInfo)
                },
                {
                    type: "button",
                    action_id: "out " + eventInfo.dateForColumnLocator,
                    text: {
                        type: "plain_text",
                        emoji: true,
                        text: "Out"
                    },
                    style: "danger",
                    value: JSON.stringify(eventInfo)
                }
            ]
        }
    ];
}
// actually needs: EventInfo, user id, message_ts, add/remove flag
/**
 * Updates the announcement message with the avatar of the user who just clicked in.
 * @param updateInfo information necessary to update announcement
 * @param sheet current sheet, for fetching updated event count
 */
function updateAnnouncement(updateInfo, sheet) {
    if (typeof updateInfo === "undefined")
        return;
    var eventInfo = updateInfo.eventInfo;
    // get user info, set up avatars array
    var userAvatar = getUserAvatarUrl(updateInfo.userId);
    if (typeof eventInfo.userAvatars === "undefined") {
        eventInfo.userAvatars = [];
    }
    var userIndexInList = eventInfo.userAvatars.indexOf(userAvatar);
    if (updateInfo.addUser && userIndexInList === -1) {
        eventInfo.userAvatars.push(userAvatar);
    }
    if (!updateInfo.addUser && userIndexInList !== -1) {
        eventInfo.userAvatars.splice(userIndexInList, 1); // remove user from list
    }
    if (eventInfo.userAvatars.length === 10) {
        // return length to 9, to fit in Slack constraints
        eventInfo.userAvatars.shift();
    }
    // update event count
    var date = new ColumnLocator();
    date.initialize(eventInfo.dateForColumnLocator);
    var col = getDateCol(date, sheet);
    // expensive but worth it to allow up-to-date announcement message
    eventInfo.count = parseInt(sheet.getRange(COUNT_ROW, col).getDisplayValue());
    var payload = {
        channel: ANNOUNCE_CHANNEL_ID,
        text: ANNOUNCE_HEADER_TEXT,
        blocks: makeAnnouncementBlocks(eventInfo),
        ts: updateInfo.messageTimestamp
    };
    var options = {
        method: "post",
        contentType: "application/json",
        headers: {
            Authorization: API_TOKEN
        },
        payload: JSON.stringify(payload)
    };
    UrlFetchApp.fetch(SLACK_UPDATE_MESSAGE_URL, options);
    console.log("Announcement updated");
}
/**
 * Sends an announcement of the event in the specified column to the announce channel.
 * @param sheet current sheet
 * @param col column of event to announce
 * @param note note to add to announcement
 * @param offset a string of format "#[number]", specifying offset from first event on same date.
 */
function sendAnnouncement(sheet, date, note) {
    // collect event data
    var col = getDateCol(date, sheet);
    var eventInfo = __assign(__assign({}, getEventInfoFromCol(sheet, col)), { userAvatars: [], dateForColumnLocator: date.toString(), note: note });
    // strip year from event date
    eventInfo.eventDate = eventInfo.eventDate.substring(0, eventInfo.eventDate.lastIndexOf("/"));
    var blocks = makeAnnouncementBlocks(eventInfo);
    var payload = {
        channel: ANNOUNCE_CHANNEL_ID,
        text: ANNOUNCE_HEADER_TEXT + " " + eventInfo.note,
        blocks: blocks
    };
    var options = {
        method: "post",
        contentType: "application/json",
        headers: {
            Authorization: API_TOKEN
        },
        payload: JSON.stringify(payload)
    };
    UrlFetchApp.fetch(SLACK_SEND_MESSAGE_URL, options);
    console.log("Posted announcement");
}
// credit to https://davidwalsh.name/using-slack-slash-commands-to-send-data-from-slack-into-google-sheets
/**
 * This method is called any time a POST request is sent to this script's URL.
 * It handles the post request and sends the appropriate response to the user.
 *
 * @param e parameters from post request
 */
function handlePost(e) {
    if (typeof e !== "undefined") {
        // data to fetch from command, to pass to spreadsheet handlers
        var context = {
            username: "",
            text: "",
            command: SlashCommand.none
        };
        var responseInfo = {
            toUrl: "",
            userId: ""
        };
        var updateInfo_1 = undefined;
        if ("payload" in e.parameter) {
            // from button click or modal response
            console.log("Response to button click");
            var payload = e.parameter.payload;
            var json = JSON.parse(payload);
            if (json.type === "block_actions") {
                updateInfo_1 = {
                    eventInfo: JSON.parse(json.actions[0].value),
                    userId: json.user.id,
                    messageTimestamp: json.container.message_ts,
                    addUser: true
                };
                // clicked button in message
                // simulate slash command request
                if (json.actions[0].text.text === "In") {
                    // in button clicked
                    // user in
                    console.log("User clicked in");
                    context = {
                        username: json.user.username,
                        text: updateInfo_1.eventInfo.dateForColumnLocator,
                        command: SlashCommand["in"]
                    };
                    responseInfo.toUrl = json.response_url;
                }
                else {
                    // user out
                    console.log("User clicked out");
                    // set up modal, exit
                    updateInfo_1.addUser = false;
                    var trigger = json.trigger_id;
                    openModal(trigger, updateInfo_1, sheet);
                    return;
                }
            }
            else if (json.type === "view_submission") {
                // modal submission; start by getting details
                console.log("User submitted modal response");
                // create out response
                var response = json.view.state.values[REASON_BLOCK_ID][REASON_ACTION_ID].value;
                var parsedUpdateInfo = JSON.parse(json.view.private_metadata);
                context = {
                    username: json.user.username,
                    text: parsedUpdateInfo.eventInfo.dateForColumnLocator + " " + response,
                    command: SlashCommand.out
                };
                responseInfo = {
                    toUrl: SLACK_SEND_EPHEMERAL_URL,
                    userId: json.user.id
                };
                updateInfo_1 = parsedUpdateInfo;
            }
        }
        else {
            // from slash command
            switch (e.parameter.command) {
                case "/in":
                    context.command = SlashCommand["in"];
                    break;
                case "/out":
                    context.command = SlashCommand.out;
                    break;
                case "/announce":
                    context.command = SlashCommand.announce;
                    break;
                case "/h":
                    context.command = SlashCommand.help;
                    break;
                default:
                    // should never happen
                    return sendResponse(FAILURE_RESPONSE + "unimplemented slash command");
            }
            context.username = e.parameter.user_name;
            context.text = e.parameter.text;
            console.log("Context after processing: " + JSON.stringify(context, undefined, 2));
        }
        if (context.command === SlashCommand["in"] ||
            context.command === SlashCommand.out) {
            return handleInOut(context, sheet, responseInfo, function () {
                return updateAnnouncement(updateInfo_1, sheet);
            });
        }
        else if (context.command === SlashCommand.announce) {
            return handleAnnounce(context, sheet);
        }
        else if (context.command === SlashCommand.help) {
            return sendResponse(HELP_TEXT);
        }
    }
    return sendResponse(FAILURE_RESPONSE + "right off the bat");
}
/**
 * Sends a response with the given text. If responseInfo.toUrl is specified,
 * then the response is sent as an ephemeral message to that URL (this would be
 * to avoid sending a public response to an event), and sends an empty TextOutput
 * which will dismiss a modal if applicable. Otherwise, returns a TextOutput
 * which will be sent directly to the user.
 *
 * @param text content of message to send to user
 * @param responseInfo contains URL to send message to (if applicable) and user ID to send to (if applicable).
 */
function sendResponse(text, responseInfo) {
    if (responseInfo && responseInfo.toUrl) {
        var payload = {
            text: text,
            response_type: "ephemeral",
            user: responseInfo.userId,
            channel: ANNOUNCE_CHANNEL_ID,
            replace_original: false
        };
        var options = {
            method: "post",
            contentType: "application/json",
            headers: {
                Authorization: API_TOKEN
            },
            payload: JSON.stringify(payload)
        };
        UrlFetchApp.fetch(responseInfo.toUrl, options);
        console.log("Posted response message");
        return ContentService.createTextOutput("");
    }
    else {
        console.log("Sending response");
        return ContentService.createTextOutput(text);
    }
}
function doGet(e) {
    return ContentService.createTextOutput("Nothing here. This is a Slack app only!");
}
// if true, uses testing workspace and sheet; if false, uses production workspace and sheet
var TESTING = true;
// app configuration
var CURRENT_SHEET = TESTING ? "Spring (testing)" : "Spring";
var ANNOUNCE_CHANNEL_ID = TESTING ? "CT2197CMP" : "C03D3MVC6"; // testing-attendancebot: CST5V9275; announce: C03D3MVC6
var API_TOKEN = PropertiesService.getScriptProperties().getProperty(TESTING ? "API_TOKEN_TESTING" : "API_TOKEN");
var SLACK_SEND_MESSAGE_URL = "https://slack.com/api/chat.postMessage";
var SLACK_OPEN_MODAL_URL = "https://slack.com/api/views.open";
var SLACK_SEND_EPHEMERAL_URL = "https://slack.com/api/chat.postEphemeral";
var SLACK_USER_INFO_URL = "https://slack.com/api/users.info";
var SLACK_UPDATE_MESSAGE_URL = "https://slack.com/api/chat.update";
var MAX_EVENT_SEARCH_DISTANCE = 7;
var AUTHORIZED_ANNOUNCERS = TESTING
    ? ["chu.andrew.8", "chu.andrew.8202"]
    : ["adchurch", "milesacb", "vdey123", "rowley"];
var ANNOUNCE_PICTURE_URL = "https://zn9zxq.bn.files.1drv.com/y4mV6VyeBzHtQSym10dE0dMd91KLlMO1EGLPoiiZaB1eBhpmuXzpRGBqqqetJLrQiH1kt48qRc-RbqivZAfsy65YdUfURsYtRc5L2WvDRhaBqhI-Y1v2u7c0Y7G11dwcex5ClfV_dEBvdOrWUlsFvGLypYs1uhi9hv_DoQp2U8ingapZOtOxAeRWbjkin9YfUE9qS80rsbo88CpwArOyVULjA?width=1000&height=1000&cropmode=none";
var REASON_BLOCK_ID = "reason_block";
var REASON_ACTION_ID = "reason_action";
var GITHUB_ISSUE_URL = "https://github.com/xxaxdxcxx/attendance-bot/issues/new";
var OFFSET_SPECIFIER_PREFIX = "#";
// cache configuration
var CACHE_DURATION = 21600; // 6 hours
var CACHE_DURATION_SHORT = 1500;
var DATE_ROW_CACHE_KEY = TESTING ? "date_row_testing" : "date_row";
var EVENT_INFO_CACHE_KEY_PREFIX = TESTING
    ? "event_info_col_testing_"
    : "event_info_col_";
var USERNAME_COL_CACHE_KEY = TESTING ? "user_col_testing" : "user_col";
// user response variables
var SUCCESS_RESPONSE = ":heavy_check_mark: Updated spreadsheet. ";
var NO_CHANGE_RESPONSE = ":thumbsup_all: No change necessary. ";
var FAILURE_RESPONSE = ":scrub_arjun: Couldn't update the spreadsheet: ";
var NO_REASON_ERROR = "please add a reason for why you're missing practice.";
var DATE_HELP_INFO = "\n:information_source: If you just want to choose the next upcoming practice, no need to specify the date";
var LATE_CHANGE_ALERT = "\n:exclamation: If you're changing to a no this close to practice, please send a note to your team explaining.";
var PAST_CHANGE_ALERT = "\n:exclamation: The date you just updated is in the past.";
var BLACKED_OUT_ALERT = "\n:information_source: Your cell was blacked out. You may want to check the spreadsheet.";
var ANNOUNCE_SUCCESS_RESPONSE = ":heavy_check_mark: Sent announcement for ";
var ANNOUNCE_FAILURE_RESPONSE = ":scrub_arjun: Couldn't send announcement: ";
var ANNOUNCE_HEADER_TEXT = "<!channel|channel> Reply here to update the attendance spreadsheet.";
var HELP_TEXT = "Thanks for using AttendanceBot!\n\n:information_source: Just so you know, all you ever need to do is type */in* (in any channel) to automatically put a yes in the spreadsheet for the next practice. But for more details, here are the available commands:\n\n:one: */in* [date] [note]: marks you as a yes on the spreadsheet for the given date. If you don't specify a date, the default will be the next practice. The note is optional.\n\n:two: */out* [date] [reason]: marks you as a no on the spreadsheet for the given date. If you don't specify a date, the default will be the next practice. The reason is _mandatory_.\n\n:three: */help*: the command you just used!\n\n_Note: there is also an */announce* command, but it is only accessible to captains :wink:_\n\nTo submit an issue, <" + GITHUB_ISSUE_URL + "|go here>.";
var ANNOUNCE_HELP_TEXT = "Thanks for using AttendanceBot!\n\n:information_source: Just so you know, all you ever need to do is type */announce* to automatically announce the next practice. You can add a note as well, if you want.\n\n:exclamation:If there are two events on the same day, you can specify an offset. */announce #1* (or just */announce*) will announce the first event, */announce #2* will announce the second event, and so on. Please only use this feature for events on the same day, as behavior is not guaranteed in other cases.\n\nTo submit an issue, <" + GITHUB_ISSUE_URL + "|go here>.";
// spreadsheet layout variables
var HEADER_ROWS = 6;
var HEADER_COLS = 2;
var DESCRIPTION_ROW = 1;
var DATE_ROW = 2;
var TIME_ROW = 3;
var LOCATION_ROW = 4;
var COUNT_ROW = 5;
var USERNAME_COL = 2;
var FIRST_INFO_ROW = DESCRIPTION_ROW;
var LAST_INFO_ROW = COUNT_ROW;
// useful constants
var ONE_DAY = 24 * 60 * 60 * 1000;
var TWO_HOURS = 2 * 60 * 60 * 1000;
var BLACK_COLOR = "#000000";
var WHITE_COLOR = "#ffffff";
var SlashCommand;
(function (SlashCommand) {
    SlashCommand[SlashCommand["in"] = 0] = "in";
    SlashCommand[SlashCommand["out"] = 1] = "out";
    SlashCommand[SlashCommand["announce"] = 2] = "announce";
    SlashCommand[SlashCommand["help"] = 3] = "help";
    SlashCommand[SlashCommand["none"] = 4] = "none";
})(SlashCommand || (SlashCommand = {}));
var DateParseResult;
(function (DateParseResult) {
    DateParseResult[DateParseResult["success"] = 0] = "success";
    DateParseResult[DateParseResult["addToReason"] = 1] = "addToReason";
})(DateParseResult || (DateParseResult = {}));
/**
 * Given some user interaction making a change to their attendance status (could
 * be slash command, button click, or modal submit), updates the spreadsheet
 * and sends a response with information about the update.
 * @param context information from user's response
 * @param sheet current sheet
 * @param responseInfo customization for where to send eventual response
 * @param afterSuccessfulChange function called after sheet updated successfully
 */
function handleInOut(context, sheet, responseInfo, afterSuccessfulChange) {
    // collect data from slash command
    var username = context.username;
    var dateStr = context.text.split(" ")[0]; // if first word is not date, handled below
    var reason = context.text
        .split(" ")
        .slice(1)
        .join(" ") || ""; // every word but first, or empty if 0/1 words
    var userIn = context.command === SlashCommand["in"];
    var offset = 0;
    // flags for whether to add various alerts after response
    var spreadsheetUnchanged = false;
    var addLateChangeAlert = false;
    var addPastChangeAlert = false;
    var addNoteAddedAlert = false;
    var addBlackedOutAlert = false;
    console.log("User " + username + ": " + context.command + " " + dateStr + " " + reason);
    // handle date
    var date = new ColumnLocator();
    var parseResult = date.initialize(dateStr);
    if (parseResult === DateParseResult.addToReason) {
        // invalid date; will be added to reason, and date.isValid() is false
        reason = dateStr.length > 0 ? dateStr + " " + reason : reason;
    }
    // ensure user input is valid:
    if (!userIn && reason.length == 0) {
        // trying to /out without a reason SMH
        return sendResponse(FAILURE_RESPONSE + NO_REASON_ERROR, responseInfo);
    }
    // fetch info, update spreadsheet
    var colUpdated; // need outside of try/catch scope, for later
    try {
        var row = getUserRow(username, sheet);
        var col = getDateCol(date, sheet);
        var cell = sheet.getRange(row, col);
        if (cell.getBackground() === BLACK_COLOR)
            // cell blacked out
            addBlackedOutAlert = true;
        if (userIn) {
            if (cell.getDisplayValue() === "y" && cell.getNote() === reason)
                spreadsheetUnchanged = true;
            cell.setNote(reason);
            cell.setValue("y");
        }
        else {
            if (cell.getDisplayValue() === "n" && cell.getNote() === reason)
                spreadsheetUnchanged = true;
            cell.setNote(reason);
            cell.setValue("n");
        }
        console.log("Success: updated (row " + row + ", col " + col + ")");
        colUpdated = col;
    }
    catch (err) {
        console.log("Error updating spreadsheet: ", err);
        return sendResponse(FAILURE_RESPONSE + (err.message || err), responseInfo);
    }
    // check if the update is coming pretty late (after 10pm day before), or for past event
    // fails silently, in case of weird formatted date on attendance spreadsheet who cares
    try {
        var eventDate = getEventInfoFromCol(sheet, colUpdated).eventDate;
        var updateBefore = new Date(eventDate); // assumes date string is m/d/yyyy
        updateBefore.setTime(updateBefore.getTime() - TWO_HOURS); // 10pm the day before
        var nextDay = new Date(eventDate);
        nextDay.setTime(nextDay.getTime() + ONE_DAY); // midnight the next day
        var today = new Date();
        if (!userIn && updateBefore < today) {
            addLateChangeAlert = true;
            console.log("Alerting user about late change");
        }
        if (nextDay < today)
            addPastChangeAlert = true;
    }
    catch (err) {
        console.log("Error checking if update came too late: " + err);
    }
    // get data about event from spreadsheet to form response
    var response = makeResponseText(sheet, colUpdated, userIn);
    if (addBlackedOutAlert)
        response = response + BLACKED_OUT_ALERT;
    if (addLateChangeAlert)
        response = response + LATE_CHANGE_ALERT;
    if (addPastChangeAlert)
        response = response + PAST_CHANGE_ALERT;
    if (addNoteAddedAlert) {
        response =
            response +
                '\n:information_source: Added note "' +
                reason +
                '" to your cell';
    }
    afterSuccessfulChange();
    return sendResponse((spreadsheetUnchanged ? NO_CHANGE_RESPONSE : SUCCESS_RESPONSE) + response, responseInfo);
}
// opens modal window
/**
 * Opens a modal window with a single line text box, submit and cancel buttons.
 * Intended for user to input their reason for missing practice.
 * @param trigger modal trigger for Slack API
 * @param date the date of the practice the user is missing
 * @param updateInfo the info needed to update the announcement message after submission of the modal
 */
function openModal(trigger, updateInfo, sheet) {
    // fetch event info to fill cache
    var col = new ColumnLocator();
    col.initialize(updateInfo.eventInfo.dateForColumnLocator);
    getEventInfoFromCol(sheet, getDateCol(col, sheet));
    var payload = {
        trigger_id: trigger,
        view: {
            type: "modal",
            callback_id: "out_explanation",
            title: {
                type: "plain_text",
                text: "Explanation",
                emoji: true
            },
            submit: {
                type: "plain_text",
                text: "Submit",
                emoji: true
            },
            close: {
                type: "plain_text",
                text: "Cancel",
                emoji: true
            },
            private_metadata: JSON.stringify(updateInfo),
            blocks: [
                {
                    type: "input",
                    block_id: REASON_BLOCK_ID,
                    label: {
                        type: "plain_text",
                        text: "Please give a reason for missing practice:",
                        emoji: true
                    },
                    element: {
                        type: "plain_text_input",
                        multiline: false,
                        placeholder: {
                            type: "plain_text",
                            text: "Your explanation here",
                            emoji: true
                        },
                        action_id: REASON_ACTION_ID
                    }
                }
            ]
        }
    };
    var options = {
        method: "post",
        contentType: "application/json",
        headers: {
            Authorization: API_TOKEN
        },
        payload: JSON.stringify(payload)
    };
    UrlFetchApp.fetch(SLACK_OPEN_MODAL_URL, options);
    console.log("Posted modal");
}
// gets the row of the given username. Expects the Slack usernames to be in
// USERNAME_COL. Throws error if username not found.
/**
 * Fetches the row with the given Slack username. Throws error if username not
 * found, with helpful description.
 * @param username username to fetch
 * @param sheet current sheet
 */
function getUserRow(username, sheet) {
    // check cache for usernames
    var usernames = [];
    var cacheResult = tryFetchCache(USERNAME_COL_CACHE_KEY);
    if (cacheResult.hit) {
        var result = cacheResult.result;
        usernames = JSON.parse(result);
    }
    else {
        // cache miss
        var lastRow = sheet.getLastRow();
        var usernamesDeep = sheet
            .getRange(1, USERNAME_COL, lastRow, 1)
            .getValues();
        usernames = usernamesDeep.map(function (x) { return x[0]; });
        var cache = cacheResult.result;
        cache.put(USERNAME_COL_CACHE_KEY, JSON.stringify(usernames), CACHE_DURATION);
    }
    var row = usernames.indexOf(username, HEADER_ROWS);
    if (row === -1) {
        throw "username " + username + " not found on spreadsheet!";
    }
    return row + 1;
}
/**
 * Gets the column of the given column locator (date and offset). Throws error
 * if date not found, with error message explaining helpfully.
 * @param date the column locator (date and offset) to access
 * @param sheet current sheet
 */
function getDateCol(date, sheet) {
    if (!date.isValid()) {
        // just select next practice
        try {
            return getNextPracticeDate(sheet);
        }
        catch (err) {
            // no practice in next 7 days
            throw err;
        }
    }
    var dates = getDateRowValues(sheet);
    var col = dates.indexOf(date.getDate(), HEADER_COLS);
    if (col === -1) {
        // invalid date, get nice information for error message
        var nextPrac = void 0;
        try {
            nextPrac = getNextPracticeDate(sheet, false);
        }
        catch (err) {
            throw "couldn't find any event on " + date + "." + DATE_HELP_INFO;
        }
        throw "couldn't find any event on " + date.getDate() + ". Next practice is on " + nextPrac + "." + DATE_HELP_INFO;
    }
    return col + date.getOffset() + 1;
}
/**
 * Gets a list containing the date string for the entire date row. Cached for
 * CACHE_DURATION after first fetch.
 * @param sheet current sheet
 */
function getDateRowValues(sheet) {
    var cacheResult = tryFetchCache(DATE_ROW_CACHE_KEY);
    if (cacheResult.hit) {
        var result = cacheResult.result;
        return JSON.parse(result);
    }
    var lastCol = sheet.getLastColumn();
    var dates = sheet.getRange(DATE_ROW, 1, 1, lastCol).getDisplayValues()[0];
    var cache = cacheResult.result;
    cache.put(DATE_ROW_CACHE_KEY, JSON.stringify(dates), CACHE_DURATION); // cache for 25 minutes
    return dates;
}
/**
 * Returns the date of the next practice, in m/d/yyyy format (if returnCol is false),
 * or the column of the next practice (if returnCol is true). Throws error if
 * there is no practice within the next MAX_EVENT_SEARCH_DISTANCE days.
 * @param sheet current sheet
 * @param returnCol return column number if true, date text if false
 */
function getNextPracticeDate(sheet, returnCol) {
    if (returnCol === void 0) { returnCol = true; }
    console.log("Trying to fetch next practice date");
    var date = new Date();
    var dates = getDateRowValues(sheet);
    for (var i = 0; i < MAX_EVENT_SEARCH_DISTANCE; i++) {
        var col = dates.indexOf(getDateText(date), HEADER_COLS);
        if (col === -1) {
            // credit to https://stackoverflow.com/a/23081320
            date.setTime(date.getTime() + ONE_DAY);
            continue;
        }
        return returnCol ? col + 1 : getDateText(date);
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
function getEventInfoFromCol(sheet, col) {
    var cacheKey = EVENT_INFO_CACHE_KEY_PREFIX + col;
    var cacheResult = tryFetchCache(cacheKey);
    if (cacheResult.hit) {
        var result = cacheResult.result;
        return JSON.parse(result);
    }
    var infoRange = sheet.getRange(FIRST_INFO_ROW, col, LAST_INFO_ROW - FIRST_INFO_ROW + 1);
    var displayValues = infoRange.getDisplayValues().map(function (x) { return x[0]; }); // flatten
    var eventType = displayValues[DESCRIPTION_ROW - FIRST_INFO_ROW];
    var eventDate = displayValues[DATE_ROW - FIRST_INFO_ROW];
    var eventTime = displayValues[TIME_ROW - FIRST_INFO_ROW];
    var eventLocation = displayValues[LOCATION_ROW - FIRST_INFO_ROW];
    var count = parseInt(displayValues[COUNT_ROW - FIRST_INFO_ROW]);
    var eventInfo = {
        eventType: eventType,
        eventDate: eventDate,
        eventTime: eventTime,
        eventLocation: eventLocation,
        count: count,
        includeTimeLoc: infoRange.getBackground() === WHITE_COLOR
    };
    var cache = cacheResult.result;
    cache.put(cacheKey, JSON.stringify(eventInfo), CACHE_DURATION_SHORT);
    return eventInfo;
}
/**
 * gets event description for given column. Will be string of format:
 * [event type] on [event date] from [event time] at [event location].
 * includeTimeLoc defaults to true.
 * if includeTimeLoc is false, result will be [event type] on [event date].
 * @param sheet current sheet
 * @param col column to get description for
 * @param includeTimeLoc whether to include time or location in result.
 */
function getEventDescriptionForCol(sheet, col, includeTimeLoc) {
    if (includeTimeLoc === void 0) { includeTimeLoc = true; }
    var eventInfo = getEventInfoFromCol(sheet, col);
    // don't include time and location for highlighted events
    includeTimeLoc = includeTimeLoc && eventInfo.includeTimeLoc;
    eventInfo.eventType = fixCase(eventInfo.eventType);
    return getEventDescription(eventInfo, includeTimeLoc);
}
function testClearCache() {
    var cache = CacheService.getScriptCache();
    var toRemove = [DATE_ROW_CACHE_KEY, USERNAME_COL_CACHE_KEY];
    for (var i = 0; i < 100; i++) {
        toRemove.push(EVENT_INFO_CACHE_KEY_PREFIX + i);
    }
    cache.removeAll(toRemove);
}
function testSpread() {
    var x = {
        foo: "a",
        bar: "b"
    };
    var y = "hey!";
    Logger.log(JSON.stringify(__assign({ y: y }, x)));
}
function testGetUserInfo() {
    var requestUrl = SLACK_USER_INFO_URL +
        "?token=" +
        API_TOKEN.split(" ")[1] +
        "&user=U7J19UE2D";
    var response = UrlFetchApp.fetch(requestUrl);
    Logger.log(JSON.stringify(JSON.parse(response.getContentText()), undefined, 2));
}
function testPostMessage() {
    var payload = {
        channel: ANNOUNCE_CHANNEL_ID,
        text: "Hello, world!"
    };
    var options = {
        method: "post",
        contentType: "application/json",
        headers: {
            Authorization: API_TOKEN
        },
        payload: JSON.stringify(payload)
    };
    var response = UrlFetchApp.fetch(SLACK_SEND_MESSAGE_URL, options);
    Logger.log("Headers: " + JSON.stringify(response.getHeaders()));
    Logger.log("Response: " + response);
}
function testGetUserRow() {
    var user = "adchurch";
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(CURRENT_SHEET);
    var row = getUserRow(user, sheet);
    Logger.log("Row of user " + user + ": " + row);
}
function testGetNextPracticeDateCol() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(CURRENT_SHEET);
    var nextPracDate = getNextPracticeDate(sheet);
    Logger.log("Next practice date: " + nextPracDate);
}
function testGetDateText() {
    var date = new Date();
    Logger.log("Date text: " + getDateText(date) + " (for date " + date + ")");
}
// credit to https://stackoverflow.com/a/4929629
/**
 * Given a JavaScript Date object, gets the date in the format m/d/yyyy
 * @param dateObj the date to get the textual representation of
 */
function getDateText(dateObj) {
    var day = String(dateObj.getDate());
    var month = String(dateObj.getMonth() + 1); //January is 0!
    var year = dateObj.getFullYear();
    return month + "/" + day + "/" + year;
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
function makeResponseText(sheet, col, userIn) {
    // expensive but worth it for accuracy
    var eventCount = parseInt(sheet.getRange(COUNT_ROW, col).getDisplayValue());
    var response = "You're ";
    if (userIn) {
        response += "in for " + getEventDescriptionForCol(sheet, col) + "!";
        response +=
            eventCount === 1
                ? ""
                : " So far " + (eventCount - 1) + " " + (eventCount - 1 === 1 ? "other person is" : "other people are") + " in as well!";
    }
    else {
        // user out
        response += "out for " + getEventDescriptionForCol(sheet, col, false) + ".";
        response +=
            eventCount === 0
                ? ""
                : " At least " + eventCount + " " + (eventCount === 1 ? "person" : "people") + " (so far) will be missing you :cry:.";
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
function getEventDescription(event, includeTimeLoc) {
    if (includeTimeLoc === void 0) { includeTimeLoc = true; }
    if (includeTimeLoc) {
        return event.eventType + " on " + event.eventDate + " from " + event.eventTime + " at " + event.eventLocation;
    }
    return event.eventType + " on " + event.eventDate;
}
/**
 * If event is one word, makes it lowercase; otherwise does not touch case
 * @param eventName name of event from spreadsheet
 */
function fixCase(eventName) {
    if (eventName.split(" ").length > 1)
        return eventName;
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
var ColumnLocator = /** @class */ (function () {
    /**
     * Initializes empty ColumnLocator object
     */
    function ColumnLocator() {
        this.initialized = false;
    }
    /**
     * Creates a new ColumnLocator; throws an error if the input string is invalid.
     * A valid input string has the format `[date](#[offset])?`, where `[date]` is
     * in the form `m/d(/(yy)?yy)?`, and `[offset]` is a valid integer, in range [1, 9].
     * @param dateInput the input given by the user (everything after slash command but before space), or string representation from toString.
     */
    ColumnLocator.prototype.initialize = function (dateInput) {
        var _a = dateInput.split(OFFSET_SPECIFIER_PREFIX), dateStr = _a[0], offsetList = _a.slice(1); // remove offset for checking, add it back at the end
        if (dateStr.length == 0) {
            return DateParseResult.addToReason;
        }
        if (!dateStr.match(ColumnLocator.DATE_REGEX) &&
            !dateStr.match(ColumnLocator.DATE_REGEX_WITH_YEAR)) {
            return DateParseResult.addToReason;
        }
        if (dateStr.match(ColumnLocator.DATE_REGEX_WITH_YEAR)) {
            dateStr = dateStr.substring(0, dateStr.lastIndexOf("/")); // strip year
        }
        // now guaranteed that dateStr matches DATE_REGEX; add sanity check
        if (!dateStr.match(ColumnLocator.DATE_REGEX))
            throw "Assertion failed, " + dateStr + " doesn't match format";
        // append year to date to follow rep invariant
        var currentYear = new Date().getFullYear();
        dateStr = dateStr + "/" + currentYear;
        // handle offset
        var offsetStr = OFFSET_SPECIFIER_PREFIX + offsetList.join(OFFSET_SPECIFIER_PREFIX);
        if (offsetStr.length == OFFSET_SPECIFIER_PREFIX.length)
            // no offset specified, give default
            offsetStr = OFFSET_SPECIFIER_PREFIX + "1";
        var result = parseInt(offsetStr.substring(OFFSET_SPECIFIER_PREFIX.length));
        if (isNaN(result) || result < 1 || result > 9)
            return DateParseResult.addToReason;
        this.offset = offsetStr;
        this.date = dateStr;
        this.initialized = true;
        return DateParseResult.success;
    };
    /**
     * Returns the date, in the format m/d/yyyy (no leading zeroes)
     */
    ColumnLocator.prototype.getDate = function () {
        if (!this.initialized)
            throw ColumnLocator.ERROR_MESSAGE;
        return this.date;
    };
    /**
     * Returns the offset, where offset for "#n" is n - 1 (so "#2" -> 1)
     */
    ColumnLocator.prototype.getOffset = function () {
        if (!this.initialized)
            throw ColumnLocator.ERROR_MESSAGE;
        return parseInt(this.offset.substring(OFFSET_SPECIFIER_PREFIX.length)) - 1;
    };
    /**
     * Returns object in representation that can be parsed by the constructor.
     */
    ColumnLocator.prototype.toString = function () {
        if (!this.initialized)
            throw ColumnLocator.ERROR_MESSAGE;
        return this.date + this.offset;
    };
    /**
     * Returns true if object is initialized (so it has valid data), false otherwise.
     */
    ColumnLocator.prototype.isValid = function () {
        return this.initialized;
    };
    ColumnLocator.DATE_REGEX = /^1?\d\/[1-3]?\d$/i;
    ColumnLocator.DATE_REGEX_WITH_YEAR = /^1?\d\/[1-3]?\d\/(\d{2}|\d{4})$/i;
    ColumnLocator.ERROR_MESSAGE = "ColumnLocator uninitialized";
    return ColumnLocator;
}());
/**
 * Given a valid userId, fetches the URL for the 48x48 version of their profile
 * image.
 * @param userId Slack user ID, should start with "U"
 */
function getUserAvatarUrl(userId) {
    var cacheResult = tryFetchCache(userId);
    if (cacheResult.hit)
        return cacheResult.result;
    // not a hit, fetch and add to cache
    var cache = cacheResult.result;
    var requestUrl = SLACK_USER_INFO_URL + "?token=" + API_TOKEN.split(" ")[1] + "&user=" + userId;
    var userResponse = UrlFetchApp.fetch(requestUrl);
    var userInfo = JSON.parse(userResponse.getContentText());
    var result = userInfo.user.profile.image_48;
    cache.put(userId, result, CACHE_DURATION); // cache for 25 minutes
    return result;
}
