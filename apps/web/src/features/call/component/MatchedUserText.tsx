import { observer } from 'mobx-react';
import { TypographyP } from '@/common/components/typography/Typography';

interface Props {
  partnerId: string;
}

export const MatchedUserText = observer(function MatchedUserText({
  partnerId,
}: Props) {
  return <TypographyP>Match with {partnerId}</TypographyP>;
});
