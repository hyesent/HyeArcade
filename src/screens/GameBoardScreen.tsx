import type { ScreenProps } from '../core/screen';
import { Cabinet, Marquee, Bezel, Stage, ControlDeck, PlayerPips, TurnBadge } from '../core/screen';
import { TicTacToeBoard } from '../games/tic-tac-toe/TicTacToe';
import { GomokuBoard } from '../games/gomoku/Gomoku';
import { LudoBoard } from '../games/ludo/Ludo';
import { CheckersBoard } from '../games/checkers/Checkers';
import { CrazyEightsBoard } from '../games/crazy-eights/CrazyEights';
import { UnoBoard } from '../games/uno/Uno';
import { WhotBoard } from '../games/whot/Whot';
import { SolitaireBoard } from '../games/solitaire/Solitaire';
import { MahjongSolitaireBoard } from '../games/mahjong-solitaire/MahjongSolitaire';
import { VitaMahjongBoard } from '../games/vita-mahjong/VitaMahjong';
import { AyoBoard } from '../games/ayo/Ayo';

export function GameBoardScreen(props: ScreenProps<unknown>) {
  const { game, session, currentId, isMyTurn, onMove, onReset, onExit, accent } = props;
  const state = session.state as any;
  const playerIds: string[] = Array.isArray(state.playerIds) ? state.playerIds : session.players.map(player => player.id);
  const scores = state.scores && typeof state.scores === 'object' ? state.scores as Record<string, number> : null;
  const hands = Array.isArray(state.hands) ? state.hands as {playerId?:string;cards?:unknown[]}[] : [];
  const events = Array.isArray(state.log) ? (state.log as unknown[]).filter((entry): entry is string => typeof entry === 'string') : [];
  const hasScoreboard = !!scores || hands.length > 0;
  const playerName = (id:string) => session.players.find(player => player.id === id)?.name ?? id;
  const readableEvent = (entry:string) => session.players.reduce((value,player) => value.replaceAll(player.id, player.name), entry);
  const disabled = !isMyTurn || session.status !== 'playing';
  const actingPlayer = session.players.find((p) => p.id === currentId);
  const localId = actingPlayer?.kind === 'human'
    ? actingPlayer.id
    : session.players.find((p) => p.kind === 'human')?.id ?? session.players[0]?.id;

  const board = (() => {
    switch (game.id) {
      case 'tic-tac-toe': return <TicTacToeBoard state={state} onMove={onMove as any} disabled={disabled} />;
      case 'gomoku': return <GomokuBoard state={state} onMove={onMove as any} disabled={disabled} />;
      case 'ludo': return <LudoBoard state={state} onMove={onMove as any} disabled={disabled} />;
      case 'checkers': return <CheckersBoard state={state} onMove={onMove as any} disabled={disabled} />;
      case 'drafts': return <CheckersBoard state={state} onMove={onMove as any} disabled={disabled} />;
      case 'crazy-eights': return <CrazyEightsBoard state={state} onMove={onMove as any} disabled={disabled} playerId={localId} />;
      case 'uno': return <UnoBoard state={state} onMove={onMove as any} disabled={disabled} playerId={localId} />;
      case 'whot': return <WhotBoard state={state} onMove={onMove as any} disabled={disabled} playerId={localId} />;
      case 'solitaire': return <SolitaireBoard state={state} onMove={onMove as any} disabled={disabled} />;
      case 'mahjong-solitaire': return <MahjongSolitaireBoard state={state} onMove={onMove as any} disabled={disabled} />;
      case 'vita-mahjong': return <VitaMahjongBoard state={state} onMove={onMove as any} disabled={disabled} />;
      case 'ayo': return <AyoBoard state={state} onMove={onMove as any} disabled={disabled} />;
      default: return null;
    }
  })();

  return (
    <Cabinet accent={accent}>
      <Marquee title={game.name} accent={accent} onBack={onExit} onReset={onReset} />
      <Bezel accent={accent} aspectRatio={game.id === 'ludo' || game.id.includes('solitaire') ? '1 / 1' : 'auto'} bleed={game.id.includes('eights') || game.id === 'uno' || game.id === 'whot'}>
        <Stage accent={accent}>{board}</Stage>
      </Bezel>
      {(hasScoreboard || events.length > 0) && <section className="hye-game-overview" aria-label="Game scoreboard and events">
        {hasScoreboard && <div className="hye-scoreboard">
          <div className="hye-panel-heading"><span>Match Stats</span>{typeof state.round === 'number' && <span className="hye-stat-pill">Round {state.round}</span>}</div>
          <div className="hye-score-grid">{playerIds.map((id,index)=>{
            const hand=hands.find(item=>item.playerId===id);
            const active=id===playerIds[state.turn];
            const metrics:string[]=[];
            if(scores && typeof scores[id]==='number') metrics.push(`${scores[id]} points`);
            if(hand && Array.isArray(hand.cards)) metrics.push(`${hand.cards.length} cards`);
            if(game.id==='uno' && hand && 'hasCalledUno' in hand) metrics.push((hand as any).hasCalledUno?'UNO called':'UNO not called');
            return <article key={id} className={`hye-score-card ${active?'is-active':''}`}>
              <div className="hye-score-card-top"><span className="hye-score-seat">{index+1}</span><strong>{playerName(id)}</strong>{active&&<span className="hye-stat-pill active">ACTIVE</span>}</div>
              <div className="hye-score-metrics">{metrics.length ? metrics.map(metric=><span key={metric}>{metric}</span>) : <span>In the game</span>}</div>
            </article>;
          })}</div>
          {game.id==='whot' && <div className="hye-event-note">{state.requiredShape ? `Required shape: ${String(state.requiredShape)}` : 'Match the top card by shape or number.'}{state.marketCount ? ` · Market penalty: ${state.marketCount}` : ''}</div>}
          {game.id==='uno' && <div className="hye-event-note">Active colour: {String(state.activeColor ?? '—')}{state.pendingDraw ? ` · Draw penalty: +${state.pendingDraw}` : ''} · Draw pile: {Array.isArray(state.deck)?state.deck.length:'—'}</div>}
          {game.id==='crazy-eights' && <div className="hye-event-note">{state.suitToMatch ? `Suit to match: ${String(state.suitToMatch)}` : 'Match the top card by suit or rank.'} · Draw pile: {Array.isArray(state.deck)?state.deck.length:'—'}</div>}
        </div>}
        {events.length > 0 && <div className="hye-event-feed"><div className="hye-panel-heading"><span>Recent Events</span><span className="hye-stat-pill">{events.length} logged</span></div><div className="hye-event-list">{events.slice(-5).reverse().map((entry,index)=><div className="hye-event-row" key={`${index}-${entry}`}><span className="hye-event-number">{events.length-index}</span><span>{readableEvent(entry)}</span></div>)}</div></div>}
      </section>}
      <ControlDeck accent={accent}>
        <PlayerPips players={session.players} currentId={currentId} onPlayerSelect={props.onOpenPlayerProfile} />
        <TurnBadge players={session.players} currentId={currentId} status={session.status} result={session.result} isMyTurn={isMyTurn} />
        <span />
      </ControlDeck>
    </Cabinet>
  );
}
