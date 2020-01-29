# Overview

![announce message](imgs/announce-message.jpg?raw=true "Announce Message")

## Development Instructions

1. Create a Google Apps Script for the attendance spreadsheet: Tools -> Script editor.
2. Using the [`clasp` CLI](https://developers.google.com/apps-script/guides/clasp#clone_an_existing_project), clone the project.
3. Copy the files in the `src` directory into the directory of the cloned project.
4. Run `clasp push` to push the code.

The Slack API key is stored in the Google Apps Script properties. It is also encrypted in this repository with [blackbox](https://github.com/StackExchange/blackbox#blackbox-).

##

## Limitations

- Cannot handle multiple events on same date with slash commands (will always return info about the first one). _Note: technically it can handle this (the user could just say "/in #2" to select the second event on a day) but this is too confusing to be worth documenting, since they can just click the button on the announcement to get the correct behavior. Better just the captain deals with the # offset notation than the whole team._
- The methodology for handling multiple events on the same day works but could probably be more elegant (currently some date strings will have "#2" or some offset appended to the end to specify the second event on a date.) The main problem is that different date strings can refer to the same event, which is confusing. If only we could just guarantee one event per date.
