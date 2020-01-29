// credit to https://davidwalsh.name/using-slack-slash-commands-to-send-data-from-slack-into-google-sheets
/**
 * This method is called any time a POST request is sent to this script's URL.
 * It handles the post request and sends the appropriate response to the user.
 *
 * @param e parameters from post request
 */
function doPost(e: PostContent): GoogleAppsScript.Content.TextOutput {
  if (typeof e !== "undefined") {
    // valid post request
    // collect command details
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(CURRENT_SHEET);

    // data to fetch from command, to pass to spreadsheet handlers
    let context: ResponseContext = {
      username: "",
      text: "",
      command: Command.none
    };
    let responseInfo: ResponseCustomization = {
      toUrl: "",
      userId: ""
    };
    let updateInfo: AnnouncementUpdateInfo = undefined;

    if ("payload" in e.parameter) {
      // from button click or modal response
      console.log("Response to button click");
      let payload = e.parameter.payload;
      let json: SlackMessagePayload = JSON.parse(payload);
      if (json.type === "block_actions") {
        updateInfo = {
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
            text: json.actions[0].action_id.split(" ")[1], // date
            command: Command.in
          };
          responseInfo.toUrl = json.response_url;
        } else {
          // user out
          console.log("User clicked out");
          // set up modal, exit
          updateInfo.addUser = false;
          let trigger = json.trigger_id;
          let date = json.actions[0].action_id.split(" ")[1]; // date
          openModal(trigger, date, updateInfo);
          return;
        }
      } else if (json.type === "view_submission") {
        // modal submission; start by getting details
        console.log("User submitted modal response");
        // create out response
        let response: string =
          json.view.state.values[REASON_BLOCK_ID][REASON_ACTION_ID].value;
        let { date, ...parsedUpdateInfo } = JSON.parse(
          json.view.private_metadata
        );
        context = {
          username: json.user.username,
          text: `${date} ${response}`,
          command: Command.out
        };
        responseInfo = {
          toUrl: SLACK_SEND_EPHEMERAL_URL,
          userId: json.user.id
        };
        updateInfo = parsedUpdateInfo;
      }
    } else {
      // from slash command
      switch (e.parameter.command) {
        case "/in":
          context.command = Command.in;
          break;
        case "/out":
          context.command = Command.out;
          break;
        case "/announce":
          context.command = Command.announce;
          break;
        case "/h":
          context.command = Command.help;
          break;
        default:
          // should never happen
          context.command = Command.none;
      }
      context.username = e.parameter.user_name;
      context.text = e.parameter.text;
      console.log(
        "Context after processing: " + JSON.stringify(context, undefined, 2)
      );
    }
    if (context.command === Command.in || context.command === Command.out) {
      return handleInOut(context, sheet, responseInfo, () =>
        updateAnnouncement(updateInfo, sheet)
      );
    } else if (context.command === Command.announce) {
      return handleAnnounce(context, sheet);
    } else if (context.command === Command.help) {
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
function sendResponse(
  text: string,
  responseInfo?: ResponseCustomization
): GoogleAppsScript.Content.TextOutput {
  if (responseInfo && responseInfo.toUrl) {
    let payload: SlackMessageSendInfo = {
      text: text,
      response_type: "ephemeral",
      user: responseInfo.userId, // will be specified when necessary
      channel: ANNOUNCE_CHANNEL_ID,
      replace_original: false
    };
    let options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
      method: "post",
      contentType: "application/json",
      headers: {
        Authorization: API_TOKEN
      },
      payload: JSON.stringify(payload)
    };
    let response = UrlFetchApp.fetch(responseInfo.toUrl, options);
    console.log("Response to message post: " + response);
    return ContentService.createTextOutput("");
  } else {
    return ContentService.createTextOutput(text);
  }
}
