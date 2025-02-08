import { wrapSocketHandler } from '../wrapSocketHandler.js';
import logger from '../logger.js';

vi.mock('../logger.js');

describe('wrapSocketHandler', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should execute the handler function normally', async () => {
    const mockHandler = vi.fn();
    const wrappedHandler = wrapSocketHandler(mockHandler);

    wrappedHandler('arg1', 'arg2');

    await Promise.resolve();
    expect(mockHandler).toHaveBeenCalledWith('arg1', 'arg2');
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('should catch and log synchronous errors', async () => {
    const expectedError = new Error('Sync error');
    const mockHandler = vi.fn(() => {
      throw expectedError;
    });
    const wrappedHandler = wrapSocketHandler(mockHandler);

    wrappedHandler();

    await expect
      .poll(() => logger.error)
      .toHaveBeenCalledWith(
        expect.objectContaining({ error: expectedError }),
        'Socket handler error',
      );
  });

  it('should catch and log asynchronous errors', async () => {
    const expectedError = new Error('Async error');
    const mockHandler = vi.fn(() => Promise.reject(expectedError));
    const wrappedHandler = wrapSocketHandler(mockHandler);

    wrappedHandler();

    await expect
      .poll(() => logger.error)
      .toHaveBeenCalledWith(
        expect.objectContaining({ error: expectedError }),
        'Socket handler error',
      );
  });

  it('should catch and log errors from promise chains', async () => {
    const expectedError = new Error('Chain error');
    const mockHandler = vi.fn((): Promise<void> => {
      return new Promise<void>((_resolve, reject) => {
        setTimeout(() => reject(expectedError), 10);
      });
    });
    const wrappedHandler = wrapSocketHandler(mockHandler);

    wrappedHandler();

    await expect
      .poll(() => logger.error)
      .toHaveBeenCalledWith(
        expect.objectContaining({ error: expectedError }),
        'Socket handler error',
      );
  });

  it('should not propagate errors but log them instead', async () => {
    const expectedError = new Error('Non-propagating error');
    const mockHandler = vi.fn(() => {
      throw expectedError;
    });
    const wrappedHandler = wrapSocketHandler(mockHandler);

    // The wrapped function should not throw even if the inner handler does.
    expect(() => {
      wrappedHandler();
    }).not.toThrow();

    await expect
      .poll(() => logger.error)
      .toHaveBeenCalledWith(
        expect.objectContaining({ error: expectedError }),
        'Socket handler error',
      );
  });
});
