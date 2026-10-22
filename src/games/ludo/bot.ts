import type { BotDifficulty, Move, PlayerId } from '../../core/types';
import type { LudoState, RollMove, PickMove, Pawn } from './types';
import { captures, legalPawnIndices, ringPos, isSafe } from './logic';
import { FINISH_STEP } from './types';

export function ludoRoll(
  _state: LudoState, player: PlayerId, _difficulty: BotDifficulty,
): Move<RollMove> {
  const die1 = 1 + Math.floor(Math.random() * 6);
  const die2 = 1 + Math.floor(Math.random() * 6);
  return { type: 'roll', player, payload: { value: die1 + die2, die1, die2, doubles: die1 === die2 }, ts: Date.now() };
}

export function ludoPick(state: LudoState, player: PlayerId, difficulty: BotDifficulty): Move<PickMove> {
  const dice = state.dice ?? 0;
  const options = legalPawnIndices(state, dice).map(pawnIndex => ({pawnIndex, score: ludoPickScore(state,pawnIndex,dice,difficulty)}));
  if (!options.length) return {type:'pick',player,payload:{pawnIndex:-1},ts:Date.now()};
  options.sort((a,b)=>b.score-a.score);
  const pick=difficulty==='easy'?options[Math.floor(Math.random()*options.length)]:options[0];
  return {type:'pick',player,payload:{pawnIndex:pick.pawnIndex},ts:Date.now()};
}

export function ludoPickScore(state: LudoState, pawnIndex: number, dice: number, difficulty: BotDifficulty): number {
  const pawn = state.pawns[pawnIndex];
  if (!pawn) return -Infinity;
  let score=0;
  if(pawn.state==='yard') return dice===6?90:-50;
  const ns=pawn.step+dice;
  if(ns===FINISH_STEP)return 220;
  if(pawn.state==='ring'&&ns>51)score+=100;
  const future:Pawn={...pawn,state:ns>51?'home-col':'ring',step:ns};
  if(future.state==='ring')score+=captures(future,state.pawns).length*120;
  if(future.state==='ring'&&isSafe(future))score+=25;
  score+=ns*2;
  if(difficulty==='hard')score+=state.pawns.filter(p=>p.color===pawn.color&&p.state==='ring'&&future.state==='ring'&&ringPos(p.color,p.step)===ringPos(pawn.color,ns)).length*15;
  return score;
}
