import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { TestWithQueryContext } from '@/testUtils';
import { FastLoginContainer } from '../FastLoginContainer';
import { AuthService } from '../../service/AuthService';

vi.mock('react-router');

describe('FastLoginContainer', () => {
  const authServiceSpy = vi
    .spyOn(AuthService, 'loginAnonymously')
    .mockResolvedValue();

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be possible to login as anonymous', async () => {
    const user = userEvent.setup();
    render(<FastLoginContainer capRef={null as any} />, {
      wrapper: TestWithQueryContext,
    });

    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Fast login' }));

    expect(authServiceSpy).toHaveBeenCalledOnce();
  });

  it('should not be possible to login as anonymous without accepting terms of service', async () => {
    const user = userEvent.setup();
    render(<FastLoginContainer capRef={null as any} />, {
      wrapper: TestWithQueryContext,
    });

    await user.click(screen.getByRole('button', { name: 'Fast login' }));

    expect(authServiceSpy).not.toHaveBeenCalled();
  });
});
