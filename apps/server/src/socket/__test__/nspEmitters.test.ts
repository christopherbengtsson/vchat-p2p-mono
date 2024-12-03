import { nspEmitters } from '../handler/nspEmitters.js';

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

    connectionsCount();
    connectionsCount();
    connectionsCount();
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith('connections-count', 1);

    mockFn.mockClear();

    connectionsCount();
    nsp.sockets.size = 4;
    expect(mockFn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(5000);

    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith('connections-count', 4);
  });
});
