/**
 * Handles an event announcement request, coming from a "/announce" command. Returns the
 * response to send to the user who initiated the announcement.
 * @param context info for event to send announcement for
 * @param sheet current sheet
 */
function handleAnnounce(
  context: ResponseContext,
  sheet: GoogleAppsScript.Spreadsheet.Sheet
): GoogleAppsScript.Content.TextOutput {
  // make sure user is authorized
  if (AUTHORIZED_ANNOUNCERS.indexOf(context.username) === -1) {
    return sendResponse(
      ANNOUNCE_FAILURE_RESPONSE + "you're not authorized to announce practices."
    );
  }
  // send announcement
  try {
    let col = getNextPracticeDateCol(sheet);
    let note = context.text;
    if (note === "help") return sendResponse(ANNOUNCE_HELP_TEXT);
    let offset = "";
    if (note.charAt(0) === OFFSET_SPECIFIER_PREFIX) {
      // specified offset
      offset = note.split(" ")[0];
      col += getNumberFromOffset(offset);
      note = note
        .split(" ")
        .slice(1)
        .join(" "); // remove offset from note
      console.log(
        `Offset of ${offset} (col is now ${col}); remaining note: ${note}`
      );
    }
    let eventDescription = getEventDescriptionForCol(sheet, col);
    sendAnnouncement(sheet, col, note, offset);
    return sendResponse(ANNOUNCE_SUCCESS_RESPONSE + eventDescription);
  } catch (err) {
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
function makeAnnouncementBlocks(eventInfo: EventInfo): Array<SlackBlock> {
  // make context block
  let avatarCount = (eventInfo.userAvatars || []).length;
  let contextBlock: SlackBlock = {
    type: "context",
    elements: [
      {
        type: "plain_text",
        emoji: true,
        text:
          avatarCount > 0
            ? `+ ${eventInfo.count - avatarCount} more already in`
            : `${eventInfo.count} already in`
      }
    ]
  };
  if (avatarCount > 0) {
    eventInfo.userAvatars.forEach(image_url => {
      contextBlock.elements.unshift({
        type: "image",
        image_url,
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
        text:
          "*What:* " +
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
          action_id: "in " + eventInfo.eventDate + eventInfo.offset,
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
          action_id: "out " + eventInfo.eventDate + eventInfo.offset,
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
function updateAnnouncement(
  updateInfo: AnnouncementUpdateInfo,
  sheet: GoogleAppsScript.Spreadsheet.Sheet
): void {
  if (updateInfo === undefined) return;
  let eventInfo = updateInfo.eventInfo;
  // get user info, set up avatars array
  let userAvatar = getUserAvatarUrl(updateInfo.userId);
  if (eventInfo.userAvatars == undefined) {
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
  const dateWithYear = `${eventInfo.eventDate}/${new Date().getFullYear()}`;
  const col = getDateCol(dateWithYear + eventInfo.offset, sheet);
  // expensive but worth it to allow up-to-date announcement message
  eventInfo.count = parseInt(sheet.getRange(COUNT_ROW, col).getDisplayValue());

  let payload: SlackMessageUpdateInfo = {
    channel: ANNOUNCE_CHANNEL_ID,
    text: ANNOUNCE_HEADER_TEXT,
    blocks: makeAnnouncementBlocks(eventInfo),
    ts: updateInfo.messageTimestamp
  };
  let options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
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
function sendAnnouncement(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  col: number,
  note: string,
  offset: string
): void {
  // collect event data
  let eventInfo: EventInfo = {
    ...getEventInfoFromCol(sheet, col),
    userAvatars: [],
    note,
    offset
  };
  // strip year from event date
  eventInfo.eventDate = eventInfo.eventDate.substring(
    0,
    eventInfo.eventDate.lastIndexOf("/")
  );
  let blocks = makeAnnouncementBlocks(eventInfo);
  let payload: SlackMessageSendInfo = {
    channel: ANNOUNCE_CHANNEL_ID,
    text: ANNOUNCE_HEADER_TEXT + " " + eventInfo.note,
    blocks
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
  console.log("Response to message post: " + response);
}
