// credit to https://davidwalsh.name/using-slack-slash-commands-to-send-data-from-slack-into-google-sheets
/**
 * This method is called any time a POST request is sent to this script's URL.
 * It handles the post request and sends the appropriate response to the user.
 *
 * @param e parameters from post request
 */
// function doPost(e: PostContent): GoogleAppsScript.Content.TextOutput {
//   if (typeof e !== "undefined") {
//     // valid post request
//     // collect command details
//     let ss = SpreadsheetApp.getActiveSpreadsheet();
//     let sheet = ss.getSheetByName(CURRENT_SHEET);

//     // data to fetch from command, to pass to spreadsheet handlers
//     let context: ResponseContext = {
//       username: "",
//       text: "",
//       command: SlashCommand.none
//     };
//     let responseInfo: ResponseCustomization = {
//       toUrl: "",
//       userId: ""
//     };
//     let updateInfo: AnnouncementUpdateInfo = undefined;

//     if ("payload" in e.parameter) {
//       // from button click or modal response
//       console.log("Response to button click");
//       let payload = e.parameter.payload;
//       let json: SlackMessagePayload = JSON.parse(payload);
//       if (json.type === "block_actions") {
//         updateInfo = {
//           eventInfo: JSON.parse(json.actions[0].value),
//           userId: json.user.id,
//           messageTimestamp: json.container.message_ts,
//           addUser: true
//         };
//         // clicked button in message
//         // simulate slash command request
//         if (json.actions[0].text.text === "In") {
//           // in button clicked
//           // user in
//           console.log("User clicked in");
//           context = {
//             username: json.user.username,
//             text: updateInfo.eventInfo.dateForColumnLocator, // date
//             command: SlashCommand.in
//           };
//           responseInfo.toUrl = json.response_url;
//         } else {
//           // user out
//           console.log("User clicked out");
//           // set up modal, exit
//           updateInfo.addUser = false;
//           let trigger = json.trigger_id;
//           openModal(trigger, updateInfo, sheet);
//           return;
//         }
//       } else if (json.type === "view_submission") {
//         // modal submission; start by getting details
//         console.log("User submitted modal response");
//         // create out response
//         let response: string =
//           json.view.state.values[REASON_BLOCK_ID][REASON_ACTION_ID].value;
//         let parsedUpdateInfo = JSON.parse(
//           json.view.private_metadata
//         ) as AnnouncementUpdateInfo;
//         context = {
//           username: json.user.username,
//           text: `${parsedUpdateInfo.eventInfo.dateForColumnLocator} ${response}`,
//           command: SlashCommand.out
//         };
//         responseInfo = {
//           toUrl: SLACK_SEND_EPHEMERAL_URL,
//           userId: json.user.id
//         };
//         updateInfo = parsedUpdateInfo;
//       }
//     } else {
//       // from slash command
//       switch (e.parameter.command) {
//         case "/in":
//           context.command = SlashCommand.in;
//           break;
//         case "/out":
//           context.command = SlashCommand.out;
//           break;
//         case "/announce":
//           context.command = SlashCommand.announce;
//           break;
//         case "/h":
//           context.command = SlashCommand.help;
//           break;
//         default:
//           // should never happen
//           return sendResponse(FAILURE_RESPONSE + "unimplemented slash command");
//       }
//       context.username = e.parameter.user_name;
//       context.text = e.parameter.text;
//       console.log(
//         "Context after processing: " + JSON.stringify(context, undefined, 2)
//       );
//     }
//     if (
//       context.command === SlashCommand.in ||
//       context.command === SlashCommand.out
//     ) {
//       return handleInOut(context, sheet, responseInfo, () =>
//         updateAnnouncement(updateInfo, sheet)
//       );
//     } else if (context.command === SlashCommand.announce) {
//       return handleAnnounce(context, sheet);
//     } else if (context.command === SlashCommand.help) {
//       return sendResponse(HELP_TEXT);
//     }
//   }
//   return sendResponse(FAILURE_RESPONSE + "right off the bat");
// }

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
// function sendResponse(
//   text: string,
//   responseInfo?: ResponseCustomization
// ): GoogleAppsScript.Content.TextOutput {
//   if (responseInfo && responseInfo.toUrl) {
//     let payload: SlackMessageSendInfo = {
//       text: text,
//       response_type: "ephemeral",
//       user: responseInfo.userId, // will be specified when necessary
//       channel: ANNOUNCE_CHANNEL_ID,
//       replace_original: false
//     };
//     let options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
//       method: "post",
//       contentType: "application/json",
//       headers: {
//         Authorization: API_TOKEN
//       },
//       payload: JSON.stringify(payload)
//     };
//     UrlFetchApp.fetch(responseInfo.toUrl, options);
//     console.log("Posted response message");
//     return ContentService.createTextOutput("");
//   } else {
//     console.log("Sending response");
//     return ContentService.createTextOutput(text);
//   }
// }

function doPost(e: PostContent): GoogleAppsScript.Content.TextOutput {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CURRENT_SHEET);
  console.log("Post: " + e.postData.contents);
  try {
    const result = handleInOut(JSON.parse(e.postData.contents), sheet);
    return ContentService.createTextOutput(result);
  }
}

function doGet(e: GetContent): GoogleAppsScript.Content.TextOutput {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CURRENT_SHEET);
  try {
    if (e.parameter.method === GOOGLE_EVENT_INFO_NAME) {
      const date = e.parameter.value as string;
      const dateObj = new ColumnLocator();
      const result = dateObj.initialize(date);
      const invalidDateErrorResult = JSON.stringify({
        ok: false,
        payload: "invalid date"
      });
      if (date.length > 0 && result === DateParseResult.addToReason) {
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
          payload: parseInt(
            sheet.getRange(COUNT_ROW, dateCol).getDisplayValue()
          )
        })
      );
    } else if (e.parameter.method === GOOGLE_EVENT_COUNT_NAME) {
      const date = e.parameter.value as string;
      const dateObj = new ColumnLocator();
      dateObj.initialize(date);
      if (!dateObj.isValid()) throw "invalid date string " + date;
    } else {
      return ContentService.createTextOutput(
        JSON.stringify({ ok: false, payload: "invalid method name" })
      );
    }
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({
        ok: false,
        payload: `unspecified error: ${err.message || err}`
      })
    );
  }
}
