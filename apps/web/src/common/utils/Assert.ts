function isTrue(state: boolean, message?: string): asserts state {
  if (!state) {
    throw new Error(message);
  }
}

const isDefined = <T>(
  val: T,
  message?: string,
): asserts val is NonNullable<T> => {
  isTrue(val !== null && val !== undefined, message);
};

export interface AssertionFunctions {
  isTrue: typeof isTrue;
  isDefined: typeof isDefined;
}

export const Assert: AssertionFunctions = {
  isTrue,
  isDefined,
};
