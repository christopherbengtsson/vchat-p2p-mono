import { ShieldAlert } from 'lucide-react';
import { Button } from '@/common/components/ui/button';

interface Props {
  onClick: VoidFunction;
}

export function ReportButton({ onClick }: Props) {
  return (
    <div className="absolute top-4 left-4 z-50">
      <Button
        aria-label="Report user"
        variant="secondary"
        size="icon"
        onClick={onClick}
      >
        <ShieldAlert className="h-6 w-6" />
      </Button>
    </div>
  );
}
