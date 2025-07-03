import { useMemo } from 'react';
import { Maybe } from '@mono/common-dto';
import { RouteParamValue } from '@/RoutePath';

export const useBanContent = (banType: Maybe<RouteParamValue>) =>
  useMemo(() => {
    const ban =
      banType === RouteParamValue.BAN_TYPE_PERMANENT
        ? 'permanently'
        : 'temporarily';
    const title = `You have been ${ban} banned`;
    const description = `We've received multiple reports about inappropriate behavior on your account.
        You've therefore been ${ban} banned from using our application. ${
          banType === RouteParamValue.BAN_TYPE_PERMANENT
            ? 'Your account together with any associated data will safely be deleted within 24 hours.'
            : `Your ban will be lifted in the future and your account is not deleted.`
        }`;
    const cta = 'I understand and I will stop with my inappropriate behavior';
    const paragraph = 'Thank you for your understanding.';

    return {
      title,
      description,
      cta,
      paragraph,
    };
  }, [banType]);
