import { useEffect } from 'react';
import { observer } from 'mobx-react';
import { Loader2 } from 'lucide-react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/common/components/ui/form';
import { Input } from '@/common/components/ui/input';
import { Button } from '@/common/components/ui/button';
import { useRootStore } from '@/stores/hooks/useRootStore';
import { DrawerDialog } from '@/common/components/drawer-dialog/DrawerDialog';
import { useUpgradeAnonymousAccount } from '../hooks/useUpgradeAnonymousAccount';

const formSchema = z
  .object({
    email: z.string().email({
      message: 'Invalid email address',
    }),
    password: z.string().min(6),
    confirmPassword: z.string(),
  })
  .superRefine(({ confirmPassword, password }, ctx) => {
    if (confirmPassword !== password) {
      ctx.addIssue({
        code: 'custom',
        message: "The passwords don't not match",
        path: ['confirmPassword'],
      });
    }
  });

interface Props {
  open: boolean;
  handleProfileOpen: VoidFunction;
}

export const ProfileDialog = observer(function ProfileDialog({
  open,
  handleProfileOpen,
}: Props) {
  const { authStore } = useRootStore();
  const { isPending, mutate, error } = useUpgradeAnonymousAccount();
  const isAnonymous =
    authStore.session?.user.is_anonymous && !authStore.userUpgraded;

  const form = useForm<z.infer<typeof formSchema>>({
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
    },
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    form.reset();
  }, [form, open]);

  const onSubmit = async ({ email, password }: z.infer<typeof formSchema>) => {
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
        <Form {...form}>
          <form
            id="profile-form"
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6"
          >
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input type="email" placeholder="Email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Password"
                      autoComplete="on"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Confirm password"
                      autoComplete="on"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {error && <FormMessage>{error.message}</FormMessage>}
          </form>
        </Form>
      }
      footerContent={
        <Button type="submit" form="profile-form">
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save details
        </Button>
      }
    />
  );
});
