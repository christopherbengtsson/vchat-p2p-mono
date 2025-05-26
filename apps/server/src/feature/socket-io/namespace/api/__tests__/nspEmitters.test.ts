import { nspEmitters } from '../namespaceEmitter.js';

describe('nspEmitters', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('throttles emitConnectionsCount', async () => {
    const mockFn = vi.fn();
    const nsp = {
      emit: mockFn,
      sockets: {
        size: 1,
      },
    } as any;

    const { connectionsCount } = nspEmitters(nsp);

    // Should emit 1 immediately
    connectionsCount();
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith('connections-count', 1);

    mockFn.mockClear();

    // Should not emit due to cooldown
    nsp.sockets.size = 4;
    connectionsCount();
    expect(mockFn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(5000);

    // Should emit again after cooldown
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith('connections-count', 4);
  });
});
