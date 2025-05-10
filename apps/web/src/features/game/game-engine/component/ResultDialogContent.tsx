import { observer } from 'mobx-react';
import { Trophy, Target, Award } from 'lucide-react';
import {
  TypographyH2,
  TypographyP,
} from '@/common/components/typography/Typography';
import { Card, CardContent } from '@/common/components/ui/card';
import { Badge } from '@/common/components/ui/badge';

interface Props {
  userScore: number;
  round: number;
  gameType?: string;
  additionalStats?: Record<string, number | string>;
}

export const ResultDialogContent = observer(function ResultDialogContent({
  userScore,
  round,
  additionalStats = {},
}: Props) {
  return (
    <div className="space-y-6 py-4">
      <TypographyH2 className="text-center">Results</TypographyH2>

      <div className="grid grid-cols-2 gap-4">
        <Card className="border-2 border-primary/20 shadow-md">
          <CardContent className="flex flex-col items-center justify-center p-6">
            <Trophy className="h-10 w-10 text-yellow-500 mb-2" />
            <TypographyP noFirstMarginTop>Score</TypographyP>
            <TypographyP noFirstMarginTop className="text-3xl font-bold">
              {userScore}
            </TypographyP>
          </CardContent>
        </Card>

        <Card className="border-2 border-primary/20 shadow-md">
          <CardContent className="flex flex-col items-center justify-center p-6">
            <Target className="h-10 w-10 text-blue-500 mb-2" />
            <TypographyP noFirstMarginTop>Round</TypographyP>
            <TypographyP noFirstMarginTop className="text-3xl font-bold">
              {round}
            </TypographyP>
          </CardContent>
        </Card>
      </div>

      {Object.keys(additionalStats).length > 0 && (
        <Card className="border-2 border-primary/20 shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-3">
              <Award className="h-5 w-5 text-primary" />
              <TypographyP noFirstMarginTop>Additional Stats</TypographyP>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(additionalStats).map(([key, value]) => (
                <div key={key} className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{key}:</span>
                  <Badge variant="outline" className="font-mono">
                    {value}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
});
