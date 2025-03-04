import { RouterStateUtil } from '../RouterStateUtil';

describe('RouterStateUtil', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'history', {
      value: {
        replaceState: vi.fn(),
      },
      writable: true,
    });
  });

  it('should clear the router state', () => {
    RouterStateUtil.clear();

    expect(window.history.replaceState).toHaveBeenCalledWith({}, '');
  });
});
