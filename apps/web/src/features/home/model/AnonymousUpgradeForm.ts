import { z } from 'zod';

export const schema = z
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

export type AnonymousUpgradeFormSchema = z.infer<typeof schema>;

export const AnonymousUpgradeFormSchema = {
  schema,
};
