import type { BrowserSignature } from '@mono/common-dto';

const get = (): BrowserSignature => ({
  screen: `${window.screen.width}x${window.screen.height}`,
  language: navigator.language,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
});

export const BrowserSignatureUtil = {
  get,
};

// const _safari = {
//   device: {
//     model: 'Macintosh',
//     vendor: 'Apple',
//   },
//   os: {
//     name: 'macOS',
//     version: '10.15.7',
//   },
// };

// const _arc = {
//   device: {
//     model: 'Macintosh',
//     vendor: 'Apple',
//   },
//   os: {
//     name: 'macOS',
//     version: '14.7.0',
//   },
// };

// const _chrome = {
//   device: {
//     model: 'Macintosh',
//     vendor: 'Apple',
//   },
//   os: {
//     name: 'macOS',
//     version: '14.7.0',
//   },
// };
