import { CustomError, Maybe } from '@mono/common-dto';
import type * as tf from '@tensorflow/tfjs';
import type * as nsfwjs from 'nsfwjs';
import { ModelLoadOptions } from '../model/ModelLoadOptions';

const MODEL_PATH = `${import.meta.env.VITE_SUPABASE_URL}${import.meta.env.VITE_SUPABASE_NSFW_MODEL_BUCKET_PATH}`;
const INDEXEDDB_KEY = 'nsfwjs-model-cache';
const CURRENT_VERSION = '2.4.0'; // TODO: should be configurable

type TFModule = typeof tf;
type NSFWJSModule = typeof nsfwjs;

const _importTensorFlow = async (): Promise<TFModule> => {
  return await import('@tensorflow/tfjs');
};
const _importNSFWJS = async (): Promise<NSFWJSModule> => {
  return await import('nsfwjs');
};

const modelState: {
  instance: Maybe<nsfwjs.NSFWJS>;
  loadingPromise: Maybe<Promise<nsfwjs.NSFWJS>>;
} = {
  instance: null,
  loadingPromise: null,
};

const getStoredVersion = async (): Promise<Maybe<string>> => {
  try {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('nsfwjs-version-store', 1);

      request.onerror = () => reject(request.error);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('version')) {
          db.createObjectStore('version');
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['version'], 'readonly');
        const store = transaction.objectStore('version');
        const getRequest = store.get('current');

        getRequest.onsuccess = () => {
          resolve(getRequest.result?.version || null);
          db.close();
        };

        getRequest.onerror = () => {
          reject(getRequest.error);
          db.close();
        };
      };
    });
  } catch (err) {
    console.warn('Failed to read stored version:', err);
    return null;
  }
};

const setStoredVersion = async (version: string): Promise<void> => {
  try {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('nsfwjs-version-store', 1);

      request.onerror = () => reject(request.error);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('version')) {
          db.createObjectStore('version');
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['version'], 'readwrite');
        const store = transaction.objectStore('version');
        const putRequest = store.put({ version }, 'current');

        putRequest.onsuccess = () => {
          resolve();
          db.close();
        };

        putRequest.onerror = () => {
          reject(putRequest.error);
          db.close();
        };
      };
    });
  } catch (err) {
    console.warn('Failed to store version:', err);
  }
};

const clearCacheIfNeeded = async (tfModule: TFModule): Promise<void> => {
  try {
    const storedVersion = await getStoredVersion();
    if (storedVersion !== CURRENT_VERSION) {
      const models = await tfModule.io.listModels();
      if (models[`indexeddb://${INDEXEDDB_KEY}`]) {
        await tfModule.io.removeModel(`indexeddb://${INDEXEDDB_KEY}`);
        console.debug('Outdated NSFW model cleared');
      }
    }
  } catch (err) {
    console.warn('Failed to clear cached model:', err);
  }
};

const loadFromCache = async (
  tfModule: TFModule,
  nsfwjsModule: NSFWJSModule,
  options: ModelLoadOptions,
): Promise<Maybe<nsfwjs.NSFWJS>> => {
  try {
    const models = await tfModule.io.listModels();

    if (models[`indexeddb://${INDEXEDDB_KEY}`]) {
      console.debug('Loading NSFW model from IndexedDB cache');

      const model = await nsfwjsModule.load(
        `indexeddb://${INDEXEDDB_KEY}`,
        options,
      );
      await setStoredVersion(CURRENT_VERSION);

      return model;
    }
  } catch (err) {
    console.warn('Failed to load model from cache:', err);
  }
  return null;
};

const loadFromNetwork = async (
  _tfModule: TFModule,
  nsfwjsModule: NSFWJSModule,
  options: ModelLoadOptions,
): Promise<nsfwjs.NSFWJS> => {
  console.debug('Loading NSFW model from network');

  const model = await nsfwjsModule.load(MODEL_PATH, options);

  try {
    await model.model.save(`indexeddb://${INDEXEDDB_KEY}`);
    await setStoredVersion(CURRENT_VERSION);

    console.debug('NSFW model cached successfully');
  } catch (err) {
    console.warn('Failed to cache model:', err);
  }

  return model;
};

const loadModel = async (
  options: ModelLoadOptions = {},
): Promise<nsfwjs.NSFWJS> => {
  if (modelState.instance) {
    return modelState.instance;
  }

  if (modelState.loadingPromise) {
    return modelState.loadingPromise;
  }

  const loadModelTask = async (): Promise<nsfwjs.NSFWJS> => {
    const startTime = performance.now();

    try {
      const [tfModule, nsfwjsModule] = await Promise.all([
        _importTensorFlow(),
        _importNSFWJS(),
      ]);

      tfModule.enableProdMode();

      await clearCacheIfNeeded(tfModule);

      const cachedModel = await loadFromCache(tfModule, nsfwjsModule, options);
      if (cachedModel) {
        return cachedModel;
      }

      return await loadFromNetwork(tfModule, nsfwjsModule, options);
    } catch (err) {
      console.error('Failed to load NSFW model:', err);
      modelState.loadingPromise = null;

      throw err;
    } finally {
      console.debug(
        `NSFW model loaded in ${(performance.now() - startTime).toFixed(2)} ms`,
      );
    }
  };

  modelState.loadingPromise = loadModelTask().then((model) => {
    modelState.instance = model;
    return model;
  });

  return modelState.loadingPromise;
};

const classifyImage = async (
  imageData:
    | ImageData
    | HTMLImageElement
    | HTMLCanvasElement
    | HTMLVideoElement,
): Promise<nsfwjs.PredictionType[]> => {
  if (!modelState.instance) {
    throw CustomError.badState('NSFW model not loaded.');
  }

  return await modelState.instance.classify(imageData);
};

const resetModel = async (): Promise<void> => {
  modelState.instance = null;
  modelState.loadingPromise = null;
};

// Worker message types
interface LoadModelMessage {
  type: 'LOAD_MODEL';
  payload: { options?: ModelLoadOptions };
}

interface ClassifyImageMessage {
  type: 'CLASSIFY_IMAGE';
  payload: { imageData: ImageData };
}

interface ResetModelMessage {
  type: 'RESET_MODEL';
  payload?: never;
}

type WorkerMessage =
  | LoadModelMessage
  | ClassifyImageMessage
  | ResetModelMessage;

interface WorkerResponse {
  type: 'SUCCESS' | 'ERROR';
  payload: unknown;
  requestId?: string;
}

// Worker message handler
self.addEventListener(
  'message',
  async (event: MessageEvent<WorkerMessage & { requestId?: string }>) => {
    const { type, requestId } = event.data;

    const sendResponse = (response: WorkerResponse) => {
      self.postMessage({ ...response, requestId });
    };

    try {
      switch (type) {
        case 'LOAD_MODEL': {
          const { payload } = event.data as LoadModelMessage;
          await loadModel(payload.options);
          sendResponse({ type: 'SUCCESS', payload: null });
          break;
        }

        case 'CLASSIFY_IMAGE': {
          const { payload } = event.data as ClassifyImageMessage;
          const predictions = await classifyImage(payload.imageData);
          sendResponse({ type: 'SUCCESS', payload: predictions });
          break;
        }

        case 'RESET_MODEL': {
          await resetModel();
          sendResponse({ type: 'SUCCESS', payload: null });
          break;
        }

        default:
          throw new Error(`Unknown message type: ${type}`);
      }
    } catch (error) {
      sendResponse({
        type: 'ERROR',
        payload: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },
);

// Export for TypeScript types
export type { WorkerMessage, WorkerResponse };
