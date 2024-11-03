import { observer } from 'mobx-react';

interface Props {
  partnerId: string;
}

export const MatchedUserText = observer(function MatchedUserText({
  partnerId,
}: Props) {
  return <p className="text-primary-foreground">Match with {partnerId}</p>;
});
