# Basic Instructions

1. Create a Google Apps Script for the attendance spreadsheet: Tools -> Script editor.
2. Using the [`clasp` CLI](https://developers.google.com/apps-script/guides/clasp#clone_an_existing_project), clone the project.
3. Copy the files in the `src` directory into the directory of the cloned project.
4. Run `clasp push` to push the code.

The Slack API key is stored in the Google Apps Script properties. It is also encrypted in this repository with [blackbox](https://github.com/StackExchange/blackbox#blackbox-).

## Limitations

- Cannot handle multiple events on same date with slash commands (will always return info about the first one)
