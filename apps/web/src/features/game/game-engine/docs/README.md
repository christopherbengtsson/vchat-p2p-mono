# Components Overview

**GameStore**: MobX store that maintains the game state, score tracking, and round progression. Defines states such as IDLE, PREPARE_ROUND, ROUND_START, PLAYER_TURN, SPECTATOR_TURN, ROUND_END, and GAME_OVER.

**GameEngineService**: Generic service that handles communication between players, coordinates game events, and provides methods for initiating rounds, notifying players of state changes, and cleaning up resources.

**useGameEngine**: Core React hook that connects the UI to the game state system, handles event listeners, state transitions, and provides a simplified API for components to interact with the game system.

**Supporting Hooks:**

- **useGameStateHandlers**: Provides callbacks for handling game state transitions
- **useGameStateListeners**: Sets up event listeners for game round events
- **useAutomaticStateTransitions**: Handles automatic state transitions based on current state

## State Flow

Game starts in IDLE state:

- When it's a player's turn and they're in IDLE, the system transitions to PREPARE_ROUND
- From PREPARE_ROUND (after user confirms), transitions to ROUND_START
- Then automatically transitions to either:
  - PLAYER_TURN (if it's the player's turn)
  - SPECTATOR_TURN (if it's the opponent's turn)

When a player's turn completes:

- Transitions to ROUND_END if there are more rounds to play
- Or transitions to GAME_OVER if all rounds are complete (when round === maxRounds AND next player has already played)
- After the round/game ends, player 1 can initiate the next round or end the game

The state engine handles:

- Sending/receiving game events between players
- Managing player turns and round progression
- Tracking scores for both players
- Integrating with game-specific functionality via dependency injection

# UML Diagrams

## Game State Engine UML Diagram

```mermaid
classDiagram
    class GameStore {
        -opponentId: Maybe~string~
        -state: GameState
        -currentRound: number
        -maxRounds: number
        -isMyTurn: boolean
        -roundResults: RoundResult[]
        -currentScore: number
        +setCurrentScore(score)
        +get roundInProgress(): boolean
        +get isGameOver(): boolean
        +get myTotalScore(): number
        +get bothPlayersPlayedRound(): boolean
        +get opponentTotalScore(): number
        +get latestRoundResult(): RoundResult | null
    }

    class GameEngineService {
        +notifyRoundStart(playerId)
        +notifyPlayerTurnComplete(data)
        +notifyTurnSwitch()
        +addGameRoundListener(callback)
        +removeGameRoundListener(callback)
        +playerTurnCleanup()
        +dispose()
    }

    class useGameEngine {
        -gameStore: GameStore
        -gameSpecifics: GameSpecifics
        -onStartRound(playerId?)
        -onPlayerTurnComplete(playerId, score, round)
        -onSwitchTurns(isMyTurn)
        +startNewRound()
        +updateCurrentScore(score)
        +playerTurnComplete(score?)
        +endPlayerRound()
    }

    class GameSpecifics {
        +prepareGame: () => Promise~void~
        +disposables: GameSpecificDispose
    }

    class GameSpecificDispose {
        +roundDispose?: () => void
        +gameDispose?: () => void
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

    useGameEngine --> GameStore : uses
    useGameEngine --> GameEngineService : calls
    useGameEngine --> useGameStateHandlers : uses
    useGameEngine --> useGameStateListeners : uses
    useGameEngine --> useAutomaticStateTransitions : uses
    useGameEngine --> GameSpecifics : accepts
    GameSpecifics --> GameSpecificDispose : contains

    useGameStateHandlers --> GameStore : updates
    useGameStateHandlers --> GameEngineService : calls
    useGameStateHandlers --> GameSpecificDispose : uses

    useGameStateListeners --> GameEngineService : listens to
    useAutomaticStateTransitions --> GameStore : updates
    useAutomaticStateTransitions --> GameSpecifics : uses
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

    ROUND_END --> GAME_OVER : if round=maxRounds && nextPlayerHasAlreadyPlayed
    ROUND_END --> IDLE : endPlayerRound() if not GAME_OVER

    GAME_OVER --> [*]
```

## Sequence Diagram for Game Round

```mermaid
sequenceDiagram
    participant P1UI as Player 1 UI
    participant P1Engine as P1 useGameEngine
    participant P1GS as P1 GameStore
    participant GES as GameEngineService
    participant GameSpec as GameSpecifics
    participant P2GS as P2 GameStore
    participant P2Engine as P2 useGameEngine
    participant P2UI as Player 2 UI

    Note over P1GS: IDLE state, isMyTurn=true
    Note over P2GS: IDLE state, isMyTurn=false

    P1Engine->>GameSpec: prepareGame()
    P1Engine->>P1GS: setState(PREPARE_ROUND)
    P1GS-->>P1UI: Render start dialog

    P1UI->>P1Engine: startNewRound()
    P1Engine->>GES: notifyRoundStart(playerId)
    P1Engine->>P1GS: setState(ROUND_START)

    GES->>P2Engine: onMessageCallback({state: 'START_ROUND'})
    P2Engine->>P2GS: setState(ROUND_START)

    P1GS->>P1GS: setState(PLAYER_TURN) (automatic)
    P1GS-->>P1UI: Render player view

    P2GS->>P2GS: setState(SPECTATOR_TURN) (automatic)
    P2GS-->>P2UI: Render spectator view

    Note over P1UI, P2UI: Game is played

    P1UI->>P1Engine: playerTurnComplete(score)
    P1Engine->>GES: notifyPlayerTurnComplete(data)
    P1Engine->>P1GS: Add round result

    alt round === maxRounds && next player already played
        P1Engine->>P1GS: setState(GAME_OVER)
        P1Engine->>GES: dispose()
        P1Engine->>GameSpec: disposables.gameDispose()

        GES->>P2Engine: onMessageCallback({state: 'PLAYER_TURN_COMPLETE'})
        P2Engine->>P2GS: Add round result
        P2Engine->>P2GS: setState(GAME_OVER)
        P2Engine->>GameSpec: disposables.gameDispose()
    else otherwise
        P1Engine->>P1GS: setState(ROUND_END)
        P1Engine->>GES: playerTurnCleanup()
        P1Engine->>GameSpec: disposables.roundDispose()

        GES->>P2Engine: onMessageCallback({state: 'PLAYER_TURN_COMPLETE'})
        P2Engine->>P2GS: Add round result
        P2Engine->>P2GS: setState(ROUND_END)
        P2Engine->>GameSpec: disposables.roundDispose()
    end

    P1GS-->>P1UI: Render results dialog
    P2GS-->>P2UI: Render results dialog

    alt state === GAME_OVER
        P1UI->>P1UI: close dialog
        P2UI->>P2UI: close dialog
        Note over P1UI, P2UI: Game ends
    else state === ROUND_END
        P1UI->>P1Engine: endPlayerRound()
        P1Engine->>GES: notifyTurnSwitch()

        alt bothPlayersPlayedRound === true
            P1Engine->>P1GS: currentRound++
        end

        P1Engine->>P1GS: isMyTurn = false, setState(IDLE)

        GES->>P2Engine: onMessageCallback({state: 'SWITCH_TURNS'})

        alt bothPlayersPlayedRound === true
            P2Engine->>P2GS: currentRound++
        end

        P2Engine->>P2GS: isMyTurn = true, setState(IDLE)

        Note over P2UI: Now Player 2 is active
        Note over P2UI: Cycle repeats from IDLE state
    end
```

## Implementation Details

1. **Game Engine Architecture**:

   - **GameStore**: Generic state store used by all games
   - **GameEngineContainer**: Wraps games inside a GameStore provider
   - **useGameEngine**: Core hook that manages state transitions and communication
   - **GameEngineService**: Handles inter-player communication
   - **Game-specific services**: Implement game-specific functionality

2. **Dependency Injection Pattern**:

   - Each game provides its own implementation for:
     - prepareGame: Initializes game-specific resources
     - disposables.roundDispose: Cleans up after each round
     - disposables.gameDispose: Cleans up when the game ends

3. **Game Flow**:

   - Game starts in IDLE with one player having isMyTurn=true
   - That player's game transitions to PREPARE_ROUND automatically
   - After confirmation, it transitions to ROUND_START → PLAYER_TURN
   - For the other player: ROUND_START → SPECTATOR_TURN
   - After completing a turn, transitions to ROUND_END
   - Then back to IDLE with turns switched
   - Repeats until all rounds complete, then GAME_OVER

4. **Implementing a New Game**:
   - Create a game-specific service (like PutinsPuppetService)
   - Create a game-specific hook (like usePutinsPuppet) that configures useGameEngine
   - Implement game-specific UI components
   - The core game engine handles state management and communication

This architecture _should_ allow for multiple game types to share the same state management and communication infrastructure while implementing their own game-specific logic.
