import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/common/components/ui/card';
import { OrDivider } from '@/common/components/or-divider/OrDivider';
import { EmailLoginFormContainer } from './EmailLoginFormContainer';
import { FastLoginContainer } from './FastLoginContainer';

export function AuthFormContainer() {
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
          <EmailLoginFormContainer />

          <OrDivider />

          <FastLoginContainer />
        </div>
      </CardContent>
    </Card>
  );
}
