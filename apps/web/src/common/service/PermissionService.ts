import { Maybe } from '@mono/common-dto';

const checkCameraPermissions = async () => {
  const cameraPermission = await navigator.permissions.query({
    name: 'camera' as PermissionName,
  });

  return cameraPermission.state;
};

const checkMicrophonePermissions = async () => {
  const microphonePermission = await navigator.permissions.query({
    name: 'microphone' as PermissionName,
  });

  return microphonePermission.state;
};

const checkMediaPermissions = async (): Promise<Maybe<PermissionState>> => {
  try {
    const [cameraEnabled, micophoneEnabled] = await Promise.all([
      checkCameraPermissions(),
      checkMicrophonePermissions(),
    ]);

    if (cameraEnabled === 'granted' && micophoneEnabled === 'granted') {
      return 'granted';
    }

    if (cameraEnabled === 'denied' || micophoneEnabled === 'denied') {
      return 'denied';
    }

    return 'prompt';
  } catch (error) {
    console.error(error);
  }
};

export const PermissionService = {
  checkMediaPermissions,
};
