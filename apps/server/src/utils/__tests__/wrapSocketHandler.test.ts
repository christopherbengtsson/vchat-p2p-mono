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
    const expectedError = new Error('Sync error');
    const mockHandler = vi.fn(() => {
      throw expectedError;
    });
    const wrappedHandler = wrapSocketHandler(mockHandler);

    wrappedHandler();

    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ error: expectedError }),
      'Socket handler error',
    );
  });

  it('should catch and log asynchronous errors', async () => {
    const expectedError = new Error('Async error');
    const mockHandler = vi.fn(() => Promise.reject(expectedError));
    const wrappedHandler = wrapSocketHandler(mockHandler);

    await wrappedHandler();

    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ error: expectedError }),
      'Socket handler error',
    );
  });
});
