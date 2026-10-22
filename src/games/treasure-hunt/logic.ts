import type { Player } from '../../core/types';
import type { TreasureHuntState, TreasureMove } from './types';

const SIZE = 8;
const MAX_GUESSES = 40;
function nextTurn(s: TreasureHuntState) { return (s.turn + 1) % s.playerIds.length; }
function distance(a: {row:number;col:number}, b: {row:number;col:number}) { return Math.abs(a.row-b.row) + Math.abs(a.col-b.col); }
function log(s: TreasureHuntState, message: string) { return [...s.log.slice(-9), message]; }

export function treasureSetup(players: Player[]): TreasureHuntState {
  return {
    playerIds: players.map(p=>p.id), turn:0, size:SIZE,
    treasure:{ row:Math.floor(Math.random()*SIZE), col:Math.floor(Math.random()*SIZE) },
    guesses:[], misses:Object.fromEntries(players.map(p=>[p.id,0])),
    bestDistance:Object.fromEntries(players.map(p=>[p.id,Infinity])), maxGuesses:MAX_GUESSES, log:[]
  };
}
export function treasureCurrent(s: TreasureHuntState) { return s.playerIds[s.turn]; }
export function treasureLegalMoves(s: TreasureHuntState, player: string) {
  if (player !== treasureCurrent(s)) return [];
  const out=[];
  for(let row=0;row<s.size;row++) for(let col=0;col<s.size;col++) if(!s.guesses.some(g=>g.row===row&&g.col===col)) out.push({type:'guess',player,payload:{row,col},ts:Date.now()});
  return out;
}
export function treasureValidate(s: TreasureHuntState, move:{player:string;payload:TreasureMove}) {
  const {row,col}=move.payload;
  return move.player===treasureCurrent(s) && Number.isInteger(row)&&Number.isInteger(col)&&row>=0&&row<s.size&&col>=0&&col<s.size&&!s.guesses.some(g=>g.row===row&&g.col===col);
}
export function treasureApply(s: TreasureHuntState, move:{player:string;payload:TreasureMove}):TreasureHuntState {
  const g={...move.payload,distance:distance(move.payload,s.treasure),playerId:move.player};
  const misses={...s.misses,[move.player]:(s.misses[move.player]??0)+(g.distance===0?0:1)};
  const bestDistance={...s.bestDistance,[move.player]:Math.min(s.bestDistance[move.player]??Infinity,g.distance)};
  const guesses=[...s.guesses,g];
  return {...s,guesses,misses,bestDistance,turn:nextTurn(s),log:log(s,`${move.player} searched ${String.fromCharCode(65+g.col)}${g.row+1}${g.distance===0?' — TREASURE!':` — ${g.distance} away`}`)};
}
export function treasureOver(s: TreasureHuntState) {
  const found=s.guesses.find(g=>g.distance===0);
  if(found) return {winner:found.playerId,reason:'Treasure found',scores:Object.fromEntries(s.playerIds.map(p=>[p,Math.max(0,100-s.misses[p]*5)]))};
  if(s.guesses.length>=s.maxGuesses){
    const winner=[...s.playerIds].sort((a,b)=>(s.bestDistance[a]??Infinity)-(s.bestDistance[b]??Infinity))[0]??null;
    return {winner,reason:'Search limit reached',scores:Object.fromEntries(s.playerIds.map(p=>[p,Math.max(0,100-(s.misses[p]??0)*5)]))};
  }
  return null;
}
export function treasureBot(s:TreasureHuntState, player:string) {
  const candidates=[] as {row:number;col:number;score:number}[];
  for(let row=0;row<s.size;row++) for(let col=0;col<s.size;col++) if(!s.guesses.some(g=>g.row===row&&g.col===col)){
    const score=s.guesses.length?Math.min(...s.guesses.map(g=>Math.abs(row-g.row)+Math.abs(col-g.col))):0;
    candidates.push({row,col,score});
  }
  candidates.sort((a,b)=>b.score-a.score);
  const pick=candidates[Math.floor(Math.random()*Math.min(4,candidates.length))]??{row:0,col:0};
  return {type:'guess',player,payload:{row:pick.row,col:pick.col},ts:Date.now()};
}
