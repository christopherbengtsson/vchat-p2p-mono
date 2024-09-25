import { describe, it, expect, vi } from 'vitest';
import { wrapSocketHandler } from '../wrapSocketHandler.js';
import logger from '../logger.js';

vi.mock('../logger.js');

describe('wrapSocketHandler', () => {
  it('should execute the handler function normally', () => {
    const mockHandler = vi.fn();
    const wrappedHandler = wrapSocketHandler(mockHandler);

    wrappedHandler('arg1', 'arg2');

    expect(mockHandler).toHaveBeenCalledWith('arg1', 'arg2');
  });

  it('should catch and log synchronous errors', () => {
    const mockHandler = vi.fn(() => {
      throw new Error('Sync error');
    });
    const wrappedHandler = wrapSocketHandler(mockHandler);

    wrappedHandler();

    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(Error) }),
      'Socket handler error',
    );
  });

  it('should catch and log asynchronous errors', () => {
    const mockHandler = vi.fn(() => Promise.reject(new Error('Async error')));
    const wrappedHandler = wrapSocketHandler(mockHandler);

    wrappedHandler();

    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(Error) }),
      'Socket handler error',
    );
  });
});
