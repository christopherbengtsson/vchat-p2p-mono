import { Link } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Checkbox } from '@/common/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/common/components/ui/form';
import { FastLoginButton } from '../component/FastLoginButton';
import { useLogins } from '../hooks/useLogins';
import { RoutePath } from '../../../RoutePath';

const FormSchema = z.object({
  privacyPolicy: z.boolean().refine((val) => val, {
    message: 'You must agree to the privacy policy to continue',
  }),
});

export function FastLoginContainer() {
  const { loginAnonymouslyMutation } = useLogins();

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      privacyPolicy: false,
    },
  });

  const onSubmit = () => {
    loginAnonymouslyMutation.mutate();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FastLoginButton isLoading={loginAnonymouslyMutation.isPending} />
        <FormField
          control={form.control}
          name="privacyPolicy"
          render={({ field }) => (
            <>
              <FormMessage />
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Accept terms and conditions</FormLabel>
                  <FormDescription>
                    I agree to the{' '}
                    <Link
                      to={RoutePath.TERMS}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-primary"
                    >
                      Terms of Service.
                    </Link>
                  </FormDescription>
                </div>
              </FormItem>
            </>
          )}
        />
      </form>
    </Form>
  );
}
