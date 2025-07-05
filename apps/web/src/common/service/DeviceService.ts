import { UAParser } from 'ua-parser-js';

const { device } = UAParser();

const isMobile = () => device.type === 'mobile';

const isTablet = () => device.type === 'tablet';

const isDesktop = () => !isMobile() && !isTablet();

export const DeviceService = {
  isMobile,
  isTablet,
  isDesktop,
};
