import { act, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { toast } from 'sonner';
import { InviteData } from '@mono/common-dto';
import { GameInviteService } from '../../service/GameInviteService';
import { GameInviteActionContainer } from '../GameInviteActionContainer';

// Mock dependencies
vi.mock('sonner', () => {
  const toast = vi.fn();
  // @ts-expect-error - därför bre
  toast.success = vi.fn();
  // @ts-expect-error - därför bre
  toast.error = vi.fn();

  return { toast };
});

vi.mock('../../service/GameInviteService', () => ({
  GameInviteService: {
    sendInvite: vi.fn(),
    answerInvite: vi.fn(),
    playerReady: vi.fn(),
  },
}));

vi.mock('../../hooks/useGameInviteListeners', () => ({
  useGameInviteListeners: vi.fn((callback) => {
    (global as any).mockInviteCallback = callback;
  }),
}));

describe('GameInviteActionContainer', () => {
  const userId = 'test-user-id';
  let mockSendInvite: any;
  let mockAnswerInvite: any;
  let mockPlayerReady: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSendInvite = vi.mocked(GameInviteService.sendInvite);
    mockAnswerInvite = vi.mocked(GameInviteService.answerInvite);
    mockPlayerReady = vi.mocked(GameInviteService.playerReady);
  });

  const renderTestee = (gameActive = false) => {
    return render(
      <GameInviteActionContainer userId={userId} gameActive={gameActive} />,
    );
  };

  const simulateInvite = (inviteData: InviteData) => {
    act(() => {
      (global as any).mockInviteCallback(inviteData);
    });
  };

  it('should render invite button', () => {
    renderTestee();

    expect(
      screen.getByRole('button', { name: 'Invite to game' }),
    ).toBeVisible();
  });

  it('should disable invite button when gameActive is true', () => {
    renderTestee(true);

    const button = screen.getByRole('button', { name: 'Invite to game' });
    expect(button).toBeDisabled();
  });

  it('should send invite when invite button is clicked', async () => {
    const user = userEvent.setup();
    renderTestee();

    await user.click(screen.getByRole('button', { name: 'Invite to game' }));

    expect(mockSendInvite).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith('Invitation sent!');
  });

  it('should disable invite button after sending invite', async () => {
    const user = userEvent.setup();
    renderTestee();

    const button = screen.getByRole('button', { name: 'Invite to game' });
    await user.click(button);

    expect(button).toBeDisabled();
  });

  it('should show dialog when receiving an invite', () => {
    renderTestee();

    simulateInvite({ type: 'INVITE' });

    expect(screen.getByText('Wanna play a game?')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Accept' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Decline' })).toBeVisible();
  });

  it('should disable invite button when receiving an invite', () => {
    const { container } = renderTestee();

    const inviteButton = container.querySelector(
      'button[aria-label="Invite to game"]',
    );

    expect(inviteButton).not.toHaveAttribute('disabled');

    simulateInvite({ type: 'INVITE' });

    expect(inviteButton).not.toBeNull();
    expect(inviteButton).toHaveAttribute('disabled');
  });

  it('should handle accepting an invite', async () => {
    const user = userEvent.setup();
    renderTestee();

    simulateInvite({ type: 'INVITE' });
    await user.click(screen.getByRole('button', { name: 'Accept' }));

    expect(mockAnswerInvite).toHaveBeenCalledWith(true);
    expect(mockPlayerReady).toHaveBeenCalledWith(userId, false);
    expect(toast.success).toHaveBeenCalledWith('Invitation accepted');
  });

  it('should handle declining an invite', async () => {
    const user = userEvent.setup();
    renderTestee();

    simulateInvite({ type: 'INVITE' });
    await user.click(screen.getByRole('button', { name: 'Decline' }));

    expect(mockAnswerInvite).toHaveBeenCalledWith(false);
    expect(toast).toHaveBeenCalledWith('Invitation declined');
  });

  it('should close dialog and enable button after handling invite', async () => {
    const user = userEvent.setup();
    renderTestee();

    simulateInvite({ type: 'INVITE' });
    await user.click(screen.getByRole('button', { name: 'Decline' }));

    expect(screen.queryByText('Wanna play a game?')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Invite to game' }),
    ).not.toBeDisabled();
  });

  it('should call playerReady when receiving ACCEPT response', () => {
    renderTestee();

    simulateInvite({
      type: 'INVITE_RESPONSE',
      response: 'ACCEPT',
    });

    expect(mockPlayerReady).toHaveBeenCalledWith(userId, true);
    expect(
      screen.getByRole('button', { name: 'Invite to game' }),
    ).not.toBeDisabled();
  });

  it('should enable invite button when receiving any response', () => {
    const { container } = renderTestee();

    simulateInvite({ type: 'INVITE' });

    const inviteButton = container.querySelector(
      'button[aria-label="Invite to game"]',
    );
    expect(inviteButton).not.toBeNull();

    expect(inviteButton).toHaveAttribute('disabled');

    simulateInvite({
      type: 'INVITE_RESPONSE',
      response: 'DECLINE',
    });

    expect(inviteButton).not.toHaveAttribute('disabled');
  });
});
