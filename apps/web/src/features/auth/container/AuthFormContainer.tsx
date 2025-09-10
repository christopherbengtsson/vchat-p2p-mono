import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/common/components/ui/card';
import { OrDivider } from '@/common/components/or-divider/OrDivider';
import { useInitCaptcha } from '../../captcha/hooks/useInitCaptcha';
import { EmailLoginFormContainer } from './EmailLoginFormContainer';
import { FastLoginContainer } from './FastLoginContainer';

export function AuthFormContainer() {
  const cap = useInitCaptcha();

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="w-full max-w-sm flex flex-col items-center p-4 pointer-events-auto">
        <Card className="w-[350px] liquid-glass">
          <CardHeader>
            <CardTitle>Welcome</CardTitle>
            <CardDescription>
              Use your existing account by logging in with your email
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="w-full max-w-sm flex flex-col items-center gap-4">
              <EmailLoginFormContainer capRef={cap} />

              <OrDivider background="transparent" />

              <FastLoginContainer capRef={cap} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
