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
  termsOfService: z.boolean().refine((val) => val, {
    message: 'You must agree to the privacy policy to continue',
  }),
});

export function FastLoginContainer() {
  const { loginAnonymouslyMutation } = useLogins();

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      termsOfService: false,
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
          name="termsOfService"
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
                  <FormLabel>I confirm that I am 18 or older</FormLabel>
                  <FormDescription className="text-xs">
                    I agree to the{' '}
                    <Link
                      to={RoutePath.TERMS}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-primary"
                    >
                      Terms of Service
                    </Link>{' '}
                    including the acceptable use policy and privacy terms. I
                    understand my data will be processed according to GDPR/CCPA
                    requirements.
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
