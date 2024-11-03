import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AnonymousUpgradeFormSchema } from '../model/AnonymousUpgradeForm';

export const useAnonymousUpgradeForm = (open: boolean) => {
  const form = useForm<AnonymousUpgradeFormSchema>({
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
    },
    resolver: zodResolver(AnonymousUpgradeFormSchema.schema),
  });

  useEffect(() => {
    form.reset();
  }, [form, open]);

  return form;
};
