export enum DefaultToastState {
  CONNECTION_RESTORED = 'connection_restored',
}

export enum ErrorToastState {
  UNKNOWN_ERROR = 'unknown_error',

  CONNECT_ERROR = 'connect_error',
  SERVER_DISCONNECTED = 'server_disconnected',

  MEDIA_STREAM_NOT_ALLOWED = 'media_stream_not_allowed',
  MEDIA_STREAM_NOT_AVAILABLE = 'media_stream_not_available',
  MEDIA_STREAM_UNKNOWN = 'media_stream_unknown',
}

export type ToastState = DefaultToastState | ErrorToastState;

const isDefaultState = (state: ToastState): state is DefaultToastState => {
  return state === DefaultToastState.CONNECTION_RESTORED;
};
export const ToastState = {
  isDefaultState,
};
