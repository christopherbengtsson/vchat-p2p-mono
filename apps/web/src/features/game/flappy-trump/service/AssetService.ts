import { CustomError } from '@mono/common-dto';
import { ASSETS } from '../model/constants';

type AssetLoadingStatus = 'idle' | 'loading' | 'success' | 'error';

let loadingStatus: AssetLoadingStatus = 'idle';

const preload = (timeout = 5000, retryCount = 2) =>
  new Promise((resolve, reject) => {
    if (ASSETS.TILES.complete) {
      loadingStatus = 'success';
      resolve(true);
      return;
    }

    loadingStatus = 'loading';

    let retries = 0;
    const attemptLoad = () => {
      const timeoutId = setTimeout(() => {
        if (retries < retryCount) {
          retries++;
          clearTimeout(timeoutId);
          console.warn(
            `Asset loading timed out, retrying (${retries}/${retryCount})...`,
          );
          attemptLoad();
        } else {
          loadingStatus = 'error';
          reject(
            CustomError.timeout(
              'Game asset loading timed out after multiple attempts',
            ),
          );
        }
      }, timeout);

      ASSETS.TILES.onload = () => {
        clearTimeout(timeoutId);
        loadingStatus = 'success';
        resolve(true);
      };

      ASSETS.TILES.onerror = (err) => {
        clearTimeout(timeoutId);
        if (retries < retryCount) {
          retries++;
          console.warn(
            `Asset loading failed, retrying (${retries}/${retryCount})...`,
          );
          attemptLoad();
        } else {
          loadingStatus = 'error';
          reject(err || CustomError.internal('Failed to load game assets'));
        }
      };
    };

    attemptLoad();
  });

const areAssetsReady = () =>
  loadingStatus === 'success' && ASSETS.TILES.complete;

export const AssetService = {
  preload,
  areAssetsReady,
};
