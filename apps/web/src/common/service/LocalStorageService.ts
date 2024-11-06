import { Maybe } from '@mono/common-dto';
import { STORAGE_KEYS } from '../model/LocalStorageKeys';

const get = (key: STORAGE_KEYS): Maybe<string> => {
  try {
    return localStorage.getItem(key);
  } catch {
    // ignore
  }
};
const set = (key: STORAGE_KEYS, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
};

export const LocalStorageService = {
  get,
  set,
};
