/**
 * Given some user interaction making a change to their attendance status (could
 * be slash command, button click, or modal submit), updates the spreadsheet
 * and sends a response with information about the update.
 * @param context information from user's response
 * @param sheet current sheet
 * @param responseInfo customization for where to send eventual response
 */
function handleInOut(
  context: ResponseContext,
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  responseInfo: ResponseCustomization,
  beforeSuccessfulChange: Function
): GoogleAppsScript.Content.TextOutput {
  // collect data from slash command
  let username = context.username;
  let dateStr = context.text.split(" ")[0]; // if first word is not date, handled below
  let reason =
    context.text
      .split(" ")
      .slice(1)
      .join(" ") || ""; // every word but first, or empty if 0/1 words
  let userIn = context.command === Command.in;
  let offset = 0;

  // flags for whether to add various alerts after response
  let spreadsheetUnchanged = false;
  let addIgnoreYearReminder = false;
  let addLateChangeAlert = false;
  let addPastChangeAlert = false;
  let addNoteAddedAlert = false;
  let addBlackedOutAlert = false;

  console.log(
    `User ${username}: ${context.command.toString()} ${dateStr} ${reason}`
  );

  // ensure user input is valid: handle date
  let [date, ...rest] = dateStr.split(OFFSET_SPECIFIER_PREFIX); // remove offset for checking, add it back at the end
  if (date.length > 0 && !date.match(/^[1-3]?\d\/[1-3]?\d$/i)) {
    // doesn't match m/d format, no leading 0's
    if (date.match(/^[1-3]?\d\/[1-3]?\d\/(\d{2}|\d{4})$/i)) {
      // matches m/d/yyyy or m/d/yy format; just strip year
      date = date.substring(0, date.lastIndexOf("/"));
      addIgnoreYearReminder = true;
    } else {
      // assume date is meant to be part of reason; now defaulting to closest date
      reason = date + (reason ? " " + reason : "");
      date = "";
      addNoteAddedAlert = true;
      offset = 0; // any offset calculation before doesn't make sense, as offset can only come with date
    }
  }
  // append year to date (if not empty), to properly look up in spreadsheet
  let currentYear = new Date().getFullYear();
  if (date.length > 0) date = `${date}/${currentYear}`;
  date = [date, ...rest].join(OFFSET_SPECIFIER_PREFIX); // replace offset; if it's invalid error will be thrown when fetching date row

  if (!userIn && reason.length == 0) {
    // trying to /out without a reason SMH
    return sendResponse(FAILURE_RESPONSE + NO_REASON_ERROR, responseInfo);
  }

  // fetch info, update spreadsheet
  let colUpdated: number; // need outside of try/catch scope, for later
  try {
    const row = getUserRow(username, sheet);
    const col = getDateCol(date, sheet) + offset;
    const cell = sheet.getRange(row, col);
    if (cell.getBackground() === BLACK_COLOR)
      // cell blacked out
      addBlackedOutAlert = true;
    if (userIn) {
      if (cell.getDisplayValue() === "y" && cell.getNote() === reason)
        spreadsheetUnchanged = true;
      cell.setNote(reason);
      cell.setValue("y");
    } else {
      if (cell.getDisplayValue() === "n" && cell.getNote() === reason)
        spreadsheetUnchanged = true;
      cell.setNote(reason);
      cell.setValue("n");
    }
    console.log(`Success: updated (row ${row}, col ${col})`);
    colUpdated = col;
  } catch (err) {
    console.log("Error updating spreadsheet: ", err);
    return sendResponse(FAILURE_RESPONSE + (err.message || err), responseInfo);
  }

  // check if the update is coming pretty late (after 10pm day before), or for past event
  // fails silently, in case of weird formatted date on attendance spreadsheet who cares
  try {
    const eventDate = getEventInfoFromCol(sheet, colUpdated).eventDate;
    let updateBefore = new Date(eventDate); // assumes date string is m/d/yyyy
    updateBefore.setTime(updateBefore.getTime() - TWO_HOURS); // 10pm the day before
    let nextDay = new Date(eventDate);
    nextDay.setTime(nextDay.getTime() + ONE_DAY); // midnight the next day
    const today = new Date();
    if (!userIn && updateBefore < today) {
      addLateChangeAlert = true;
      console.log("Alerting user about late change");
    }
    if (nextDay < today) addPastChangeAlert = true;
  } catch (err) {
    console.log("Error checking if update came too late: " + err);
  }

  // get data about event from spreadsheet to form response
  let response = makeResponseText(sheet, colUpdated, userIn);
  if (addBlackedOutAlert) response = response + BLACKED_OUT_ALERT;
  if (addLateChangeAlert) response = response + LATE_CHANGE_ALERT;
  if (addPastChangeAlert) response = response + PAST_CHANGE_ALERT;
  if (addIgnoreYearReminder) response = response + IGNORE_YEAR_REMINDER;
  if (addNoteAddedAlert) {
    response =
      response +
      '\n:information_source: Added note "' +
      reason +
      '" to your cell';
  }
  beforeSuccessfulChange();
  return sendResponse(
    (spreadsheetUnchanged ? NO_CHANGE_RESPONSE : SUCCESS_RESPONSE) + response,
    responseInfo
  );
}
