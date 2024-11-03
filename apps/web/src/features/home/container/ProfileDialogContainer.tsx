import { observer } from 'mobx-react';
import { useRootStore } from '@/stores/hooks/useRootStore';
import { DrawerDialog } from '@/common/components/drawer-dialog/DrawerDialog';
import { AnonymousUpgradeFormSchema } from '../model/AnonymousUpgradeForm';
import { useUpgradeAnonymousAccount } from '../hooks/useUpgradeAnonymousAccount';
import { useAnonymousUpgradeForm } from '../hooks/useAnonymousUpgradeForm';
import { AnonymousUpgradeForm } from '../component/AnonymousUpgradeForm';
import { FormSubmitButton } from '../component/FormSubmitButton';

interface Props {
  open: boolean;
  handleProfileOpen: VoidFunction;
}

export const ProfileDialogContainer = observer(function ProfileDialogContainer({
  open,
  handleProfileOpen,
}: Props) {
  const { authStore } = useRootStore();
  const { isPending, mutate, error } = useUpgradeAnonymousAccount();
  const form = useAnonymousUpgradeForm(open);
  const isAnonymous =
    authStore.session?.user.is_anonymous && !authStore.userUpgraded;

  const onSubmit = async ({ email, password }: AnonymousUpgradeFormSchema) => {
    mutate(
      { email, password },
      {
        onSuccess: () => {
          authStore.userUpgraded = true;
        },
      },
    );
  };

  return (
    <DrawerDialog
      open={open}
      toggle={handleProfileOpen}
      title={isAnonymous ? 'Save account' : 'Edit Profile'}
      description={
        isAnonymous
          ? 'Please enter your email and choose a password to be able to login again.'
          : 'Edit Profile'
      }
      mainContent={
        <AnonymousUpgradeForm form={form} onSubmit={onSubmit} error={error} />
      }
      footerContent={<FormSubmitButton isPending={isPending} />}
    />
  );
});
