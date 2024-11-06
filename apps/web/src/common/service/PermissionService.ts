const checkCameraPermissions = async () => {
  const cameraPermission = await navigator.permissions.query({
    name: 'camera' as PermissionName,
  });

  return cameraPermission.state === 'granted';
};

const checkMicrophonePermissions = async () => {
  const microphonePermission = await navigator.permissions.query({
    name: 'microphone' as PermissionName,
  });

  return microphonePermission.state === 'granted';
};

const checkMediaPermissions = async (): Promise<
  'granted' | 'prompt' | 'error'
> => {
  try {
    const [cameraEnabled, micophoneEnabled] = await Promise.all([
      checkCameraPermissions(),
      checkMicrophonePermissions(),
    ]);

    if (cameraEnabled && micophoneEnabled) {
      return 'granted';
    }

    return 'prompt';
  } catch (error) {
    console.error(error);
    return 'error';
  }
};

export const PermissionService = {
  checkMediaPermissions,
};
