import { toast } from 'sonner';
import {
  DefaultToastState,
  ErrorToastState,
  ToastState,
} from './model/ToastState';

const getToastContent = (state: ToastState) => {
  switch (state) {
    case DefaultToastState.CONNECTION_RESTORED:
      return {
        id: DefaultToastState.CONNECTION_RESTORED,
        title: 'Connection restored',
      };

    case ErrorToastState.CONNECT_ERROR:
      return {
        id: ErrorToastState.CONNECT_ERROR,
        title: 'Connection error',
        description: 'Cannot connect to server',
      };

    case ErrorToastState.SERVER_DISCONNECTED:
      return {
        id: ErrorToastState.SERVER_DISCONNECTED,
        title: 'Disconnected',
        description: 'You have been kicked out by an admin',
      };

    case ErrorToastState.MEDIA_STREAM_NOT_ALLOWED:
      return {
        id: ErrorToastState.MEDIA_STREAM_NOT_ALLOWED,
        title: 'Access denied',
        description:
          'Please check your browser settings to allow camera and microphone access',
      };

    case ErrorToastState.MEDIA_STREAM_NOT_AVAILABLE:
    case ErrorToastState.MEDIA_STREAM_UNKNOWN:
      return {
        id: state,
        title: 'Camera or microphone not available',
        description:
          'Please check your device settings or try a different browser',
      };

    default:
      return {
        title: 'Unknown error',
      };
  }
};

export const showToast = (state: ToastState) => {
  const { id, title, description } = getToastContent(state);

  if (ToastState.isDefaultState(state)) {
    toast(title, {
      id,
      description,
    });
  } else {
    toast.error(title, {
      id,
      description,
    });
  }
};
