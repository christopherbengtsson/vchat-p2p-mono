export enum RoutePath {
  TERMS = '/terms',
  AUTH = '/auth',
  HOME = '/',
  CALL = '/call',
  BANNED = '/banned',
}

export enum RouteParamKey {
  BAN_TYPE = 'type',
}

export enum RouteParamValue {
  BAN_TYPE_TEMPORARY = 'temporary',
  BAN_TYPE_PERMANENT = 'permanent',
}
