import { act, render, screen } from '@testing-library/react';
import { ErrorToast } from '../ErrorToast';
import { ErrorState } from '../../stores/model/ErrorState';
import { RootStore } from '../../stores/RootStore';
import { RootStoreContext } from '../../stores/RootStoreContext';

describe('<ErrorToast />', () => {
  // TODO: Disable rule for tests
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  vi.spyOn(console, 'warn').mockImplementation(() => {});

  it('shows a "restored" toast where it should', async () => {
    const store = new RootStore();
    const { uiStore } = store;
    uiStore.errorState = ErrorState.CONNECT_ERROR;

    render(<ErrorToast />, {
      wrapper: ({ children }) => {
        return (
          <RootStoreContext.Provider value={store}>
            {children}
          </RootStoreContext.Provider>
        );
      },
    });

    expect(await screen.findByText('Connection error')).toBeInTheDocument();

    act(() => {
      uiStore.errorState = undefined;
    });

    expect(await screen.findByText('Connection restored')).toBeInTheDocument();

    act(() => {
      uiStore.errorState = ErrorState.SERVER_DISCONNECTED;
    });

    expect(
      await screen.findByText('You have been kicked out by an admin'),
    ).toBeInTheDocument();

    act(() => {
      uiStore.errorState = undefined;
    });

    // TODO: Check if toast is hidden?

    act(() => {
      uiStore.errorState = 'Something' as ErrorState;
    });

    expect(await screen.findByText('Unknown error')).toBeInTheDocument();
  });
});
