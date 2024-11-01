import { Loader2, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSupabaseAuth } from '../hooks/useSupabaseAuth';

export function FastLoginButton() {
  const { loginAnonymouslyMutation } = useSupabaseAuth();

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
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Zap className="mr-2 h-4 w-4" />
      )}
      {loginAnonymouslyMutation.isPending ? 'Logging in...' : 'Fast login'}
    </Button>
  );
}
