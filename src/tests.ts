function testClearCache(): void {
  const cache = CacheService.getScriptCache();
  let toRemove = [DATE_ROW_CACHE_KEY, USERNAME_COL_CACHE_KEY];
  for (let i = 0; i < 100; i++) {
    toRemove.push(EVENT_INFO_CACHE_KEY_PREFIX + i);
  }
  cache.removeAll(toRemove);
}

function testSpread(): void {
  let x = {
    foo: "a",
    bar: "b"
  };
  let y = "hey!";
  Logger.log(JSON.stringify({ y, ...x }));
}

function testGetUserInfo(): void {
  let requestUrl =
    SLACK_USER_INFO_URL +
    "?token=" +
    API_TOKEN.split(" ")[1] +
    "&user=U7J19UE2D";
  let response = UrlFetchApp.fetch(requestUrl);
  Logger.log(
    JSON.stringify(JSON.parse(response.getContentText()), undefined, 2)
  );
}

function testPostMessage(): void {
  let payload = {
    channel: ANNOUNCE_CHANNEL_ID,
    text: "Hello, world!"
  };
  let options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
    method: "post",
    contentType: "application/json",
    headers: {
      Authorization: API_TOKEN
    },
    payload: JSON.stringify(payload)
  };
  let response = UrlFetchApp.fetch(SLACK_SEND_MESSAGE_URL, options);
  Logger.log("Headers: " + JSON.stringify(response.getHeaders()));
  Logger.log("Response: " + response);
}

function testGetUserRow(): void {
  let user = "adchurch";
  let ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CURRENT_SHEET);
  let row = getUserRow(user, sheet);
  Logger.log("Row of user " + user + ": " + row);
}

function testGetNextPracticeDateCol(): void {
  let ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CURRENT_SHEET);
  let nextPracDate = getNextPracticeDate(sheet);
  Logger.log("Next practice date: " + nextPracDate);
}

function testGetDateText(): void {
  let date = new Date();
  Logger.log("Date text: " + getDateText(date) + " (for date " + date + ")");
}
