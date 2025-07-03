import { useCallback } from 'react';
import { observer } from 'mobx-react';
import { useRootStore } from '@/stores/hooks/useRootStore';
import { TypographyP } from '@/common/components/typography/Typography';
import { OrDivider } from '@/common/components/or-divider/OrDivider';
import { Button } from '@/common/components/ui/button';
import { DrawerDialog } from '@/common/components/drawer-dialog/DrawerDialog';
import { useNSFWDetection } from '../hooks/useNSFWDetection';
import { ReportContainer } from '../../../../user-report/container/ReportContainer';
import { BackdropBlur } from '../component/BackdropBlur';

interface Props {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  videoEnabled: boolean;

  onEndCall: VoidFunction;
}

export const NSFWOverlayContainer = observer(
  ({ videoRef, videoEnabled, onEndCall }: Props) => {
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

    useNSFWDetection({
      videoRef,
      videoEnabled,
      modelStatus,
      nsfwEnabled: config.enabled,
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

    if (!remoteStreamNSFW || modelStatus === 'error') {
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
