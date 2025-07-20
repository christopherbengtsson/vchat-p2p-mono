import { Zap } from 'lucide-react';
import { Button } from '@/common/components/ui/button';
import { LoadingSpinner } from '@/common/components/loading-spinner/LoadingSpinner';

interface Props {
  isLoading: boolean;
  loadingText: string;
}

export function FastLoginButton({ isLoading, loadingText }: Props) {
  return (
    <Button type="submit" className="w-full" disabled={isLoading}>
      {isLoading ? <LoadingSpinner /> : <Zap className="mr-2 h-4 w-4" />}
      {isLoading ? loadingText : 'Fast login'}
    </Button>
  );
}
