import {
  getEventDescription,
  ColumnLocator,
  parseAnnounceNote
} from "../src/text";
import * as Types from "../src/interfaces";
import * as Enums from "../src/enums";

const eventInfo: Types.EventInfo = {
  eventDate: "3/2/2020",
  eventLocation: "Roberts",
  eventTime: "1-3",
  eventType: "Scrimmage vs. BU",
  count: 3
};

describe("getEventDescription function", () => {
  test("full event description", () => {
    expect(getEventDescription(eventInfo)).toBe(
      "Scrimmage vs. BU on 3/2/2020 from 1-3 at Roberts"
    );
  });

  test("shorter event description", () => {
    expect(getEventDescription(eventInfo, false)).toBe(
      "Scrimmage vs. BU on 3/2/2020"
    );
  });
});

describe("parseAnnounceNote function", () => {
  beforeAll(() => {
    jest
      .spyOn(global.Date, "now")
      .mockImplementation(() => new Date("2018-05-14T11:01:58.135Z").valueOf());
  });

  test("no offset", () => {
    const { newNote, date } = parseAnnounceNote("test practice", "3/2/2020");
    expect(newNote).toBe("test practice");
    expect(date.isValid()).toBe(true);
    expect(date.getDate()).toBe("3/2/2018");
    expect(date.getOffset()).toBe(0);
  });

  test("valid offset", () => {
    const { newNote, date } = parseAnnounceNote("#4 test practice", "3/2/2020");
    expect(newNote).toBe("test practice");
    expect(date.isValid()).toBe(true);
    expect(date.getDate()).toBe("3/2/2018");
    expect(date.getOffset()).toBe(3);
  });

  test("invalid offset, too large", () => {
    const { newNote, date } = parseAnnounceNote(
      "#20 test practice",
      "3/2/2020"
    );
    expect(newNote).toBe("#20 test practice");
    expect(date.getOffset()).toBe(0);
  });

  test("invalid offset, NaN", () => {
    const { newNote, date } = parseAnnounceNote(
      "#lit test practice",
      "3/2/2020"
    );
    expect(newNote).toBe("#lit test practice");
    expect(date.getOffset()).toBe(0);
  });
});

describe("ColumnLocator class", () => {
  beforeAll(() => {
    jest
      .spyOn(global.Date, "now")
      .mockImplementation(() => new Date("2018-05-14T11:01:58.135Z").valueOf());
  });

  test("no string initialize", () => {
    const date = new ColumnLocator();
    expect(date.initialize("")).toEqual(Enums.DateParseResult.addToReason);
    expect(date.isValid()).toBe(false);
    expect(date.toString).toThrow();
  });

  test("date string initialize", () => {
    const date = new ColumnLocator();
    expect(date.initialize("3/2")).toEqual(Enums.DateParseResult.success);
    expect(date.isValid()).toBe(true);
    expect(date.getDate()).toBe("3/2/2018");
    expect(date.getOffset()).toBe(0);
    expect(date.toString()).toBe("3/2/2018#1");
  });

  test("date string with year initialize", () => {
    const date = new ColumnLocator();
    expect(date.initialize("3/2/2020")).toEqual(Enums.DateParseResult.success);
    expect(date.getDate()).toBe("3/2/2018");
    expect(date.getOffset()).toBe(0);
  });

  test("date string with wrong year initialize", () => {
    const date = new ColumnLocator();
    expect(date.initialize("3/2/19")).toEqual(Enums.DateParseResult.success);
    expect(date.getDate()).toBe("3/2/2018");
  });

  test("invalid date strings initialize", () => {
    const date = new ColumnLocator();
    expect(date.initialize("3/1/1")).toEqual(Enums.DateParseResult.addToReason);
    expect(date.initialize("3//1")).toEqual(Enums.DateParseResult.addToReason);
    expect(date.initialize("/1/1")).toEqual(Enums.DateParseResult.addToReason);
    expect(date.initialize("3/1/")).toEqual(Enums.DateParseResult.addToReason);
    expect(date.initialize("3/1/192")).toEqual(
      Enums.DateParseResult.addToReason
    );
    expect(date.initialize("23/1/1922")).toEqual(
      Enums.DateParseResult.addToReason
    );
    expect(date.initialize("3/123/1")).toEqual(
      Enums.DateParseResult.addToReason
    );
  });

  test("date string with offset initialize", () => {
    const date = new ColumnLocator();
    expect(date.initialize("8/22#2")).toEqual(Enums.DateParseResult.success);
    expect(date.getDate()).toBe("8/22/2018");
    expect(date.getOffset()).toBe(1);
  });

  test("invalid date string with offset initialize", () => {
    const date = new ColumnLocator();
    expect(date.initialize("8/222/2018#3")).toEqual(
      Enums.DateParseResult.addToReason
    );
  });

  test("date string with invalid offset initialize", () => {
    const date = new ColumnLocator();
    expect(date.initialize("8/22/18#20")).toEqual(
      Enums.DateParseResult.addToReason
    );
  });
});
