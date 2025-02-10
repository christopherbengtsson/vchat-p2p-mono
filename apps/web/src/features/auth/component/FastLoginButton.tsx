import { Zap } from 'lucide-react';
import { Button } from '@/common/components/ui/button';
import { LoadingButton } from '@/common/components/loading-button/LoadingButton';

interface Props {
  isLoading: boolean;
}

export function FastLoginButton({ isLoading }: Props) {
  return (
    <Button type="submit" className="w-full" disabled={isLoading}>
      {isLoading ? <LoadingButton /> : <Zap className="mr-2 h-4 w-4" />}
      {isLoading ? 'Logging in...' : 'Fast login'}
    </Button>
  );
}
