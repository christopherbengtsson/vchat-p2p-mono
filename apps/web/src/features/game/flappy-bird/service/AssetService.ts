import { CustomError } from '@mono/common-dto';
import { ASSETS } from '../model/CanvasConstants';

const preload = (timeout = 5000) =>
  new Promise((resolve, reject) => {
    if (ASSETS.TILES.complete) {
      resolve(true);
      return;
    }

    const timeoutId = setTimeout(() => {
      reject(CustomError.timeout('Game asset loading timed out'));
    }, timeout);

    ASSETS.TILES.onload = () => {
      clearTimeout(timeoutId);
      resolve(true);
    };

    ASSETS.TILES.onerror = (err) => {
      clearTimeout(timeoutId);
      reject(err);
    };
  });

export const AssetService = {
  preload,
};
