function doPost(e: PostContent): GoogleAppsScript.Content.TextOutput {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(getCurrentSheetName(ss));
  console.log("Post: " + e.postData.contents);
  console.log("Sheet: " + sheet.getName());
  try {
    const result = handleInOut(JSON.parse(e.postData.contents), sheet);
    return ContentService.createTextOutput(result);
  } catch {
    return ContentService.createTextOutput("Error with handling in/out");
  }
}

/**
 * Handles requests for information from spreadsheet
 *  - event-count: gives the count for the given date. Returns an error if the
 * date is invalid.
 *  - event-info: gives the event information for the given date. Returns an
 * error if the date is nonempty and invalid.
 * @param e get request body
 */
function doGet(e: GetContent): GoogleAppsScript.Content.TextOutput {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(getCurrentSheetName(ss));
  try {
    switch (e.parameter.method) {
      case GOOGLE_EVENT_COUNT_NAME: {
        console.log("Getting event count");
        const date = (e.parameter.value as string).replace(
          URL_SAFE_OFFSET_SPECIFIER_PREFIX,
          OFFSET_SPECIFIER_PREFIX
        );
        const dateObj = new ColumnLocator();
        const result = dateObj.initialize(date);
        const invalidDateErrorResult = JSON.stringify({
          ok: false,
          payload: "invalid date",
        });
        if (result === DateParseResult.addToReason) {
          return ContentService.createTextOutput(invalidDateErrorResult);
        }
        let dateCol = -1;
        try {
          dateCol = getDateCol(dateObj, sheet);
        } catch (err) {
          return ContentService.createTextOutput(invalidDateErrorResult);
        }
        return ContentService.createTextOutput(
          JSON.stringify({
            ok: true,
            payload: parseInt(sheet.getRange(COUNT_ROW, dateCol).getDisplayValue()),
          })
        );
      }
      case GOOGLE_EVENT_INFO_NAME: {
        console.log("Getting event info for " + JSON.stringify(e.parameter));
        const date = (e.parameter.value as string).replace(
          URL_SAFE_OFFSET_SPECIFIER_PREFIX,
          OFFSET_SPECIFIER_PREFIX
        );
        const dateObj = new ColumnLocator();
        dateObj.initialize(date);
        if (!dateObj.isValid() && date.length > 0)
          throw new Error("invalid date string " + date);
        console.log(
          `For date: ${(dateObj.isValid() && dateObj.toString()) || "unspecified"}`
        );
        try {
          let dateCol = getDateCol(dateObj, sheet);
          const eventInfo = getEventInfoFromCol(sheet, dateCol);
          return ContentService.createTextOutput(
            JSON.stringify({
              ok: true,
              payload: eventInfo,
            })
          );
        } catch {
          return ContentService.createTextOutput(
            JSON.stringify({
              ok: false,
              payload: `Error getting event info for date ${date}`,
            })
          );
        }
      }
      case GOOGLE_CLEAR_CACHE_NAME:
        clearCache();
      case GOOGLE_GET_ADMINS_NAME: {
        const admins = getAdminNames(ss);
        console.log("Got admins:", JSON.stringify(admins));
        return ContentService.createTextOutput(
          JSON.stringify({ ok: true, payload: admins })
        );
      }
      default:
        return ContentService.createTextOutput(
          JSON.stringify({ ok: false, payload: "invalid method name" })
        );
    }
  } catch (err) {
    console.log(err);
    return ContentService.createTextOutput(
      JSON.stringify({
        ok: false,
        payload: `unspecified error: ${err.message || err}`,
      })
    );
  }
}
