import type { ScreenProps } from '../../core/screen';
import {
  Cabinet,
  Marquee,
  Bezel,
  Stage,
  ControlDeck,
  PlayerPips,
  TurnBadge,
} from '../../core/screen';
import type { SnakeLadderState, RollMove } from './types';
import type { Move } from '../../core/types';
import { SnakeLadderBoard } from './SnakeLadder';

export function SnakeLadderScreen(props: ScreenProps<SnakeLadderState>) {
  const {
    game,
    session,
    currentId,
    isMyTurn,
    onMove,
    onReset,
    onExit,
    accent,
  } = props;

  return (
    <Cabinet accent={accent}>
      <Marquee
        title={game.name}
        accent={accent}
        onBack={onExit}
        onReset={onReset}
      />
      <Bezel accent={accent} aspectRatio="auto" bleed>
        <Stage accent={accent}>
          <SnakeLadderBoard
            state={session.state}
            onMove={onMove as (m: Move<RollMove>) => void}
            disabled={!isMyTurn || session.status !== 'playing'}
          />
        </Stage>
      </Bezel>
      <ControlDeck accent={accent}>
        <PlayerPips players={session.players} currentId={currentId} onPlayerSelect={props.onOpenPlayerProfile} />
        <TurnBadge
          players={session.players}
          currentId={currentId}
          status={session.status}
          result={session.result}
          isMyTurn={isMyTurn}
        />
        <span />
      </ControlDeck>
    </Cabinet>
  );
}