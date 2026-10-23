import { useEffect, useRef, useState } from 'react';
import type { Move } from '../../core/types';
import type { LudoState, RollMove, PickMove, SelectMove } from './types';
import { COLOR_HEX } from './types';
import { legalPawnIndices } from './logic';
import { pawnCell, cellToPercent } from './board-map';
import { LudoBoardImage } from './LudoBoardImage';
import { Pawn } from '../../components/Pawn';
import { Dice } from '../../components/Dice';
import { tokens } from '../../theme/tokens';
import { play } from '../../theme/sounds';

interface Props {
  state: LudoState;
  onMove: (move: Move<RollMove | PickMove | SelectMove>) => void;
  disabled?: boolean;
}

export function LudoBoard({ state, onMove, disabled }: Props) {
  const [rolling, setRolling] = useState(false);
  const [animStep, setAnimStep] = useState<Record<string, number>>({});
  const [animating, setAnimating] = useState(false);
  
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // Engine state is authoritative. Clear temporary animation coordinates after any committed state change.
  useEffect(() => { setAnimStep({}); }, [state.pawns, state.dice, state.turn]);

  const currentColor = state.colors[state.turn];
  const currentId = state.playerIds[currentColor];
  const legal = state.mustMove && state.dice !== null ? legalPawnIndices(state, state.dice) : [];
  const availableDice = state.lastRoll && state.dice === null ? ([0,1] as const).filter(i => state.remainingDice[i] && legalPawnIndices(state, state.lastRoll![i]).length > 0) : [];
  // Show both rolled values, including a disabled die when it has no legal move.
  const showDieChoice = availableDice.length > 0 && Boolean(state.lastRoll) && !disabled;
  const chooseDie = (dieIndex: 0 | 1) => { if (disabled || animating || !state.lastRoll) return; onMove({type:'select', player:currentId, payload:{dieIndex}, ts:Date.now()}); };

  const handleRoll = () => {
    if (disabled || rolling || state.mustMove || animating || state.remainingDice.some(Boolean)) return;
    setRolling(true);
    play('dice-roll', 0.5);

    const die1 = 1 + Math.floor(Math.random() * 6);
    const die2 = 1 + Math.floor(Math.random() * 6);
    const value = die1 + die2;
    timers.current.push(
      setTimeout(() => {
        setRolling(false);
        play('dice-land', 0.5);
        onMove({
          type: 'roll',
          player: currentId,
          payload: { value, die1, die2, doubles: die1 === die2 },
          ts: Date.now(),
        });
      }, 650),
    );
  };

  const handlePickPawn = (index: number) => {
    if (!state.mustMove || animating) return;
    if (!legal.includes(index)) {
      play('error', 0.3);
      return;
    }

    const pawn = state.pawns[index];
    const dice = state.dice ?? 0;
    const targetStep = pawn.state === 'yard' ? 0 : pawn.step + dice;

    // Animate step-by-step
    setAnimating(true);
    const key = `${pawn.color}-${pawn.id}`;

    if (pawn.state === 'yard') {
      // Single hop from yard to ring start
      setAnimStep((prev) => ({ ...prev, [key]: 0 }));
      play('piece-move', 0.5);
      timers.current.push(
        setTimeout(() => {
          setAnimating(false);
          setAnimStep({});
          onMove({
            type: 'pick',
            player: currentId,
            payload: { pawnIndex: index, dieIndex: state.selectedDie ?? 0 },
            ts: Date.now(),
          });
        }, 260),
      );
      return;
    }

    // Multi-step hop along the ring
    const steps: number[] = [];
    for (let s = pawn.step + 1; s <= targetStep; s++) steps.push(s);

    let i = 0;
    const stepNext = () => {
      if (i >= steps.length) {
        setAnimating(false);
        setAnimStep({});
        onMove({
          type: 'pick',
          player: currentId,
          payload: { pawnIndex: index, dieIndex: state.selectedDie ?? 0 },
          ts: Date.now(),
        });
        return;
      }
      const next = steps[i];
      setAnimStep((prev) => ({ ...prev, [key]: next }));
      play('piece-move', 0.22);
      i++;
      timers.current.push(setTimeout(stepNext, 130));
    };

    stepNext();
  };

  return (
    <div style={styles.root}>
      <div style={styles.boardWrap}>
        <div style={styles.boardInner}>
          <LudoBoardImage />

          {state.pawns.map((pawn, i) => {
            const isLegal = state.mustMove && legal.includes(i);
            const isCurrent = pawn.color === currentColor;
            const key = `${pawn.color}-${pawn.id}`;

            // Use anim step if mid-animation, else the pawn's real step
            const step = animStep[key] ?? pawn.step;
            const st =
              pawn.state === 'yard'
                ? 'yard'
                : step > 51
                  ? step === 57
                    ? 'finished'
                    : 'home-col'
                  : 'ring';

            const cell = pawnCell(pawn.color, step, pawn.id, st, startStepFor(pawn.color));
            const pos = cellToPercent(cell);

            return (
              <div
                key={key}
                onClick={() => handlePickPawn(i)}
                role="button"
                tabIndex={isLegal && !disabled ? 0 : -1}
                aria-label={`${pawn.color} pawn ${pawn.id + 1}${isLegal ? ', legal move' : ''}`}
                onKeyDown={(event) => { if ((event.key === 'Enter' || event.key === ' ') && isLegal && !disabled) { event.preventDefault(); handlePickPawn(i); } }}
                style={{
                  position: 'absolute',
                  width: 36,
                  height: 36,
                  display: 'grid',
                  placeItems: 'center',
                  borderRadius: 999,
                  background: isLegal ? 'rgba(255,255,255,.24)' : 'transparent',
                  border: isLegal ? '2px solid rgba(255,255,255,.9)' : '2px solid transparent',
                  left: `${pos.left}%`,
                  top: `${pos.top}%`,
                  transform: 'translate(-50%, -50%)',
                  transition:
                    'left 130ms cubic-bezier(0.22, 1, 0.36, 1), top 130ms cubic-bezier(0.22, 1, 0.36, 1)',
                  zIndex: isLegal ? 20 : 10,
                  cursor: isLegal ? 'pointer' : 'default',
                  pointerEvents: isLegal ? 'auto' : 'none',
                  padding: 0,
                  appearance: 'none',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <Pawn
                  color={COLOR_HEX[pawn.color]}
                  size={25}
                  glowing={isLegal || (isCurrent && rolling)}
                />
              </div>
            );
          })}
        </div>
      </div>

      {showDieChoice && <div role="dialog" aria-modal="true" aria-label="Choose a die" style={styles.dieModal}><div style={styles.modalCard}><div style={{display:'flex',alignItems:'center',gap:8}}><span style={{...styles.modalIcon,background:COLOR_HEX[currentColor]}}>⚄</span><div style={{textAlign:'left'}}><strong style={{fontSize:18,display:'block'}}>Choose a die</strong><span style={{fontSize:11,opacity:.7}}>Move one pawn using one die</span></div></div><p style={styles.modalHint}>Tap an available die below. Then tap one of the glowing pawns on the board.</p><div style={styles.dieChoices}>{([0,1] as const).map(i=>{const usable=availableDice.includes(i);return <button key={i} disabled={!usable} aria-disabled={!usable} onClick={()=>chooseDie(i)} style={{...styles.dieChoice,background:usable?`linear-gradient(145deg,${COLOR_HEX[currentColor]},${COLOR_HEX[currentColor]}bb)`:'linear-gradient(145deg,#2b3040,#202431)',color:usable?'#151923':'#858a98',border:usable?'1px solid rgba(255,255,255,.55)':'1px solid rgba(255,255,255,.08)',boxShadow:usable?tokens.shadow.glow(COLOR_HEX[currentColor]):'none',opacity:usable?1:.72,cursor:usable?'pointer':'not-allowed'}}><span style={{fontSize:34,lineHeight:1}}>{state.lastRoll![i]}</span><small>{usable?`DIE ${i+1} · PLAY`:`DIE ${i+1} · NO MOVE`}</small></button>})}</div><div style={styles.modalFoot}><span style={{display:'inline-block',width:7,height:7,borderRadius:99,background:COLOR_HEX[currentColor]}} /> {currentColor} is playing</div></div></div>}

      <div style={styles.controls}>
        <div style={styles.statusBar}>
          {state.colors.map((c, i) => {
            const active = i === state.turn;
            return (
              <div
                key={c}
                style={{
                  ...styles.pill,
                  ...(active
                    ? {
                        borderColor: COLOR_HEX[c],
                        boxShadow: tokens.shadow.glow(COLOR_HEX[c]),
                      }
                    : {}),
                }}
              >
                <span style={{ ...styles.dot, background: COLOR_HEX[c] }} />
                <span style={styles.pillLabel}>{c}</span>
              </div>
            );
          })}
        </div>

        <div style={styles.rollRow}>
          <div style={styles.dicePair}>
            <Dice value={state.lastRoll?.[0] ?? null} rolling={rolling} color={COLOR_HEX[currentColor]} size={45} /><Dice value={state.lastRoll?.[1] ?? null} rolling={rolling} color={COLOR_HEX[currentColor]} size={45} />
          </div>
          <button
            style={{...styles.rollBtn,background:COLOR_HEX[currentColor],boxShadow:tokens.shadow.glow(COLOR_HEX[currentColor]),opacity:disabled||rolling||animating?0.5:1}}
            onClick={handleRoll}
            disabled={disabled || rolling || state.mustMove || animating || state.remainingDice.some(Boolean)}
          >{rolling ? 'Rolling two dice…' : animating ? 'Moving…' : state.mustMove ? `Choose a pawn • ${state.dice} spaces` : state.remainingDice.some(Boolean) ? 'Choose a die above' : 'Roll 2 Dice'}</button>
        </div>
      </div>
    </div>
  );
}

function startStepFor(color: 'R' | 'G' | 'Y' | 'B'): number {
  return { R: 0, G: 13, Y: 26, B: 39 }[color];
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    position:'relative',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    width: '100%',
    height: '100%',
  },
  boardWrap: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 0,
  },
  boardInner: {
    position: 'relative',
    width: '100%',
    maxWidth: 'min(98vw, 72dvh)',
    maxHeight: '100%',
    aspectRatio: '1 / 1',
  },
  dieModal: { position:'absolute', inset:0, zIndex:50, display:'grid', placeItems:'center', padding:12, background:'rgba(8,10,18,.72)', borderRadius:16 },
  modalCard: { width:'min(350px, 100%)', display:'flex', flexDirection:'column', alignItems:'stretch', gap:13, padding:'20px 18px 14px', borderRadius:24, border:'1px solid rgba(255,255,255,.18)', background:'linear-gradient(155deg,rgba(35,40,57,.98),rgba(17,20,31,.99))', boxShadow:'0 24px 70px rgba(0,0,0,.58),inset 0 1px rgba(255,255,255,.07)', textAlign:'center', backdropFilter:'blur(18px)' },
  modalIcon: { width:42,height:42,display:'grid',placeItems:'center',borderRadius:14,color:'#151923',fontSize:25,fontWeight:900,boxShadow:'0 5px 16px rgba(0,0,0,.22)' },
  modalHint: { margin:0,fontSize:12,lineHeight:1.55,color:'rgba(255,255,255,.72)',textAlign:'left' },
  modalFoot: { display:'flex',alignItems:'center',justifyContent:'center',gap:7,fontSize:11,fontWeight:800,letterSpacing:1,color:'rgba(255,255,255,.7)',paddingTop:4 },
  dieChoices: { display:'flex', justifyContent:'center', gap:12, marginTop:2 },
  dieChoice: { flex:1,maxWidth:118,height:92,minHeight:92,borderRadius:20,fontSize:30,fontWeight:900,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:8,transition:'transform 120ms ease,filter 120ms ease' },
  controls: {
    display: 'flex',
    flexDirection: 'column',
    gap: 7,
    alignItems: 'center',
  },
  statusBar: {
    display: 'flex',
    gap: tokens.space.sm,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  pill: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.space.xs,
    padding: '4px 12px',
    background: tokens.bg.surface,
    border: `1px solid ${tokens.bg.border}`,
    borderRadius: tokens.radius.pill,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
  },
  pillLabel: {
    fontSize: tokens.size.xs,
    color: tokens.text.secondary,
    fontWeight: 600,
    letterSpacing: 1,
  },
  rollRow: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: tokens.space.lg, flexWrap: 'wrap' },
  dicePair: { display: 'flex', gap: 8, alignItems: 'flex-end' },
  dieButton: { border: '1px solid transparent', borderRadius: 16, background: 'transparent', padding: 4 },
  
  rollBtn: {
    padding: '14px 28px',
    borderRadius: tokens.radius.md,
    color: tokens.text.inverse,
    fontFamily: tokens.font.display,
    fontWeight: 700,
    fontSize: tokens.size.sm,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
};