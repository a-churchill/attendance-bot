import * as Enums from "./enums";

/**
 * Represents information gleaned from user interaction. May include unprocessed
 * information (e.g. text can have both date and reason in it, date in text can
 * still have offset attached)
 */
export interface ResponseContext {
  username: string;
  text: string;
  command: Enums.SlashCommand;
}

export interface GoogleResponse<T> {
  ok: boolean;
  payload: T;
}

export interface ResponseCustomization {
  userId: string;
  toUrl: string;
}

export interface UserStatus {
  user: string;
  userIn: boolean;
  date: string;
  comment: string;
}

/**
 * Represents information about an event. Should always be ready to present to user.
 */
export interface EventInfo {
  eventType: string;
  eventTime: string;
  eventDate: string;
  eventLocation: string;
  count: number;
  note?: string;
  userAvatars?: Array<string>;
  dateForColumnLocator?: string; // must be from toString of ColumnLocator
  includeTimeLoc?: boolean; // used to check if background is not white in spreadsheet access
}

export interface AnnouncementUpdateInfo {
  eventInfo: EventInfo;
  userId: string;
  messageTimestamp: string;
  addUser: boolean;
}

export interface PostContent {
  parameter: SlackSlashCommandInfo | { payload: string };
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

export interface UserAvatarInfo {
  im: string;
  name: string;
}

export interface SlackSlashCommandInfo {
  channel_name: string;
  user_id: string;
  user_name: string;
  trigger_id: string;
  team_domain: string;
  team_id: string;
  text: string;
  channel_id: string;
  command: string;
  token: string;
  response_url: string;
}

export interface SlackInteractiveInfo {
  payload: string;
}

export interface SlackMessagePayload {
  type: string;
  team: SlackTeamInfo;
  user: SlackUserInfo;
  api_app_id: string;
  token: string;
  container?: SlackContainerInfo;
  trigger_id: string;
  view?: SlackView;
  channel?: SlackChannelInfo;
  message: SlackMessageResponseInfo;
  response_url?: string;
  actions: Array<SlackActions>;
}

export interface SlackActions {
  action_id: string;
  block_id: string;
  text: SlackTextInfo;
  value: string;
  style: string;
  type: string;
  action_ts: string;
}

export interface SlackMessageResponseInfo {
  bot_id: string;
  type: string;
  text: string;
  user: string;
  ts: string;
  team: string;
  blocks: Array<SlackBlock>;
}

export interface SlackMessageSendInfo {
  text: string;
  channel: string;
  user?: string;
  blocks?: Array<SlackBlock>;
  mrkdwn?: boolean;
  response_type?: string;
  replace_original?: boolean;
}

export interface SlackMessageUpdateInfo {
  text: string;
  channel: string;
  ts: string;
  blocks?: Array<SlackBlock>;
}

export interface SlackUserRequestInfo {
  ok: string;
  user: SlackFullUserInfo;
}

export interface SlackFullUserInfo {
  id: string;
  team_id: string;
  name: string;
  deleted: boolean;
  color: string;
  real_name: string;
  tz: string;
  tz_label: string;
  tz_offset: number;
  profile: {
    title: string;
    phone: string;
    skype: string;
    real_name: string;
    real_name_normalized: string;
    display_name: string;
    display_name_normalized: string;
    status_text: string;
    status_emoji: string;
    status_expiration: number;
    avatar_hash: string;
    image_original: string;
    is_custom_image: string;
    first_name: string;
    last_name: string;
    image_24: string;
    image_32: string;
    image_48: string;
    image_72: string;
    image_192: string;
    image_512: string;
    image_1024: string;
    status_text_canonical: string;
    team: string;
  };
  is_admin: boolean;
  is_owner: boolean;
  is_primary_owner: boolean;
  is_restricted: boolean;
  is_ultra_restricted: boolean;
  is_bot: boolean;
  is_app_user: boolean;
  updated: number;
}

export interface SlackChannelInfo {
  id: string;
  name: string;
}

export interface SlackView {
  type: string;
  callback_id: string;
  title: SlackTextInfo;
  submit: SlackTextInfo;
  close: SlackTextInfo;
  blocks: Array<SlackBlock>;
  private_metadata?: string;
  state?: {
    values: any;
  };
  id?: string;
  team_id?: string;
  hash?: string;
  previous_view_id?: string;
  clear_on_close?: boolean;
  notify_on_close?: boolean;
  root_view_id?: string;
  app_id?: string;
  external_id?: string;
  app_installed_team_id?: string;
  bot_id?: string;
}

export interface SlackContainerInfo {
  type: string;
  message_ts: string;
  channel_id: string;
  is_ephemeral: boolean;
}

export interface SlackTeamInfo {
  id: string;
  domain: string;
}

export interface SlackUserInfo {
  id: string;
  username: string;
  name: string;
  team_id: string;
}

export interface SlackBlock {
  type: string;
  text?: SlackTextInfo;
  accessory?: SlackImageInfo;
  block_id?: string;
  label?: SlackTextInfo;
  element?: SlackImageInfo | SlackButtonInfo | SlackInputInfo;
  elements?: Array<SlackImageInfo | SlackButtonInfo | SlackContextInfo>;
}

export interface SlackInputInfo {
  type: string;
  placeholder: SlackTextInfo;
  multiline: boolean;
  action_id: string;
}

export interface SlackImageInfo {
  type: string;
  image_url: string;
  alt_text: string;
  fallback?: string;
  image_width?: number;
  image_height?: number;
  image_bytes?: number;
}

export interface SlackContextInfo {
  type: string;
  emoji?: boolean;
  text?: string;
  image_url?: string;
  alt_text?: string;
}

export interface SlackTextInfo {
  type: string;
  text: string;
  emoji?: boolean;
}

export interface SlackButtonInfo {
  type: string;
  action_id: string;
  text: SlackTextInfo;
  style: string;
  value: string;
}
