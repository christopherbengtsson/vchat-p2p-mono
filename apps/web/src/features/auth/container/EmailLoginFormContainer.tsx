import { useMemo, useState } from 'react';
import type Cap from '@cap.js/widget';
import { useForm } from 'react-hook-form';
import { Mail } from 'lucide-react';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { LoadingSpinner } from '@/common/components/loading-spinner/LoadingSpinner';
import { useLogins } from '../hooks/useLogins';
import { useSolveCaptcha } from '../../captcha/hooks/useSolveCaptcha';

const formSchema = z.object({
  email: z.string().email({
    message: 'Invalid email address',
  }),
  password: z.string().min(6),
});

export function EmailLoginFormContainer({
  capRef,
}: {
  capRef: React.RefObject<Cap | null>;
}) {
  const { loginWithEmailMutation } = useLogins();
  const { solve, isSolving } = useSolveCaptcha();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    defaultValues: {
      email: '',
      password: '',
    },
    resolver: zodResolver(formSchema),
    disabled: isSubmitting || loginWithEmailMutation.isPending || isSolving,
  });

  const loadingText = useMemo(() => {
    if (isSolving) {
      return 'Verifying...';
    } else if (isSubmitting || loginWithEmailMutation.isPending) {
      return 'Logging in...';
    }

    return 'Loading...';
  }, [isSubmitting, loginWithEmailMutation.isPending, isSolving]);

  const handleSubmit = async (credentials: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);

    const captchaResult = await solve(capRef?.current);

    if (!captchaResult.success) {
      setIsSubmitting(false);
      return;
    }

    loginWithEmailMutation.mutate(credentials, {
      onSettled: () => {
        setIsSubmitting(false);
      },
    });
  };

  return (
    <Form {...form}>
      <form
        id="profile-form"
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-6 w-full"
      >
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input
                  type="email"
                  placeholder="Email"
                  className="liquid-glass control"
                  {...field}
                />
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
                  className="liquid-glass control"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>

      <Button
        type="submit"
        form="profile-form"
        variant="secondary"
        disabled={isSubmitting || loginWithEmailMutation.isPending || isSolving}
        className="mt-8 w-full bg-black"
      >
        {isSubmitting || loginWithEmailMutation.isPending || isSolving ? (
          <LoadingSpinner />
        ) : (
          <>
            <Mail className="mr-2 h-4 w-4" />
            {isSubmitting || loginWithEmailMutation.isPending || isSolving
              ? loadingText
              : 'Login with email'}
          </>
        )}
      </Button>
    </Form>
  );
}
