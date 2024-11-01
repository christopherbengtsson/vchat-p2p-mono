import { Navigate } from 'react-router-dom';
import { observer } from 'mobx-react';
import { FastLoginButton } from '@/components/FastLoginButton';
import { EmailLoginForm } from '@/components/EmailLoginForm';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useRootStore } from '../stores/RootStoreContext';

export const AuthPage = observer(function AuthPage() {
  const { authStore } = useRootStore();

  if (authStore.session) {
    return <Navigate replace to="/" />;
  }

  return (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Welcome</CardTitle>
        <CardDescription>
          Use your existing account by logging in with your email
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <div className="w-full max-w-sm flex flex-col items-center gap-4">
          <EmailLoginForm />

          <div className="relative w-full m-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t"></span>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                or
              </span>
            </div>
          </div>

          <FastLoginButton />
        </div>
      </CardContent>
    </Card>
  );
});
