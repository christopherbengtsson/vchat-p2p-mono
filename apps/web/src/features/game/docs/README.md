# Components Overview

**GameStore**: MobX store that maintains the game state, score tracking, and round progression. Defines states such as IDLE, PREPARE_ROUND, ROUND_START, PLAYER_TURN, SPECTATOR_TURN, ROUND_END, and GAME_OVER.

**GameRoundService**: Service that handles communication between players, manages audio/canvas streams, and coordinates game events. Provides methods for initiating rounds, notifying players of state changes, and cleaning up resources.

**useGameStateMachine**: React hook that connects the UI to the game state system, handles event listeners, state transitions, and provides a simplified API for components to interact with the game system.

**Supporting Hooks:**

- useGameStateHandlers: Provides callbacks for handling game state transitions
- useGameStateListeners: Sets up event listeners for game round events
- useAutomaticStateTransitions: Handles automatic state transitions based on current state

## State Flow

Game starts in IDLE state:

- When it's a player's turn and they're in IDLE, the system transitions to PREPARE_ROUND
- From PREPARE_ROUND (after user confirms), transitions to ROUND_START
- Then automatically transitions to either:
  - PLAYER_TURN (if it's the player's turn)
  - SPECTATOR_TURN (if it's the opponent's turn)

When a player's turn completes:

- Transitions to ROUND_END if there are more rounds to play
- Or transitions to GAME_OVER if all rounds are complete
- After the round/game ends, player 1 can initiate the next round or end the game

The state machine handles:

- Sending/receiving game events between players
- Managing player turns and round progression
- Tracking scores for both players
- Controlling the canvas streaming between players

# UML Diagrams

## Game State Machine UML Diagram

```mermaid
classDiagram
    class GameStore {
        -opponentId: Maybe~string~
        -state: GameState
        -currentRound: number
        -maxRounds: number
        -isMyTurn: boolean
        -roundResults: RoundResult[]
        -playerId: string
        -gameType: GameType
        +get roundInProgress(): boolean
        +get isGameOver(): boolean
        +get myTotalScore(): number
        +get bothPlayersPlayedRound(): boolean
        +get opponentTotalScore(): number
        +get latestRoundResult(): RoundResult | null
    }

    class GameRoundService {
        +initGamePerquisites()
        +notifyRoundStart(playerId)
        +notifyPlayerTurnComplete(data)
        +notifyTurnSwitch()
        +addGameRoundListener(callback)
        +removeGameRoundListener(callback)
        +setRemoteCanvasStream(callback)
        +removeRemoteCanvasStream()
        +playerTurnCleanup()
        +dispose()
    }

    class useGameStateMachine {
        -remoteCanvasStream: Maybe~MediaStream~
        -onStartRound(playerId?)
        -onPlayerTurnComplete(playerId, score, round)
        -onSwitchTurns(isMyTurn)
        +startNewRound()
        +playerTurnComplete(score)
        +endPlayerRound()
        +remoteCanvasStream
    }

    class useGameStateHandlers {
        +onStartRound(playerId?)
        +onPlayerTurnComplete(playerId, score, round)
        +onSwitchTurns(isMyTurn)
    }

    class useGameStateListeners {
        +onMessageCallback(roundData)
    }

    class useAutomaticStateTransitions {
        +prepareRound()
    }

    useGameStateMachine --> GameStore : uses
    useGameStateMachine --> GameRoundService : calls
    useGameStateMachine --> useGameStateHandlers : uses
    useGameStateMachine --> useGameStateListeners : uses
    useGameStateMachine --> useAutomaticStateTransitions : uses
    useGameStateHandlers --> GameStore : updates
    useGameStateHandlers --> GameRoundService : calls
    useGameStateListeners --> GameRoundService : listens to
    useAutomaticStateTransitions --> GameStore : updates
    useAutomaticStateTransitions --> GameRoundService : calls
```

## State Transition Diagram

```mermaid
stateDiagram-v2
    [*] --> IDLE

    IDLE --> PREPARE_ROUND : when isMyTurn=true (automatic)
    PREPARE_ROUND --> ROUND_START : startNewRound()

    ROUND_START --> PLAYER_TURN : automatic when isMyTurn=true
    ROUND_START --> SPECTATOR_TURN : automatic when isMyTurn=false

    PLAYER_TURN --> ROUND_END : playerTurnComplete(score)
    SPECTATOR_TURN --> ROUND_END : when opponent completes turn

    ROUND_END --> GAME_OVER : if round=maxRounds && both players completed the round
    ROUND_END --> IDLE : endPlayerRound() if not GAME_OVER

    GAME_OVER --> [*]
```

## Sequence Diagram for Game Round

```mermaid
sequenceDiagram
    participant P1UI as Player 1 UI
    participant P1SM as P1 useGameStateMachine
    participant P1GS as P1 GameStore
    participant GRS as GameRoundService
    participant P2GS as P2 GameStore
    participant P2SM as P2 useGameStateMachine
    participant P2UI as Player 2 UI

    Note over P1GS: IDLE state, isMyTurn=true
    Note over P2GS: IDLE state, isMyTurn=false

    P1SM->>GRS: initGamePerquisites()
    P1SM->>P1GS: setState(PREPARE_ROUND)
    P1GS-->>P1UI: Render StartGameAlertDialog

    P1UI->>P1SM: startNewRound()
    P1SM->>GRS: notifyRoundStart(playerId)
    P1SM->>P1GS: setState(ROUND_START)

    GRS->>P2SM: onMessageCallback({state: 'START_ROUND'})
    P2SM->>P2GS: setState(ROUND_START)

    P1GS->>P1GS: setState(PLAYER_TURN) (automatic)
    P1GS-->>P1UI: Render PlayerContainer

    P2GS->>P2GS: setState(SPECTATOR_TURN) (automatic)
    P2GS-->>P2UI: Render SpectatorContainer

    Note over P1UI, P2UI: Game is played - Player 1 draws

    P1UI->>P1SM: playerTurnComplete(score)
    P1SM->>GRS: notifyPlayerTurnComplete(data)
    P1SM->>P1GS: Add round result

    alt round === maxRounds && next player already played
        P1SM->>P1GS: setState(GAME_OVER)
        P1SM->>GRS: dispose()

        GRS->>P2SM: onMessageCallback({state: 'PLAYER_TURN_COMPLETE'})
        P2SM->>P2GS: Add round result
        P2SM->>P2GS: setState(GAME_OVER)
    else otherwise
        P1SM->>P1GS: setState(ROUND_END)
        P1SM->>GRS: playerTurnCleanup()

        GRS->>P2SM: onMessageCallback({state: 'PLAYER_TURN_COMPLETE'})
        P2SM->>P2GS: Add round result
        P2SM->>P2GS: setState(ROUND_END)
    end

    P1GS-->>P1UI: Render ResultDialogContainer
    P2GS-->>P2UI: Render ResultDialogContainer

    alt state === GAME_OVER
        P1UI->>P1UI: close dialog
        P2UI->>P2UI: close dialog
        Note over P1UI, P2UI: Game ends
    else state === ROUND_END
        P1UI->>P1SM: endPlayerRound()
        P1SM->>GRS: notifyTurnSwitch()

        alt bothPlayersPlayedRound === true
            P1SM->>P1GS: currentRound++
        end

        P1SM->>P1GS: isMyTurn = false, setState(IDLE)

        GRS->>P2SM: onMessageCallback({state: 'SWITCH_TURNS'})

        alt bothPlayersPlayedRound === true
            P2SM->>P2GS: currentRound++
        end

        P2SM->>P2GS: isMyTurn = true, setState(IDLE)

        Note over P2UI: Now Player 2 is active
        Note over P2UI: Cycle repeats from IDLE state
    end
```

## Implementation Details

1. GameStoreProvider - Creates and provides the GameStore instance to the component tree

2. GameContainer - The main container component that orchestrates the game UI based on the current state

3. Game Flow:
   - Game starts in IDLE with one player having isMyTurn=true
   - That player's game transitions to PREPARE_ROUND automatically
   - After confirmation, it transitions to ROUND_START → PLAYER_TURN
   - For the other player: ROUND_START → SPECTATOR_TURN
   - After completing a turn, transitions to ROUND_END
   - Then back to IDLE with turns switched
   - Repeats until all rounds complete, then GAME_OVER
4. Canvas Sharing:
   - During PLAYER_TURN, the active player's canvas is streamed to the other player
   - During SPECTATOR_TURN, the player sees the opponent's canvas stream
