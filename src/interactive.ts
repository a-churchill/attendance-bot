import * as Constants from "./constants";
import * as Enums from "./enums";
import * as Types from "./interfaces";
import { handleInOut } from "./io";
import { ColumnLocator } from "./text";
import { updateAnnouncement } from "./announce";
import fetch from "node-fetch";

export function handleBlockAction(json: Types.SlackMessagePayload): void {
  const updateInfo: Types.AnnouncementUpdateInfo = {
    eventInfo: JSON.parse(json.actions[0].value),
    userId: json.user.id,
    messageTimestamp: json.container?.message_ts || "", // should never be empty
    addUser: true,
  };
  // clicked button in message
  // simulate slash command request
  if (json.actions[0].text.text === "In") {
    // in button clicked
    // user in
    console.log("User clicked in");
    const context: Types.ResponseContext = {
      username: json.user.username,
      text: updateInfo.eventInfo.dateForColumnLocator || "", // date
      command: Enums.SlashCommand.in,
    };
    const responseInfo: Types.ResponseCustomization = {
      toUrl: json.response_url || "",
      userId: "",
    };
    handleInOut(context, responseInfo, function () {
      updateAnnouncement(updateInfo);
    }).then(() => {
      console.log("Handled in/out from message button click");
    });
  } else {
    // user out
    console.log("User clicked out");
    // set up modal, exit
    updateInfo.addUser = false;
    let trigger = json.trigger_id;
    openModal(trigger, updateInfo);
  }
}

export function handleViewSubmission(json: Types.SlackMessagePayload): void {
  // start by getting details
  console.log("User submitted modal response");
  // create out response
  let response: string =
    json.view?.state?.values[Constants.REASON_BLOCK_ID][Constants.REASON_ACTION_ID]
      .value;
  const updateInfo = JSON.parse(
    json.view?.private_metadata || ""
  ) as Types.AnnouncementUpdateInfo;
  const context: Types.ResponseContext = {
    username: json.user.username,
    text: `${updateInfo.eventInfo.dateForColumnLocator} ${response}`,
    command: Enums.SlashCommand.out,
  };
  const responseInfo = {
    toUrl: Constants.SLACK_SEND_EPHEMERAL_URL,
    userId: json.user.id,
  };
  handleInOut(context, responseInfo, function () {
    updateAnnouncement(updateInfo);
  }).then(() => {
    console.log("Handled in/out from modal button click");
  });
}

/**
 * Opens a modal window with a single line text box, submit and cancel buttons.
 * Intended for user to input their reason for missing practice.
 * @param trigger modal trigger for Slack API
 * @param date the date of the practice the user is missing
 * @param updateInfo the info needed to update the announcement message after submission of the modal
 */
async function openModal(trigger: string, updateInfo: Types.AnnouncementUpdateInfo) {
  // fetch event info to fill cache
  const col = new ColumnLocator();
  col.initialize(updateInfo.eventInfo.dateForColumnLocator || "");
  const payload = {
    trigger_id: trigger,
    view: {
      type: "modal",
      callback_id: "out_explanation",
      title: {
        type: "plain_text",
        text: "Explanation",
        emoji: true,
      },
      submit: {
        type: "plain_text",
        text: "Submit",
        emoji: true,
      },
      close: {
        type: "plain_text",
        text: "Cancel",
        emoji: true,
      },
      private_metadata: JSON.stringify(updateInfo),
      blocks: [
        {
          type: "input",
          block_id: Constants.REASON_BLOCK_ID,
          label: {
            type: "plain_text",
            text: "Please give a reason for missing practice:",
            emoji: true,
          },
          element: {
            type: "plain_text_input",
            multiline: false,
            placeholder: {
              type: "plain_text",
              text: "Your explanation here",
              emoji: true,
            },
            action_id: Constants.REASON_ACTION_ID,
          },
        },
      ],
    },
  };
  await fetch(Constants.SLACK_OPEN_MODAL_URL, {
    method: "POST",
    body: JSON.stringify(payload),
    headers: {
      Authorization: Constants.API_TOKEN,
      ...Constants.JSON_CONTENT_HEADERS,
    },
  });
  console.log("Got response to modal post");
}
