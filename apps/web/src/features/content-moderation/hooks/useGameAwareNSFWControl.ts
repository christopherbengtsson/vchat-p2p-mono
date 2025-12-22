import { useMemo } from 'react';
import { Maybe } from '@mono/common-dto';
import { GameState } from '@/features/game/game-engine/model/GameState';

interface UseGameAwareNSFWControlProps {
  gameActive: boolean;
  gameState: Maybe<GameState>;
  enableNSFW: boolean;
}

/**
 * Controls NSFW detection based on game state to optimize performance.
 * Pauses NSFW during active gameplay (both player and spectator turns).
 * Resumes during game preparation, results, and game over states.
 */
export const useGameAwareNSFWControl = ({
  gameActive,
  gameState,
  enableNSFW,
}: UseGameAwareNSFWControlProps): boolean => {
  return useMemo(() => {
    if (!gameActive || !gameState) {
      return enableNSFW; // Normal NSFW when not gaming
    }

    // Pause NSFW during active gameplay (player and spectator turns)
    // Player needs resources for 60 FPS, spectator is watching canvas stream
    if (
      gameState === GameState.PLAYER_TURN ||
      gameState === GameState.SPECTATOR_TURN
    ) {
      return false;
    }

    // Resume during PREPARE_ROUND, ROUND_END, GAME_OVER (normal video call)
    return enableNSFW;
  }, [gameActive, gameState, enableNSFW]);
};
