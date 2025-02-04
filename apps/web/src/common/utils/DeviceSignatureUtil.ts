import { DeviceSignature } from '@mono/common-dto';
import { UAParser } from 'ua-parser-js';

const get = (): DeviceSignature => {
  const uaData = new UAParser().getResult();

  return {
    ua: uaData.ua,
    browser: uaData.browser.name,
    cpu: uaData.cpu.architecture,
    device: `${uaData.device.model}-${uaData.device.vendor}-${uaData.device.type}`,
    engine: uaData.engine.name,
    os: uaData.os.name,
    screen: `${window.screen.width}x${window.screen.height}`,
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
};

export const DeviceSignatureUtil = {
  get,
};
