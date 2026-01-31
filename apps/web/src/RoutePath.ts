export enum DevRoutePath {
  DEV = '/dev',
  PUTINS_PUPPET = '/dev/putins-puppet',
  RESULTS_DIALOG = '/dev/results-dialogs',
  GLASS = '/dev/glass',
}

export enum RoutePath {
  TERMS = '/terms',
  AUTH = '/auth',
  HOME = '/',
  CALL = '/call',
  IN_CALL = '/call/:roomId',
  BANNED = '/banned',
  ERROR = '/error',
}

export enum RouteParamKey {
  BAN_TYPE = 'ban_type',
  ERROR_CODE = 'error_code',
}

export enum RouteParamValue {
  BAN_TYPE_TEMPORARY = 'ban_type_temporary',
  BAN_TYPE_PERMANENT = 'ban_type_permanent',
}
