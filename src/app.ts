import { Request, Response, NextFunction } from "express";
import fetch from "node-fetch";
import express = require("express");
import bodyParser = require("body-parser");
import * as Constants from "./constants";
import * as Enums from "./enums";
import * as Types from "./interfaces";
import { handleInOut } from "./io";
import { handleAnnounce, updateAnnouncement } from "./announce";
import { getSlashCommand } from "./text";
import { handleBlockAction, handleViewSubmission } from "./interactive";
import { clearCache } from "./spreadsheet";

const app = express();
let port = process.env.PORT as unknown;
if (port == null || port == "") {
  port = 8000;
}
app.listen(port, () => console.log(`Listening on port ${port}`));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(bodyParser.text());
app.use((req: Request, res: Response, next: NextFunction) => {
  // send acknowledgement response, before message info
  console.log(`Acknowledging request to ${req.url} with method ${req.method}`);
  if (req.method === "POST") res.status(200).send("");
  next();
});

app.get("/", (_, res: Response) => {
  res.status(200).send("This is just a Slack app. Nothing to see here!");
});

app.get("/privacy", (_, res: Response) => {
  res.status(200).type("html").send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Privacy Policy | AttendanceBot</title>
  </head>
  <body>
    <main>
      <h1>AttendanceBot Privacy Policy</h1>
      <p><strong>Effective date:</strong> October 28, 2026</p>
      <p>AttendanceBot helps teams manage event attendance through Slack and a configured Google spreadsheet.</p>
      <h2>Information we process</h2>
      <p>When you use AttendanceBot, it processes Slack information needed to respond to your request, such as your Slack user name and ID, command or button input, attendance status, and any note you submit. It reads and updates attendance and event information in the spreadsheet configured by the team. The service also creates operational logs when handling requests.</p>
      <h2>How information is used and shared</h2>
      <p>Information is used to provide attendance features, update the configured spreadsheet, and operate and troubleshoot the service. Attendance information is visible to people who have access to that spreadsheet. AttendanceBot does not sell personal information. It relies on Slack, Google, and its hosting provider to deliver the service; those providers process information under their own terms and privacy policies.</p>
      <h2>Retention and security</h2>
      <p>Attendance entries and notes remain in the configured spreadsheet until its administrators change or remove them. Operational logs may be retained by the service or its hosting provider. Reasonable measures are used to protect service data, but no method of transmission or storage is completely secure.</p>
      <h2>Your choices and contact</h2>
      <p>For questions or requests about information in the attendance spreadsheet, contact your team’s spreadsheet administrator. For questions about AttendanceBot, contact <a href="mailto:chu.andrew.8@gmail.com">chu.andrew.8@gmail.com</a>.</p>
    </main>
  </body>
</html>`);
});

app.post("/slash", (req: Request, res: Response) => {
  console.log("Got slash req");
  handleSlashCommandPost(req.body);
});

app.post("/interactive", (req: Request, res: Response) => {
  console.log("Got interactive req");
  handleInteractivePost(req.body);
});

// credit to https://davidwalsh.name/using-slack-slash-commands-to-send-data-from-slack-into-google-sheets
/**
 * This method is called any time a POST request from a slash command is sent to this script's URL.
 * It handles the post request and sends the appropriate response to the user.
 *
 * @param body parameters from post request
 */
function handleSlashCommandPost(body: Types.SlackSlashCommandInfo): void {
  // data to fetch from command, to pass to spreadsheet handlers
  const context: Types.ResponseContext = {
    username: body.user_name,
    text: body.text,
    command: getSlashCommand(body.command),
  };
  const responseInfo: Types.ResponseCustomization = {
    toUrl: body.response_url,
    userId: body.user_id,
  };
  console.log(
    "Slash command context after processing: " + JSON.stringify(context, undefined, 2)
  );
  if (
    context.command === Enums.SlashCommand.in ||
    context.command === Enums.SlashCommand.out
  ) {
    handleInOut(context, responseInfo, function () {}).then(() => {
      console.log("Handled in/out");
    });
  } else if (context.command === Enums.SlashCommand.announce) {
    clearCache();
    handleAnnounce(context, responseInfo)
      .then(() => {
        console.log("Handled announce");
      })
      .catch((e) =>
        sendResponse(
          Constants.FAILURE_RESPONSE + `(error handling announce) ${e.message || e}`,
          responseInfo
        )
      );
  } else if (context.command === Enums.SlashCommand.help) {
    sendResponse(Constants.HELP_TEXT, responseInfo);
  } else if (context.command === Enums.SlashCommand.clearCache) {
    clearCache()
      .then(() => sendResponse("Cleared cache", responseInfo))
      .catch((e) =>
        sendResponse(`Failed to clear cache: ${e.message || e}`, responseInfo)
      );
  } else {
    sendResponse(Constants.FAILURE_RESPONSE + "unsupported command", responseInfo);
  }
}

/**
 * This method is called any time a POST request from an interactive event is
 * sent to this script's URL. It handles the post request and sends the
 * appropriate response to the user.
 *
 * @param body parameters from post request
 */
function handleInteractivePost(body: Types.SlackInteractiveInfo): void {
  console.log("Response to button click");
  let payload = body.payload;
  let json: Types.SlackMessagePayload = JSON.parse(payload);
  if (json.type === "block_actions") {
    // clicked button in message
    handleBlockAction(json);
  } else if (json.type === "view_submission") {
    // modal submission;
    handleViewSubmission(json);
  }
}

/**
 * Sends a response with the given text as an ephemeral message to that URL
 * (this would be to avoid sending a public response to an event).
 * @param text content of message to send to user
 * @param responseInfo contains URL to send message to (if applicable) and user ID to send to (if applicable).
 */
export function sendResponse(
  text: string,
  responseInfo: Types.ResponseCustomization
): void {
  let payload: Types.SlackMessageSendInfo = {
    text: text,
    response_type: "ephemeral",
    user: responseInfo.userId, // will be specified when necessary
    channel: Constants.ANNOUNCE_CHANNEL_ID,
    replace_original: false,
  };
  fetch(responseInfo.toUrl, {
    method: "POST",
    body: JSON.stringify(payload),
    headers: {
      Authorization: Constants.API_TOKEN,
      ...Constants.JSON_CONTENT_HEADERS,
    },
  }).then(() => {
    console.log("Posted response message");
  });
}
