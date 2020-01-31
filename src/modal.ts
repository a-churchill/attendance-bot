// opens modal window
/**
 * Opens a modal window with a single line text box, submit and cancel buttons.
 * Intended for user to input their reason for missing practice.
 * @param trigger modal trigger for Slack API
 * @param date the date of the practice the user is missing
 * @param updateInfo the info needed to update the announcement message after submission of the modal
 */
function openModal(trigger: string, updateInfo: AnnouncementUpdateInfo): void {
  const payload = {
    trigger_id: trigger,
    view: {
      type: "modal",
      callback_id: "out_explanation",
      title: {
        type: "plain_text",
        text: "Explanation",
        emoji: true
      },
      submit: {
        type: "plain_text",
        text: "Submit",
        emoji: true
      },
      close: {
        type: "plain_text",
        text: "Cancel",
        emoji: true
      },
      private_metadata: JSON.stringify(updateInfo),
      blocks: [
        {
          type: "input",
          block_id: REASON_BLOCK_ID,
          label: {
            type: "plain_text",
            text: "Please give a reason for missing practice:",
            emoji: true
          },
          element: {
            type: "plain_text_input",
            multiline: false,
            placeholder: {
              type: "plain_text",
              text: "Your explanation here",
              emoji: true
            },
            action_id: REASON_ACTION_ID
          }
        }
      ]
    }
  };
  const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
    method: "post",
    contentType: "application/json",
    headers: {
      Authorization: API_TOKEN
    },
    payload: JSON.stringify(payload)
  };
  UrlFetchApp.fetch(SLACK_OPEN_MODAL_URL, options);
  console.log("Posted modal");
}
