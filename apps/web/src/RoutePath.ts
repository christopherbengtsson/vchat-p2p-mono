export enum DevRoutePath {
  DEV = '/dev',
  PUTINS_PUPPET = '/dev/putins-puppet',
  RESULTS_DIALOG = '/dev/results-dialogs',
}

export enum RoutePath {
  TERMS = '/terms',
  AUTH = '/auth',
  HOME = '/',
  CALL = '/call',
  IN_CALL = '/call/:roomId',
  BANNED = '/banned',
}

export enum RouteParamKey {
  BAN_TYPE = 'type',
}

export enum RouteParamValue {
  BAN_TYPE_TEMPORARY = 'temporary',
  BAN_TYPE_PERMANENT = 'permanent',
}
