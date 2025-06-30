import { CustomError, Maybe } from '@mono/common-dto';
import * as tf from '@tensorflow/tfjs';
import * as nsfwjs from 'nsfwjs';
import { ModelLoadOptions } from '../model/ModelLoadOptions';

const MODEL_PATH = `${import.meta.env.VITE_BASE_URL}/model/mobilenet_v2/model.json`;
const INDEXEDDB_KEY = 'nsfwjs-model-cache';
const MODEL_VERSION_KEY = 'nsfwjs-model-version';
const CURRENT_VERSION = '2.4.0'; // TODO: should be configurable

const modelState: {
  instance: Maybe<nsfwjs.NSFWJS>;
  loadingPromise: Maybe<Promise<nsfwjs.NSFWJS>>;
} = {
  instance: null,
  loadingPromise: null,
};

const clearCacheIfNeeded = async (): Promise<void> => {
  try {
    const storedVersion = localStorage.getItem(MODEL_VERSION_KEY);
    if (storedVersion !== CURRENT_VERSION) {
      const models = await tf.io.listModels();
      if (models[`indexeddb://${INDEXEDDB_KEY}`]) {
        await tf.io.removeModel(`indexeddb://${INDEXEDDB_KEY}`);
        console.debug('Outdated NSFW model cleared');
      }
    }
  } catch (err) {
    console.warn('Failed to clear cached model:', err);
  }
};

const loadFromCache = async (
  options: ModelLoadOptions,
): Promise<Maybe<nsfwjs.NSFWJS>> => {
  try {
    const models = await tf.io.listModels();

    if (models[`indexeddb://${INDEXEDDB_KEY}`]) {
      console.debug('Loading NSFW model from IndexedDB cache');

      const model = await nsfwjs.load(`indexeddb://${INDEXEDDB_KEY}`, options);
      localStorage.setItem(MODEL_VERSION_KEY, CURRENT_VERSION);

      return model;
    }
  } catch (err) {
    console.warn('Failed to load model from cache:', err);
  }
  return null;
};

const loadFromNetwork = async (
  options: ModelLoadOptions,
): Promise<nsfwjs.NSFWJS> => {
  console.debug('Loading NSFW model from network');

  const model = await nsfwjs.load(MODEL_PATH, options);

  try {
    await model.model.save(`indexeddb://${INDEXEDDB_KEY}`);
    localStorage.setItem(MODEL_VERSION_KEY, CURRENT_VERSION);

    console.debug('NSFW model cached successfully');
  } catch (err) {
    console.warn('Failed to cache model:', err);
  }

  return model;
};

const load = async (options: ModelLoadOptions = {}): Promise<nsfwjs.NSFWJS> => {
  if (modelState.instance) {
    return modelState.instance;
  }

  if (modelState.loadingPromise) {
    return modelState.loadingPromise;
  }

  const loadModelTask = async (): Promise<nsfwjs.NSFWJS> => {
    const startTime = performance.now();

    try {
      tf.enableProdMode();

      await clearCacheIfNeeded();

      const cachedModel = await loadFromCache(options);
      if (cachedModel) {
        return cachedModel;
      }

      return await loadFromNetwork(options);
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

const get = (): nsfwjs.NSFWJS => {
  if (!modelState.instance) {
    throw CustomError.badState('NSFW model not loaded.');
  }

  return modelState.instance;
};

const reset = async (): Promise<void> => {
  modelState.instance = null;
  modelState.loadingPromise = null;
};

export const NSFWModelService = {
  load,
  get,

  /** For testing purposes only */
  reset,
};
