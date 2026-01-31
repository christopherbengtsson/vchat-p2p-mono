import { Maybe } from '@mono/common-dto';
import intersection from 'lodash.intersection';

interface PendingState<T> {
  keys: string[];
  promise: Promise<T>;
}

interface AsyncLockStore<T> {
  pendingPromises: PendingState<T>[];
}

type LockKey = string;

export interface AsyncLock<T> {
  acquire: (keys: LockKey[] | LockKey, cb: () => Promise<T>) => Promise<T>;
  waitForKeys: (keys: LockKey[]) => Promise<Maybe<T[]>>;
  waitForKey: (keys: LockKey) => Promise<Maybe<T>>;
  isPending: (keys: LockKey) => boolean;
  reset: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const allLocks: AsyncLock<any>[] = [];

const from = <T>(): AsyncLock<T> => {
  const state: AsyncLockStore<T> = {
    pendingPromises: [],
  };

  const reset = (): void => {
    state.pendingPromises = [];
  };

  const toList = (keys: LockKey[] | LockKey): LockKey[] =>
    Array.isArray(keys) ? keys : [keys];

  const getPendingPromises = (keys: LockKey[]): Promise<T>[] =>
    state.pendingPromises
      .filter(
        (pendingState) => intersection(pendingState.keys, keys).length > 0,
      )
      .map(({ promise }) => promise);

  const isPending = (keys: LockKey[] | LockKey): boolean => {
    const keysArray = toList(keys);
    return !!getPendingPromises(keysArray).length;
  };

  const waitForKeys = async (keys: LockKey[]): Promise<Maybe<T[]>> => {
    const pendingPromises = getPendingPromises(keys);
    return pendingPromises.length ? Promise.all(pendingPromises) : undefined;
  };

  const waitForKey = async (key: LockKey): Promise<Maybe<T>> =>
    (await waitForKeys([key]))?.[0];

  const acquire = async (
    keys: LockKey[] | LockKey,
    cb: () => Promise<T>,
  ): Promise<T> => {
    while (isPending(toList(keys))) {
      await waitForKeys(toList(keys));
    }

    const promise = cb();
    const pendingState = {
      keys: toList(keys),
      promise,
    };
    state.pendingPromises.push(pendingState);
    try {
      await promise;
    } finally {
      state.pendingPromises = state.pendingPromises.filter(
        (p) => p !== pendingState,
      );
    }

    return promise;
  };

  const asyncLock = {
    acquire,
    waitForKey,
    waitForKeys,
    isPending,
    reset,
  };
  allLocks.push(asyncLock);
  return asyncLock;
};

const resetAll = (): void => {
  allLocks.forEach((lock) => lock.reset());
};

export const AsyncLock = {
  resetAll,
  from,
};
