import { UseFormReturn } from 'react-hook-form';
import type { AuthError } from '@supabase/supabase-js';
import type { Maybe } from '@mono/common-dto';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/common/components/ui/form';
import { Input } from '@/common/components/ui/input';
import { AnonymousUpgradeFormSchema } from '../model/AnonymousUpgradeForm';

interface Props {
  form: UseFormReturn<AnonymousUpgradeFormSchema>;
  onSubmit: ({ email, password }: AnonymousUpgradeFormSchema) => Promise<void>;
  error: Maybe<AuthError>;
}

export function AnonymousUpgradeForm({ form, onSubmit, error }: Props) {
  return (
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
  );
}
