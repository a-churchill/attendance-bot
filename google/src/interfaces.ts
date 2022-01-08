/**
 * Represents information about an event. Should always be ready to present to user.
 */
interface EventInfo {
  eventType: string;
  eventTime: string;
  eventDate: string;
  eventLocation: string;
  note?: string;
  count?: number;
  userAvatars?: Array<string>;
  dateForColumnLocator?: string; // must be from toString of ColumnLocator
  includeTimeLoc?: boolean; // used to check if background is not white in spreadsheet access
}

interface PostContent {
  parameter: UserStatus;
  contextPath: string;
  contentLength: number;
  queryString: string;
  parameters: {
    [key: string]: Array<string>;
  };
  postData: {
    type: string;
    length: string;
    contents: string;
    name: string;
  };
}

interface GetContent {
  queryString?: string;
  parameter: {
    method: string;
    value: string;
  };
}

interface UserStatus {
  user: string;
  userIn: boolean;
  date: string;
  comment: string;
}
