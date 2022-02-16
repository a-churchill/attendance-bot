import * as Enums from "./enums";
import * as Types from "./interfaces";
import { ColumnLocator } from "./text";
import { sendResponse } from "./app";
import { setUserStatus } from "./spreadsheet";

/**
 * Given some user interaction making a change to their attendance status (could
 * be slash command, button click, or modal submit), updates the spreadsheet
 * and sends a response with information about the update.
 * @param context information from user's response
 * @param sheet current sheet
 * @param responseInfo customization for where to send eventual response
 * @param afterSuccessfulChange function called after sheet updated successfully
 */
export async function handleInOut(
  context: Types.ResponseContext,
  responseInfo: Types.ResponseCustomization,
  afterSuccessfulChange: Function
) {
  // collect data from slash command
  let username = context.username;
  let dateStr = context.text.split(" ")[0]; // if first word is not date, handled below
  let reason = context.text.split(" ").slice(1).join(" ") || ""; // every word but first, or empty if 0/1 words
  let userIn = context.command === Enums.SlashCommand.in;

  console.log(`User ${username}: ${context.command} ${dateStr} ${reason}`);

  // handle date
  let date: ColumnLocator | null = new ColumnLocator();
  const parseResult = date.initialize(dateStr);
  if (parseResult === Enums.DateParseResult.addToReason) {
    // invalid date; will be added to reason, and date.isValid() is false
    reason = dateStr.length > 0 ? dateStr + " " + reason : reason;
    date = null;
  }

  // update spreadsheet
  return await setUserStatus({
    user: username,
    date: date ? date.toString() : "",
    userIn,
    comment: reason,
  }).then((value) => {
    afterSuccessfulChange();
    sendResponse(value, responseInfo);
    return value;
  });
}
