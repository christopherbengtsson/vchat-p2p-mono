import logger from "./logger.js";

export const wrapSocketHandler = (handler: Function) => {
  const handleError = (error: unknown) => {
    logger.error({ error }, "Socket handler error");
  };

  return (...args: unknown[]) => {
    try {
      const ret = handler.apply(this, args);
      if (ret && typeof ret.catch === "function") {
        ret.catch(handleError);
      }
    } catch (e) {
      handleError(e);
    }
  };
};
