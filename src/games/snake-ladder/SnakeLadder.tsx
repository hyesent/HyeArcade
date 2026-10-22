import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { Move } from '../../core/types';
import type { SnakeLadderState, RollMove } from './types';
import { SQUARE_CENTER, transitionAt } from './board-map';
import { resolveMove } from './logic';
import { Pawn } from '../../components/Pawn';
import { Dice } from '../../components/Dice';
import { BOARDS } from '../../assets/boards';
import { tokens } from '../../theme/tokens';
import { play } from '../../theme/sounds';

interface Props {
  state: SnakeLadderState;
  onMove: (move: Move<RollMove>) => void;
  disabled?: boolean;
}

const HOP_MS = 180;
const TRANSITION_MS = 900;
const SETTLE_MS = 350;
const DICE_ROLL_MS = 900;
const TURN_HANDOFF_MS = 500;

export function SnakeLadderBoard({ state, onMove, disabled }: Props) {
  const [display, setDisplay] = useState<Record<string, number>>(() =>
    Object.fromEntries(state.players.map((p) => [p.id, p.position])),
  );
  const [rolling, setRolling] = useState(false);
  const [moving, setMoving] = useState(false);
  const [transition, setTransition] = useState<{
    seatId: string;
    from: number;
    to: number;
    kind: 'snake' | 'ladder';
  } | null>(null);
  const [transitionPhase, setTransitionPhase] = useState<'from' | 'to'>('from');
  const [settledId, setSettledId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const runIdRef = useRef(0);
  const animatingSeatRef = useRef<string | null>(null);
  const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  const schedule = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      timersRef.current.delete(id);
      fn();
    }, ms);
    timersRef.current.add(id);
  }, []);

  const cancelAll = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current.clear();
    runIdRef.current += 1;
  }, []);

  useEffect(() => () => cancelAll(), [cancelAll]);

  // Keep remote/engine state authoritative when we are not animating a transition.
  useEffect(() => {
    setDisplay((prev) => {
      const next = { ...prev };
      for (const p of state.players) {
        if (transition?.seatId === p.id || animatingSeatRef.current === p.id) continue;
        next[p.id] = p.position;
      }
      return next;
    });
  }, [state.players, transition, moving]);

  useEffect(() => {
    if (!transition) return;
    setTransitionPhase('from');
    const id = requestAnimationFrame(() => setTransitionPhase('to'));
    return () => cancelAnimationFrame(id);
  }, [transition]);

  const showToast = useCallback(
    (msg: string) => {
      setToast(msg);
      schedule(() => setToast((t) => (t === msg ? null : t)), 1400);
    },
    [schedule],
  );

  const wait = useCallback(
    (ms: number, myRun: number) =>
      new Promise<boolean>((resolve) => {
        schedule(() => resolve(runIdRef.current === myRun), ms);
      }),
    [schedule],
  );

  const handleRoll = () => {
    if (disabled || rolling || moving || transition) return;

    const myRun = runIdRef.current;
    const seat = state.players[state.turn];
    const from = seat.position;

    setRolling(true);
    setMoving(true);
    animatingSeatRef.current = seat.id;
    play('dice-roll', 0.5);

    // The board UI chooses the human roll here, then sends that exact value
    // through the shared engine. The visual animation never invents another roll.
    const value = 1 + Math.floor(Math.random() * 6);

    schedule(async () => {
      if (runIdRef.current !== myRun) return;
      setRolling(false);
      play('dice-land', 0.5);

      const resolved = resolveMove(from, value);

      // Always send the roll to the engine, including an overshoot.
      onMove({
        type: 'roll',
        player: seat.id,
        payload: { value },
        ts: Date.now(),
      });

      if (resolved.blocked) {
        showToast('Exact roll needed');
        play('error', 0.4);
        await wait(SETTLE_MS + TURN_HANDOFF_MS, myRun);
        animatingSeatRef.current = null;
        setMoving(false);
        return;
      }

      const target = from + value;
      for (let p = from + 1; p <= target; p += 1) {
        const stillOurs = await wait(HOP_MS, myRun);
        if (!stillOurs) return;
        setDisplay((d) => ({ ...d, [seat.id]: p }));
        play('piece-move', 0.2);
      }

      const t = transitionAt(target);
      if (t && t.to !== target) {
        play(t.kind === 'ladder' ? 'ladder-climb' : 'snake-slide', 0.55);
        setTransition({
          seatId: seat.id,
          from: target,
          to: t.to,
          kind: t.kind,
        });

        const done = await wait(TRANSITION_MS, myRun);
        if (!done) return;

        setDisplay((d) => ({ ...d, [seat.id]: t.to }));
        setTransition(null);
        const settled = await wait(160, myRun);
        if (!settled) return;
      }

      setSettledId(seat.id);
      await wait(SETTLE_MS, myRun);
      setSettledId((s) => (s === seat.id ? null : s));

      await wait(TURN_HANDOFF_MS, myRun);
      animatingSeatRef.current = null;
      setMoving(false);
      if (value === 6) {
        showToast('Roll again!');
        play('point-earn', 0.4);
      }
    }, DICE_ROLL_MS);
  };

  const animatedSeat = moving && animatingSeatRef.current
    ? state.players.find((seat) => seat.id === animatingSeatRef.current)
    : undefined;
  const currentSeat = animatedSeat ?? state.players[state.turn];
  const currentId = currentSeat.id;
  const isMyTurn = !disabled;

  const seatDisplay = (id: string, fallback: number): string | number => {
    const v = display[id] ?? fallback;
    return v === 0 ? '—' : v;
  };

  return (
    <div style={styles.root}>
      <div style={styles.boardWrap}>
        <div style={styles.boardInner}>
          <img
            src={BOARDS['snake-ladder']}
            alt="Snake & Ladder board"
            style={styles.boardImg}
            draggable={false}
          />

          {state.players.map((seat) => {
            const pos = transition?.seatId === seat.id
              ? transition.from
              : display[seat.id] ?? seat.position;
            const targetPos = transition?.seatId === seat.id
              ? transition.to
              : pos;
            const coord = transition?.seatId === seat.id && transitionPhase === 'to'
              ? SQUARE_CENTER(targetPos)
              : SQUARE_CENTER(pos);
            const offset = stackOffset(state.players, seat.id, pos);
            const isActive = seat.id === currentId;
            const isSettling = settledId === seat.id;

            return (
              <div
                key={seat.id}
                style={{
                  ...styles.pawnSlot,
                  left: `${coord.left + offset.x}%`,
                  top: `${coord.top + offset.y}%`,
                  transform: `translate(-50%, -50%) scale(${isSettling ? 1.18 : 1})`,
                  transition: transition?.seatId === seat.id
                    ? `left ${TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1), top ${TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1), transform 220ms cubic-bezier(0.34, 1.56, 0.64, 1)`
                    : `left ${HOP_MS}ms cubic-bezier(0.34, 1.56, 0.64, 1), top ${HOP_MS}ms cubic-bezier(0.34, 1.56, 0.64, 1), transform 220ms cubic-bezier(0.34, 1.56, 0.64, 1)`,
                  zIndex: 10 + (isActive ? 1 : 0),
                }}
              >
                <Pawn
                  color={seat.color}
                  size={40}
                  glowing={isActive && (rolling || isSettling || !!transition)}
                  style={styles.pawn}
                />
              </div>
            );
          })}
        </div>
      </div>

      <div style={styles.controls}>
        <div style={styles.statusBar}>
          {state.players.map((s) => (
            <div
              key={s.id}
              style={{
                ...styles.statusPill,
                ...(s.id === currentId
                  ? {
                      borderColor: s.color,
                      boxShadow: tokens.shadow.glow(s.color),
                    }
                  : {}),
              }}
            >
              <Pawn color={s.color} size={16} />
              <span style={styles.statusName}>{s.name}</span>
              <span style={styles.statusPos}>{seatDisplay(s.id, s.position)}</span>
            </div>
          ))}
        </div>

        <div style={styles.rollRow}>
          <Dice
            value={state.dice}
            rolling={rolling}
            onRoll={isMyTurn ? handleRoll : undefined}
            disabled={disabled || moving || !!transition}
            color={currentSeat.color}
            size={96}
            celebrate={state.dice === 6}
            label={
              rolling
                ? 'Rolling…'
                : moving
                  ? 'Moving…'
                  : transition
                  ? transition.kind === 'ladder' ? 'Climbing!' : 'Sliding!'
                  : state.dice
                    ? `Rolled ${state.dice}`
                    : 'Tap to roll'
            }
          />
        </div>
      </div>

      {toast && (
        <div style={{ ...styles.toast, borderColor: currentSeat.color }}>
          {toast}
        </div>
      )}
    </div>
  );
}

function stackOffset(
  players: { id: string; position: number }[],
  myId: string,
  myPos: number,
): { x: number; y: number } {
  if (myPos <= 0) return { x: 0, y: 0 };
  const sameSquare = players.filter((p) => p.position === myPos);
  if (sameSquare.length <= 1) return { x: 0, y: 0 };
  const seatIndex = sameSquare.findIndex((p) => p.id === myId);
  const angle = (seatIndex / sameSquare.length) * Math.PI * 2 - Math.PI / 2;
  const radius = 2.5;
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
}

const styles: Record<string, CSSProperties> = {
  root: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.space.md,
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
    maxWidth: 'min(98vw, calc((100dvh - 220px) * 10 / 11), 720px)',
    aspectRatio: '10 / 11',
  },
  boardImg: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    display: 'block',
    userSelect: 'none',
    pointerEvents: 'none',
    filter: 'drop-shadow(0 12px 32px rgba(0,0,0,0.6))',
  },
  pawnSlot: {
    position: 'absolute',
    width: '7.4%',
    height: '5.8%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
    willChange: 'left, top, transform',
  },
  pawn: {
    width: '100%',
    height: '100%',
  },
  controls: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.space.md,
    alignItems: 'center',
  },
  statusBar: {
    display: 'flex',
    gap: tokens.space.sm,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  statusPill: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.space.sm,
    padding: `4px 12px`,
    background: tokens.bg.surface,
    border: `1px solid ${tokens.bg.border}`,
    borderRadius: tokens.radius.pill,
    fontSize: tokens.size.xs,
    transition: 'all 240ms cubic-bezier(0.22, 1, 0.36, 1)',
  },
  statusName: {
    color: tokens.text.primary,
    fontWeight: 500,
  },
  statusPos: {
    color: tokens.text.muted,
    fontVariantNumeric: 'tabular-nums',
    minWidth: 22,
    textAlign: 'right',
  },
  rollRow: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.space.md,
  },
  toast: {
    position: 'absolute',
    top: tokens.space.md,
    left: '50%',
    transform: 'translateX(-50%)',
    padding: `${tokens.space.sm}px ${tokens.space.lg}px`,
    background: tokens.bg.overlay,
    border: '1px solid',
    borderRadius: tokens.radius.pill,
    color: tokens.text.primary,
    fontSize: tokens.size.xs,
    fontWeight: 600,
    letterSpacing: 2,
    textTransform: 'uppercase',
    animation: 'hye-pop 220ms cubic-bezier(0.34, 1.56, 0.64, 1)',
    zIndex: 30,
    pointerEvents: 'none',
  },
};
