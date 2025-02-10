import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Maybe } from '@mono/common-dto';
import { Button } from '@/common/components/ui/button';
import { RouteParamKey, RouteParamValue } from '@/RoutePath';
import { useBanContent } from '../hooks/useBanContent';

const Paragraph = ({ content }: { content: string }) => (
  <p className="text-lg mb-8 text-center max-w-lg">{content}</p>
);

export function UserBannedPage() {
  const [searchParams] = useSearchParams();
  const banType = searchParams.get(
    RouteParamKey.BAN_TYPE,
  ) as Maybe<RouteParamValue>;

  const [clicked, setClicked] = useState(false);
  const { title, description, cta, paragraph } = useBanContent(banType);

  const handleOnClick = () => {
    setClicked(true);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-4xl font-bold mb-4">{title}</h1>
      <p className="text-lg mb-8 text-center max-w-lg">{description}</p>

      {banType === RouteParamValue.BAN_TYPE_PERMANENT ? (
        <Paragraph content={paragraph} />
      ) : !clicked ? (
        <Button onClick={handleOnClick} disabled={clicked}>
          {cta}
        </Button>
      ) : (
        <Paragraph content={paragraph} />
      )}
    </div>
  );
}
