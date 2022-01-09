// this file contains formulas to be used in the sheet

/** Returns the name of every non-hidden sheet in the spreadsheet */
function GetAllSheetNames() {
  const out = SpreadsheetApp.getActiveSpreadsheet()
    .getSheets()
    .filter((sheet) => !sheet.isSheetHidden())
    .map((sheet) => sheet.getName());
  return out;
}
