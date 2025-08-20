import { useEffect, useRef, useCallback } from 'react';
import type { Maybe } from '@mono/common-dto';
import type { Pipe } from '../model/Pipe';
import type { ScaleFactor } from '../model/DrawProps';
import {
  BASE_PLAYER_SIZE_PERCENT,
  PLAYER_X_POS_MULTIPLIER,
  PERFORMANCE,
} from '../model/constants';
import { CanvasUtil } from '../util/CanvasUtil';
import { AssetService } from '../service/AssetService';
import { CanvasCollisionService } from '../service/CanvasCollisionService';
import { CanvasPlayerService } from '../service/CanvasPlayerService';
import { CanvasPipeService } from '../service/CanvasPipeService';
import { CanvasDrawService } from '../service/CanvasDrawService';
import { CanvasHeartService } from '../service/CanvasHeartService';
import { useDeathAnimation } from './useDeathAnimation';

interface In {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  endAudioRef: React.RefObject<HTMLAudioElement | null>;
  scaleFactor: ScaleFactor;
  onGameOver: VoidFunction;
  handleScoreUpdate: (score: number) => void;
  getPitch: () => Maybe<[number, number]>;
}

export const useCanvasAnimate = ({
  canvasRef,
  endAudioRef,
  scaleFactor,
  handleScoreUpdate,
  onGameOver,
  getPitch,
}: In) => {
  const requestRef = useRef<number>(null);
  const frameCountRef = useRef<number>(0);
  const heartAnimationStartedRef = useRef<boolean>(false);
  const pipesPassedRef = useRef<number>(0);
  const playerXRef = useRef<number>(0);
  const playerYRef = useRef<number>(0);
  const velocityRef = useRef<number>(0);

  const lastPitchTimeRef = useRef<number>(0);
  const cachedPitchRef = useRef<Maybe<[number, number]>>(null);

  // Cache frequently calculated values per frame
  const frameDataRef = useRef<{
    canvasWidth: number;
    canvasHeight: number;
    playerSize: number;
    playerSizePercent: number;
    playerX: number;
  } | null>(null);

  // Reusable collision parameters object to reduce allocations
  const collisionParamsRef = useRef({
    playerX: 0,
    playerY: 0,
    playerWidth: 0,
    playerHeight: 0,
    pipes: [] as Pipe[],
    canvasWidth: 0,
    scaleFactor: scaleFactor,
  });

  const getThrottledPitch = useCallback((): Maybe<[number, number]> => {
    const currentTime = performance.now();

    // Only get new pitch data every 33ms (30fps) instead of every 16ms (60fps)
    if (
      currentTime - lastPitchTimeRef.current <
      PERFORMANCE.AUDIO_THROTTLE_MS
    ) {
      return cachedPitchRef.current;
    }

    const pitchData = getPitch();
    cachedPitchRef.current = pitchData;
    lastPitchTimeRef.current = currentTime;
    return pitchData;
  }, [getPitch]);

  const {
    initDeathAnimation,
    animateDeath,
    deathAnimationFramesRef,
    isDeadRef,
  } = useDeathAnimation({
    velocityRef,
    playerXRef,
    playerYRef,
    endAudioRef,
    canvasRef,
    scaleFactor,
  });

  const endGame = useCallback(() => {
    if (!requestRef.current) {
      return;
    }

    cancelAnimationFrame(requestRef.current);
    CanvasDrawService.clearCache();
    CanvasPipeService.resetPipes();
    onGameOver();
  }, [onGameOver]);

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    if (!AssetService.areAssetsReady()) {
      requestRef.current = requestAnimationFrame(animate);
      return;
    }

    // Cache frame data calculations once per frame
    const canvasWidth = canvas.width / scaleFactor.devicePixelRatio;
    const canvasHeight = canvas.height / scaleFactor.devicePixelRatio;
    const playerSizePercent = CanvasUtil.getScaledValue(
      BASE_PLAYER_SIZE_PERCENT,
      scaleFactor,
    );
    const playerSize = canvasWidth * playerSizePercent;
    const playerX = canvasWidth * PLAYER_X_POS_MULTIPLIER;

    frameDataRef.current = {
      canvasWidth,
      canvasHeight,
      playerSize,
      playerSizePercent,
      playerX,
    };

    // Update player X position for reference (used in death animation)
    playerXRef.current = playerX;

    // Start heart animation if it hasn't started yet and game is not over
    if (!heartAnimationStartedRef.current && !isDeadRef.current) {
      CanvasHeartService.startHeartAnimation();
      heartAnimationStartedRef.current = true;
    }

    if (!isDeadRef.current) {
      CanvasHeartService.updateHeartAnimation();

      const pitchData = getThrottledPitch();
      if (pitchData) {
        CanvasPlayerService.updatePlayerPosition(
          pitchData,
          frameDataRef.current.canvasHeight,
          frameDataRef.current.playerSize,
          playerYRef,
          velocityRef,
          scaleFactor,
        );
      }

      CanvasPipeService.addPipe(
        frameCountRef,
        frameDataRef.current.canvasWidth,
        frameDataRef.current.canvasHeight,
        frameDataRef.current.playerSize,
        scaleFactor,
        pipesPassedRef,
      );

      CanvasPipeService.movePipes(
        pipesPassedRef,
        scaleFactor,
        frameDataRef.current.canvasWidth,
      );

      CanvasPipeService.removePipes();

      // Check for collisions using cached values and reusable params object
      const frameData = frameDataRef.current;
      if (!frameData) return;

      // Update reusable collision params object instead of creating new one
      const collisionParams = collisionParamsRef.current;
      collisionParams.playerX = frameData.playerX;
      collisionParams.playerY = playerYRef.current;
      collisionParams.playerWidth = frameData.playerSize;
      collisionParams.playerHeight = frameData.playerSize;
      collisionParams.pipes = CanvasPipeService.getActivePipes();
      collisionParams.canvasWidth = frameData.canvasWidth;
      collisionParams.scaleFactor = scaleFactor;

      const pipeHit = CanvasCollisionService.isCollision(collisionParams);

      if (pipeHit) {
        initDeathAnimation();
      } else {
        handleScoreUpdate(pipesPassedRef.current);
      }
    } else {
      // Skip expensive frame data calculations when dead - only animate death
      const animationFinished = animateDeath();
      const soundFinished = !endAudioRef.current
        ? true
        : endAudioRef.current.ended;

      if (animationFinished && soundFinished) {
        endGame();
        return;
      }
    }

    // Draw the current frame - reuse cached frame data when possible
    const frameData = frameDataRef.current;
    CanvasDrawService.drawCanvas({
      ctx,
      xPos: frameData ? frameData.playerX : playerXRef.current,
      yPos: playerYRef.current,
      scaleFactor,
      velocity: velocityRef.current,
      pipeSpeed: CanvasPipeService.getPipeSpeed(pipesPassedRef, scaleFactor),
      frameCount: frameCountRef.current,
      isDead: isDeadRef.current,
      deathFrames: deathAnimationFramesRef.current,
      playerSize: frameData?.playerSize,
    });

    // Schedule next frame
    requestRef.current = requestAnimationFrame(animate);
  }, [
    canvasRef,
    scaleFactor,
    isDeadRef,
    deathAnimationFramesRef,
    getThrottledPitch,
    initDeathAnimation,
    handleScoreUpdate,
    animateDeath,
    endAudioRef,
    endGame,
  ]);

  // Initialize player position in the middle of the canvas
  useEffect(() => {
    if (canvasRef.current) {
      const canvasHeight =
        canvasRef.current.height / scaleFactor.devicePixelRatio;
      playerYRef.current = canvasHeight / 2;

      const canvasWidth =
        canvasRef.current.width / scaleFactor.devicePixelRatio;
      playerXRef.current = canvasWidth * PLAYER_X_POS_MULTIPLIER;
    }
  }, [canvasRef, scaleFactor]);

  // Initialize pool and render game
  useEffect(() => {
    CanvasPipeService.initializePool();
    requestRef.current = requestAnimationFrame(animate);

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [animate]);
};
