import { observer } from 'mobx-react';
import { Button } from '@/common/components/ui/button';
import { LoadingButton } from '@/common/components/loading-button/LoadingButton';

interface Props {
  isPending: boolean;
}

export const FormSubmitButton = observer(function FormSubmitButton({
  isPending,
}: Props) {
  return (
    <Button type="submit" form="profile-form">
      {isPending && <LoadingButton />}
      Save details
    </Button>
  );
});
