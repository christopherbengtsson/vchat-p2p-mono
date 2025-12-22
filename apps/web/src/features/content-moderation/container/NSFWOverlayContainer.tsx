import { useCallback } from 'react';
import { observer } from 'mobx-react';
import { Maybe } from '@mono/common-dto';
import { useRootStore } from '@/stores/hooks/useRootStore';
import { TypographyP } from '@/common/components/typography/Typography';
import { OrDivider } from '@/common/components/or-divider/OrDivider';
import { Button } from '@/common/components/ui/button';
import { DrawerDialog } from '@/common/components/drawer-dialog/DrawerDialog';
import { GameState } from '@/features/game/game-engine/model/GameState';
import { BackdropBlur } from '../component/BackdropBlur';
import { useNSFWDetection } from '../hooks/useNSFWDetection';
import { useGameAwareNSFWControl } from '../hooks/useGameAwareNSFWControl';
import { ReportContainer } from './ReportContainer';

interface Props {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  videoEnabled: boolean;
  onEndCall: VoidFunction;
  gameActive: boolean;
  gameState: Maybe<GameState>;
}

export const NSFWOverlayContainer = observer(
  ({ videoRef, videoEnabled, onEndCall, gameActive, gameState }: Props) => {
    const { contentModerationStore } = useRootStore();
    const {
      config,
      modelStatus,
      remoteStreamNSFW,
      remoteNSFWProbability,
      ignoreDetectedNSFW,
      setIgnoreDetectedNSFW,
      resetNSFWState,
      handleNSFWDetection,
    } = contentModerationStore;

    const effectiveNSFWEnabled = useGameAwareNSFWControl({
      gameActive,
      gameState,
      enableNSFW: config.enabled,
    });

    useNSFWDetection({
      videoRef,
      videoEnabled,
      modelStatus,
      nsfwEnabled: effectiveNSFWEnabled,
      intervalMs: config.analysisIntervalMs,
      detectionThreshold: config.threshold,
      remoteStreamNSFW,
      ignoreDetectedNSFW,
      handleNSFWDetection,
    });

    const handleContinueCall = useCallback(() => {
      setIgnoreDetectedNSFW(true);
    }, [setIgnoreDetectedNSFW]);

    const handleEndCall = useCallback(() => {
      onEndCall();
      resetNSFWState();
    }, [onEndCall, resetNSFWState]);

    if (
      !remoteStreamNSFW ||
      modelStatus === 'error' ||
      !config.enabled ||
      modelStatus !== 'ready'
    ) {
      return null;
    }

    return (
      <>
        <BackdropBlur />

        <DrawerDialog
          open={remoteStreamNSFW}
          toggle={handleContinueCall}
          title="Potentially Inappropriate Content"
          mainContent={
            <TypographyP className="text-center">
              This stream may contain inappropriate content.
              {import.meta.env.DEV &&
                `Confidence: ${Math.round(remoteNSFWProbability * 100)}%`}
            </TypographyP>
          }
          footerContent={
            <div className="flex flex-col items-center gap-4 gap-2 w-full">
              <div className="flex justify-center gap-2 w-full">
                <ReportContainer
                  noConfirmation
                  doOnSettled={resetNSFWState}
                  buttonText="Block and report"
                  ButtonComponent={(props) => (
                    <Button
                      className="w-1/2"
                      variant="destructive"
                      onClick={props.onClick}
                    >
                      {props.children}
                    </Button>
                  )}
                />

                <Button
                  className="w-1/2"
                  variant="secondary"
                  onClick={handleEndCall}
                >
                  End call
                </Button>
              </div>

              <OrDivider background="bg-background" />

              <Button
                onClick={handleContinueCall}
                variant="link"
                className="w-full"
              >
                Continue call
              </Button>
            </div>
          }
        />
      </>
    );
  },
);
