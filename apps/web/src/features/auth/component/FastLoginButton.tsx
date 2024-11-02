import { Zap } from 'lucide-react';
import { Button } from '@/common/components/ui/button';
import { LoadingButton } from '@/common/components/loading-button/LoadingButton';
import { useLogins } from '../hooks/useLogins';

export function FastLoginButton() {
  const { loginAnonymouslyMutation } = useLogins();

  const handleClick = () => {
    loginAnonymouslyMutation.mutate();
  };

  return (
    <Button
      className="w-full"
      onClick={handleClick}
      disabled={loginAnonymouslyMutation.isPending}
    >
      {loginAnonymouslyMutation.isPending ? (
        <LoadingButton />
      ) : (
        <Zap className="mr-2 h-4 w-4" />
      )}
      {loginAnonymouslyMutation.isPending ? 'Logging in...' : 'Fast login'}
    </Button>
  );
}
