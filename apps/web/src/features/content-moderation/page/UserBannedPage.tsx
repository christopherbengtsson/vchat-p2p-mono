import { useState } from 'react';
import { Navigate, useSearchParams } from 'react-router';
import { observer } from 'mobx-react';
import { Maybe } from '@mono/common-dto';
import {
  TypographyH1,
  TypographyP,
} from '@/common/components/typography/Typography';
import { Button } from '@/common/components/ui/button';
import { RouteParamKey, RouteParamValue, RoutePath } from '@/RoutePath';
import { useRootStore } from '@/stores/hooks/useRootStore';
import { useBanContent } from '../hooks/useBanContent';

export const UserBannedPage = observer(function UserBannedPage() {
  const { authStore } = useRootStore();
  const [searchParams] = useSearchParams();
  const banType = searchParams.get(
    RouteParamKey.BAN_TYPE,
  ) as Maybe<RouteParamValue>;

  const [clicked, setClicked] = useState(false);
  const { title, description, cta, paragraph } = useBanContent(banType);

  if (!authStore.permanentlyBanned && !authStore.temporarilyBanned) {
    return <Navigate to={RoutePath.HOME} />;
  }

  const handleOnClick = () => {
    setClicked(true);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <TypographyH1>{title}</TypographyH1>
      <TypographyP className="text-center max-w-lg">{description}</TypographyP>

      {banType === RouteParamValue.BAN_TYPE_PERMANENT ? (
        <TypographyP className="text-center max-w-lg">{paragraph}</TypographyP>
      ) : !clicked ? (
        <Button className="mt-6" onClick={handleOnClick} disabled={clicked}>
          {cta}
        </Button>
      ) : (
        <TypographyP className="text-center max-w-lg">{paragraph}</TypographyP>
      )}
    </div>
  );
});
