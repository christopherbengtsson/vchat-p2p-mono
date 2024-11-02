import { Loader2, Mail } from 'lucide-react';
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
import { useLogins } from '../hooks/useLogins';

const formSchema = z.object({
  email: z.string().email({
    message: 'Invalid email address',
  }),
  password: z.string().min(6),
});

export function EmailLoginFormContainer() {
  const { loginWithEmailMutation } = useLogins();

  const form = useForm<z.infer<typeof formSchema>>({
    defaultValues: {
      email: '',
      password: '',
    },
    resolver: zodResolver(formSchema),
    disabled: loginWithEmailMutation.isPending,
  });

  const handleSubmit = (credentials: z.infer<typeof formSchema>) => {
    loginWithEmailMutation.mutate(credentials);
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
              <FormControl className="text-primary-foreground">
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
              <FormControl className="text-primary-foreground">
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
      </form>

      <Button
        type="submit"
        form="profile-form"
        variant="secondary"
        disabled={loginWithEmailMutation.isPending}
        className="mt-8 w-full"
      >
        {loginWithEmailMutation.isPending && (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        )}
        {!loginWithEmailMutation.isPending && (
          <>
            <Mail className="mr-2 h-4 w-4" /> Login with email
          </>
        )}
      </Button>
    </Form>
  );
}
