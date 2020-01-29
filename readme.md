# Overview

**AttendanceBot** is a Slack app to make tracking who's going to practice (or scrimmages, or tournaments) much easier. Our [Ultimate Frisbee team here at MIT](http://mens-ult.mit.edu/) uses an attendance spreadsheet, which looks like this:

![attendance spreadsheet](https://github.com/xxaxdxcxx/attendance-bot/raw/master/imgs/attendance-spreadsheet.jpg "Attendance Spreadsheet").

Using a spreadsheet as the source of truth has a lot of advantages: it has a built-in UI which is well-understood, it is easy to use and robust, and players can update their attendance several weeks in advance. But updating the spreadsheet for every practice is the norm for most, and for those users a spreadsheet is quite inefficient. Updating it on a phone, after receiving a notification reminding them that practice is coming up, requires opening a separate app and the UI is just not great for a touch device. There's an activation energy which many people just don't overcome (looking at you, row 18!). That's where AttendanceBot comes in.

AttendanceBot's main offering is a useful and beautiful practice announcement message, shown below.

![announce message](https://github.com/xxaxdxcxx/attendance-bot/raw/master/imgs/announce-message.png "Announce Message")

It reduces the task of filling out the spreadsheet to a single button click (if the player can come), or a button click and a quick typed explanation (if the player cannot come). It also offers an overview of the practice details, and shows the players who have already marked themselves as coming. It significantly streamlines the task of noting your attendance.

But there's more: AttendanceBot also offers some simple yet powerful slash commands, familiar to anyone who has used Slack for long. The slash commands, shown below, offer players another way to update the attendance spreadsheet without leaving Slack.

![slash in](https://github.com/xxaxdxcxx/attendance-bot/raw/master/imgs/slash-in-command.jpg "/in")

![slash out](https://github.com/xxaxdxcxx/attendance-bot/raw/master/imgs/slash-out-command.jpg "/out")

![slash announce](https://github.com/xxaxdxcxx/attendance-bot/raw/master/imgs/slash-announce-command.jpg "/announce")

And AttendanceBot gives helpful feedback to the user, giving them usage hints and ensuring they know exactly what their action accomplished.

![feedback message](https://github.com/xxaxdxcxx/attendance-bot/raw/master/imgs/feedback-message.png "Feedback to user")

AttendanceBot is written entirely in TypeScript, and uses many members of the Google Apps Script API to interact with and update the attendance spreadsheet.

## Assumptions about the spreadsheet

AttendanceBot pulls all of its data from the attendance spreadsheet we already use. It expects the following to be true:

- Each column represents a separate event, and the pertinent information about that event (e.g. time, location) is in a predictable row, as configured in [`constants.ts`](src/constants.ts). _Note: none of the fields need to be unique._
- One column (which can be hidden) holds each player's Slack username in their corresponding row.
- The event information changes fairly infrequently (event information is cached for about 30 minutes after any cache miss). _Note: changes to the number of people coming are not cached, to ensure accuracy._

## Development Instructions

1. Create a Google Apps Script for the attendance spreadsheet: Tools -> Script editor.
2. Using the [`clasp` CLI](https://developers.google.com/apps-script/guides/clasp#clone_an_existing_project), clone the project.
3. Copy the files in the `src` directory into the directory of the cloned project.
4. Run `clasp push` to push the code.

The Slack API key is stored in the Google Apps Script properties. It is also encrypted in this repository with [blackbox](https://github.com/StackExchange/blackbox#blackbox-).

## Limitations

- Cannot handle multiple events on same date with slash commands (will always return info about the first one). _Note: technically it can handle this (the user could just say "/in #2" to select the second event on a day) but this is too confusing to be worth documenting, since they can just click the button on the announcement to get the correct behavior. Better just the captain deals with the # offset notation than the whole team._
- The methodology for handling multiple events on the same day works but could probably be more elegant (currently some date strings will have "#2" or some offset appended to the end to specify the second event on a date.) The main problem is that different date strings can refer to the same event, which is confusing. If only we could just guarantee one event per date.
