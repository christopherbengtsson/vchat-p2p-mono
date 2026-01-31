import { render, screen, act } from '@testing-library/react';
import { FindMatchButton } from '../FindMatchButton';

describe('FindMatchButton', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should render find match button when not loading', () => {
    render(
      <FindMatchButton
        onClick={vi.fn()}
        connecting={false}
        startingMedia={false}
        loadingState="idle"
      />,
    );

    expect(
      screen.getByRole('button', { name: 'Find match' }),
    ).toBeInTheDocument();
  });

  it('should show timeout message after 5 seconds of content moderation loading', () => {
    render(
      <FindMatchButton
        onClick={vi.fn()}
        connecting={false}
        startingMedia={false}
        loadingState="contentModeration"
      />,
    );

    expect(
      screen.getByRole('button', { name: 'Loading safety features...' }),
    ).toBeInTheDocument();

    // Message should be in the document but hidden (opacity-0)
    const message = screen.getByText(/download our content moderation model/i);
    expect(message).toBeInTheDocument();
    expect(message).toHaveClass('opacity-0');

    // Advance time by 5 seconds
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // Message should now be visible (opacity-100)
    expect(message).toHaveClass('opacity-100');
    expect(message).not.toHaveClass('opacity-0');
  });

  it('should not show timeout message if loading state changes before 5 seconds', () => {
    const { rerender } = render(
      <FindMatchButton
        onClick={vi.fn()}
        connecting={false}
        startingMedia={false}
        loadingState="contentModeration"
      />,
    );

    expect(
      screen.getByRole('button', { name: 'Loading safety features...' }),
    ).toBeInTheDocument();

    const message = screen.getByText(/download our content moderation model/i);
    expect(message).toHaveClass('opacity-0');

    // Advance time by 3 seconds (less than 5)
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    // Change loading state
    rerender(
      <FindMatchButton
        onClick={vi.fn()}
        connecting={false}
        startingMedia={false}
        loadingState="mediaCheck"
      />,
    );

    // Message should remain hidden
    expect(message).toHaveClass('opacity-0');
    expect(message).not.toHaveClass('opacity-100');
  });

  it('should hide timeout message when loading state changes from contentModeration', () => {
    const { rerender } = render(
      <FindMatchButton
        onClick={vi.fn()}
        connecting={false}
        startingMedia={false}
        loadingState="contentModeration"
      />,
    );

    const message = screen.getByText(/download our content moderation model/i);

    // Advance time to show message
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(message).toHaveClass('opacity-100');

    // Change loading state
    rerender(
      <FindMatchButton
        onClick={vi.fn()}
        connecting={false}
        startingMedia={false}
        loadingState="idle"
      />,
    );

    // Message should be hidden again
    expect(message).toHaveClass('opacity-0');
    expect(message).not.toHaveClass('opacity-100');
  });
});
