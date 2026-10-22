import type { ScreenProps } from '../../core/screen';
import {
  Cabinet,
  Marquee,
  Bezel,
  Stage,
  ControlDeck,
  PlayerPips,
  TurnBadge,
  ActionBar,
} from '../../core/screen';
import type { ConnectFourState, DropMove } from './types';
import type { Move } from '../../core/types';
import { ConnectFourBoard } from './ConnectFour';

export function ConnectFourScreen(props: ScreenProps<ConnectFourState>) {
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
      <Marquee title={game.name} accent={accent} onBack={onExit} onReset={onReset} />
      <Bezel accent={accent} aspectRatio="1 / 1">
        <Stage accent={accent}>
          <ConnectFourBoard
            state={session.state}
            onMove={onMove as (m: Move<DropMove>) => void}
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
        <ActionBar onReset={onReset} />
      </ControlDeck>
    </Cabinet>
  );
}