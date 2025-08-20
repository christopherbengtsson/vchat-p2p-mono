import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { Page } from '@playwright/test';

// Get the directory name
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Load NSFW test image as base64
 */
const getNSFWTestImage = () => {
  try {
    const imagePath = path.resolve(__dirname, '../fixtures/smile.jpg');
    if (fs.existsSync(imagePath)) {
      const buffer = fs.readFileSync(imagePath);
      return buffer.toString('base64');
    }
  } catch (error) {
    console.error('Failed to load test image:', error);
    throw error;
  }
};

export const hijackRemoteVideoStream = async (page: Page) => {
  await page.waitForSelector('[data-testid="remote-video-element"]', {
    state: 'attached',
    timeout: 10000,
  });

  const nsfwImageBase64 = getNSFWTestImage();

  await page.evaluate((imageBase64) => {
    const remoteVideo = document.querySelector(
      '[data-testid="remote-video-element"]',
    ) as HTMLVideoElement;
    if (!remoteVideo || !remoteVideo.srcObject) {
      console.error('Remote video element or stream not found');
      return false;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) {
      console.error('Could not get canvas context');
      return false;
    }

    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const testStream = canvas.captureStream(30);

      const originalStream = remoteVideo.srcObject as MediaStream;
      if (originalStream) {
        const audioTracks = originalStream.getAudioTracks();
        audioTracks.forEach((track) => {
          testStream.addTrack(track);
        });
      }

      remoteVideo.srcObject = testStream;
    };

    img.src = `data:image/jpeg;base64,${imageBase64}`;
    return true;
  }, nsfwImageBase64);
};
