import { CustomError } from './model/CustomError.js';

function isTrue(state: boolean, message?: string): asserts state {
  if (!state) {
    throw CustomError.badState(message);
  }
}

const isDefined = <T>(
  val: T,
  message?: string,
): asserts val is NonNullable<T> => {
  isTrue(val !== null && val !== undefined, message);
};

interface AssertionFunctions {
  isTrue: typeof isTrue;
  isDefined: typeof isDefined;
}

export const Assert: AssertionFunctions = {
  isTrue,
  isDefined,
};
