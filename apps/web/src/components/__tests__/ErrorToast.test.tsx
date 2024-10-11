import { act, render, screen } from '@testing-library/react';
import { MainStore } from '../../stores/MainStore';
import { ErrorToast } from '../ErrorToast';
import { MainStoreContext } from '../../stores/RootStoreContext';
import { ErrorState } from '../../stores/model/ErrorState';

describe('<ErrorToast />', () => {
  // TODO: Disable rule for tests
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  vi.spyOn(console, 'warn').mockImplementation(() => {});

  it('shows a "restored" toast where it should', async () => {
    const store = new MainStore();
    store.errorState = ErrorState.CONNECT_ERROR;

    render(<ErrorToast />, {
      wrapper: ({ children }) => {
        return (
          <MainStoreContext.Provider value={store}>
            {children}
          </MainStoreContext.Provider>
        );
      },
    });

    expect(await screen.findByText('Connection error')).toBeInTheDocument();

    act(() => {
      store.errorState = undefined;
    });

    expect(await screen.findByText('Connection restored')).toBeInTheDocument();

    act(() => {
      store.errorState = ErrorState.SERVER_DISCONNECTED;
    });

    expect(
      await screen.findByText('You have been kicked out by an admin'),
    ).toBeInTheDocument();

    act(() => {
      store.errorState = undefined;
    });

    // TODO: Check if toast is hidden?

    act(() => {
      store.errorState = 'Something' as ErrorState;
    });

    expect(await screen.findByText('Unknown error')).toBeInTheDocument();
  });
});
