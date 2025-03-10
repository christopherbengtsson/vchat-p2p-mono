import { observer } from 'mobx-react';
import { Button } from '@/common/components/ui/button';
import { LoadingSpinner } from '@/common/components/loading-spinner/LoadingSpinner';

interface Props {
  isPending: boolean;
}

export const FormSubmitButton = observer(function FormSubmitButton({
  isPending,
}: Props) {
  return (
    <Button type="submit" form="profile-form">
      {isPending && <LoadingSpinner />}
      Save details
    </Button>
  );
});
