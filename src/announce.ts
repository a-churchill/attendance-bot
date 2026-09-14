import fetch from "node-fetch";

import { sendResponse } from "./app";
import * as Constants from "./constants";
import * as Types from "./interfaces";
import { getAdmins, getEventCount, getEventInfo } from "./spreadsheet";
import { ColumnLocator, getEventDescription, parseAnnounceNote } from "./text";
import { getUserAvatarUrl } from "./user";

/**
 * Handles an event announcement request, coming from a "/announce" command. Returns the
 * response to send to the user who initiated the announcement.
 * @param context info for event to send announcement for
 * @param sheet current sheet
 */
export async function handleAnnounce(
  context: Types.ResponseContext,
  responseInfo: Types.ResponseCustomization
) {
  // make sure user is authorized
  const admins = await getAdmins();
  if (!admins.includes(context.username)) {
    const response =
      Constants.ANNOUNCE_FAILURE_RESPONSE +
      "you're not authorized to announce practices.";
    return sendResponse(response, responseInfo);
  }
  // send announcement
  try {
    let note = context.text;
    if (note === "help")
      return sendResponse(Constants.ANNOUNCE_HELP_TEXT, responseInfo);

    // gets event info for next event
    const eventInfoStr = await getEventInfo(null);
    console.log("Next event info string:");
    console.log(eventInfoStr);
    let body = JSON.parse(eventInfoStr) as Types.GoogleResponse<Types.EventInfo>;
    if (!body.ok) {
      // request failed
      throw new Error("Request failed: " + JSON.stringify(body.payload));
    }

    // parse announce text, fetch new event info if necessary
    const { newNote, date } = parseAnnounceNote(note, body.payload.eventDate);
    if (newNote !== note) {
      // parsed offset in note, fetch new event info
      const newEventInfoStr = await getEventInfo(date);
      console.log("Selected event info string:");
      console.log(newEventInfoStr);
      body = JSON.parse(newEventInfoStr) as Types.GoogleResponse<Types.EventInfo>;
    }
    let eventInfo = { note: newNote, ...body.payload };
    eventInfo = { dateForColumnLocator: date.toString(), ...eventInfo };
    sendAnnouncement(eventInfo);
    return sendResponse(
      Constants.ANNOUNCE_SUCCESS_RESPONSE + getEventDescription(eventInfo),
      responseInfo
    );
  } catch (err) {
    return sendResponse(
      Constants.ANNOUNCE_FAILURE_RESPONSE +
        "(error in announce code) " +
        (err.message || err),
      responseInfo
    );
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
function makeAnnouncementBlocks(eventInfo: Types.EventInfo): Array<Types.SlackBlock> {
  // make context block
  let avatarCount = (eventInfo.userAvatars || []).length;
  let contextBlock: Types.SlackBlock = {
    type: "context",
    elements: [
      {
        type: "plain_text",
        emoji: true,
        text:
          avatarCount > 0
            ? `+ ${eventInfo.count - avatarCount} more already in`
            : `${eventInfo.count} already in`,
      },
    ],
  };
  if (avatarCount > 0 && eventInfo.userAvatars) {
    eventInfo.userAvatars.forEach((userInfo: string) => {
      const userAvatarInfo: Types.UserAvatarInfo = JSON.parse(userInfo);
      if (contextBlock.elements) {
        contextBlock.elements.unshift({
          type: "image",
          image_url: userAvatarInfo.im,
          alt_text: userAvatarInfo.name,
        });
      }
    });
  }
  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: Constants.ANNOUNCE_HEADER_TEXT,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text:
          "*What:* " +
          eventInfo.eventType +
          "\n*When:* " +
          eventInfo.eventDate +
          ", " +
          eventInfo.eventTime +
          "\n*Where:* " +
          eventInfo.eventLocation +
          (eventInfo.note ? "\n*Note:* " + eventInfo.note : ""),
      },
      accessory: {
        type: "image",
        image_url: Constants.ANNOUNCE_PICTURE_URL,
        alt_text: "frisbee",
      },
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
            text: "In",
          },
          style: "primary",
          value: JSON.stringify(eventInfo),
        },
        {
          type: "button",
          action_id: "out " + eventInfo.dateForColumnLocator,
          text: {
            type: "plain_text",
            emoji: true,
            text: "Out",
          },
          style: "danger",
          value: JSON.stringify(eventInfo),
        },
      ],
    },
  ];
}

// actually needs: EventInfo, user id, message_ts, add/remove flag
/**
 * Updates the announcement message with the avatar of the user who just clicked in.
 * @param updateInfo information necessary to update announcement
 * @param sheet current sheet, for fetching updated event count
 */
export async function updateAnnouncement(updateInfo: Types.AnnouncementUpdateInfo) {
  console.log("Updating announcement");
  console.log(JSON.stringify(updateInfo));
  if (typeof updateInfo === "undefined") return;
  let eventInfo = updateInfo.eventInfo;
  // get user info, set up avatars array
  const userAvatar = await getUserAvatarUrl(updateInfo.userId);
  if (typeof eventInfo.userAvatars === "undefined") {
    eventInfo.userAvatars = [];
  }
  const userIndexInList = eventInfo.userAvatars.indexOf(userAvatar);
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
  const date = new ColumnLocator();
  date.initialize(eventInfo.dateForColumnLocator || "");
  // expensive but worth it to allow up-to-date announcement message
  console.log("Getting event-count for " + date.toString());
  const countStr = await getEventCount(date);
  const count = JSON.parse(countStr).payload as number;
  eventInfo.count = count;
  let payload: Types.SlackMessageUpdateInfo = {
    channel: Constants.ANNOUNCE_CHANNEL_ID,
    text: Constants.ANNOUNCE_HEADER_TEXT,
    blocks: makeAnnouncementBlocks(eventInfo),
    ts: updateInfo.messageTimestamp,
  };
  fetch(Constants.SLACK_UPDATE_MESSAGE_URL, {
    method: "POST",
    body: JSON.stringify(payload),
    headers: {
      Authorization: Constants.API_TOKEN,
      ...Constants.JSON_CONTENT_HEADERS,
    },
  })
    .then((res) => res.json())
    .then((json) => console.log("Received announcement update response"));
}

/**
 * Sends an announcement of the event to the announce channel. Does not check the
 * spreadsheet, just sends an announcement with the given event info.
 * @param originalEventInfo must requirements from makeAnnouncementBlocks
 */
function sendAnnouncement(originalEventInfo: Types.EventInfo): void {
  // collect event data
  let eventInfo: Types.EventInfo = {
    ...originalEventInfo,
    userAvatars: [],
  };
  // strip year from event date
  eventInfo.eventDate = eventInfo.eventDate.substring(
    0,
    eventInfo.eventDate.lastIndexOf("/")
  );
  const blocks = makeAnnouncementBlocks(eventInfo);
  let payload: Types.SlackMessageSendInfo = {
    channel: Constants.ANNOUNCE_CHANNEL_ID,
    text: Constants.ANNOUNCE_HEADER_TEXT + " " + eventInfo.note,
    blocks,
  };
  fetch(Constants.SLACK_SEND_MESSAGE_URL, {
    method: "POST",
    body: JSON.stringify(payload),
    headers: {
      Authorization: Constants.API_TOKEN,
      ...Constants.JSON_CONTENT_HEADERS,
    },
  })
    .then((res) => res.json())
    .then((json) => console.log("Announcement post response received"));
}
