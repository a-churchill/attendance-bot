import { getEventDescription, ColumnLocator } from "../src/text";
import * as Types from "../src/interfaces";

const eventInfo: Types.EventInfo = {
  eventDate: "3/2/2020",
  eventLocation: "Roberts",
  eventTime: "1-3",
  eventType: "Scrimmage vs. BU",
  count: 2
};

test("Test full event description", () => {
  expect(getEventDescription(eventInfo)).toBe(
    "Scrimmage vs. BU on 3/2/2020 from 1-3 at Roberts"
  );
});

test("Test shorter event description", () => {
  expect(getEventDescription(eventInfo, false)).toBe(
    "Scrimmage vs. BU on 3/2/2020"
  );
});
