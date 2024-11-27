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

const checkMediaPermissions = async (): Promise<PermissionState> => {
  try {
    const [cameraEnabled, microphoneEnabled] = await Promise.all([
      checkCameraPermissions(),
      checkMicrophonePermissions(),
    ]);

    if (cameraEnabled === 'granted' && microphoneEnabled === 'granted') {
      return 'granted';
    }

    if (cameraEnabled === 'denied' || microphoneEnabled === 'denied') {
      return 'denied';
    }

    return 'prompt';
  } catch (error) {
    console.error(error);
    return 'denied';
  }
};

export const PermissionService = {
  checkMediaPermissions,
};
