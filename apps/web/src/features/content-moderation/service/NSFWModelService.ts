import { CustomError, Maybe } from '@mono/common-dto';
import type * as nsfwjs from 'nsfwjs';
import { ModelLoadOptions } from '../model/ModelLoadOptions';

const workerState: {
  worker: Maybe<Worker>;
  loadingPromise: Maybe<Promise<void>>;
  modelLoaded: boolean;
} = {
  worker: null,
  loadingPromise: null,
  modelLoaded: false,
};

const createWorker = (): Worker => {
  return new Worker(new URL('../worker/NSFWModelWorker.ts', import.meta.url), {
    type: 'module',
  });
};

const sendWorkerMessage = <T>(
  worker: Worker,
  message: Record<string, unknown>,
): Promise<T> => {
  return new Promise((resolve, reject) => {
    const requestId = Math.random().toString(36).substring(2);

    const handleMessage = (event: MessageEvent) => {
      if (event.data.requestId === requestId) {
        worker.removeEventListener('message', handleMessage);

        if (event.data.type === 'SUCCESS') {
          resolve(event.data.payload);
        } else {
          reject(new Error(event.data.payload));
        }
      }
    };

    worker.addEventListener('message', handleMessage);
    worker.postMessage({ ...message, requestId });
  });
};

const load = async (options: ModelLoadOptions = {}): Promise<void> => {
  if (workerState.modelLoaded) {
    return;
  }

  if (workerState.loadingPromise) {
    return workerState.loadingPromise;
  }

  const loadModelTask = async (): Promise<void> => {
    try {
      if (!workerState.worker) {
        workerState.worker = createWorker();
      }

      await sendWorkerMessage(workerState.worker, {
        type: 'LOAD_MODEL',
        payload: { options },
      });

      workerState.modelLoaded = true;
    } catch (err) {
      console.error('Failed to load NSFW model:', err);
      workerState.loadingPromise = null;
      throw err;
    }
  };

  workerState.loadingPromise = loadModelTask();
  return workerState.loadingPromise;
};

const classify = async (
  imageData: ImageData,
): Promise<nsfwjs.PredictionType[]> => {
  if (!workerState.worker || !workerState.modelLoaded) {
    throw CustomError.badState('NSFW model not loaded.');
  }

  return await sendWorkerMessage<nsfwjs.PredictionType[]>(workerState.worker, {
    type: 'CLASSIFY_IMAGE',
    payload: { imageData },
  });
};

const reset = async (): Promise<void> => {
  if (workerState.worker) {
    await sendWorkerMessage(workerState.worker, {
      type: 'RESET_MODEL',
    });

    workerState.worker.terminate();
    workerState.worker = null;
  }

  workerState.modelLoaded = false;
  workerState.loadingPromise = null;
};

export const NSFWModelService = {
  load,
  classify,

  /** For testing purposes only */
  reset,
};
