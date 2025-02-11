export enum UserMetadataKeys {
  PERMANENT_BAN = 'permanentBan',
}

export interface UserMetadata {
  [UserMetadataKeys.PERMANENT_BAN]: boolean;
}
