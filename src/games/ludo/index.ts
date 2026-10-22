import type { GameDefinition, Player } from '../../core/types';
import type {
  LudoState,
  RollMove,
  PickMove,
  SelectMove,
  Pawn,
  Color,
} from './types';
import { COLOR_ORDER, FINISH_STEP, RING_LENGTH, START_STEP } from './types';
import {
  legalPawnIndices,
  nextStep,
  captures,
  hasWon,
} from './logic';
import { pawnCell } from './board-map';
import { ludoRoll, ludoPick, ludoPickScore } from './bot';

const SEAT_COLORS_BY_PLAYER_COUNT: Record<number, Color[]> = {
  2: ['R', 'Y'], // opposite corners
  3: ['R', 'G', 'Y'],
  4: ['R', 'G', 'Y', 'B'],
};

export const ludo: GameDefinition<LudoState, RollMove | PickMove | SelectMove> = {
  id: 'ludo', name: 'Ludo', minPlayers: 2, maxPlayers: 4,
  icon: 'ludo', color: '#FF9A3C', tags: ['board','classic','family'],
  // HyeArcade variant: two dice are used independently; doubles grant another turn.

  supports: { bots:true, lan:true, passAndPlay:true },
  setup(players: Player[]): LudoState {
    const colors = (SEAT_COLORS_BY_PLAYER_COUNT[players.length] ?? COLOR_ORDER).slice(0, players.length);
    const playerIds: Record<string,string> = {};
    colors.forEach((c,i)=>(playerIds[c]=players[i].id));
    const pawns: Pawn[]=[];
    colors.forEach(c=>{ for(let i=0;i<4;i++) pawns.push({id:i,color:c,state:'yard',step:-1}); });
    return {colors,playerIds:playerIds as Record<Color,string>,pawns,turn:0,dice:null,remainingDice:[false,false],selectedDie:null,rolling:false,mustMove:false,lastRoll:null};
  },
  currentPlayer(state){ return state.playerIds[state.colors[state.turn]]; },
  legalMoves(state,player){
    if(state.mustMove && state.dice!==null){
      return legalPawnIndices(state,state.dice).map(i=>({type:'pick' as const,player,payload:{pawnIndex:i,dieIndex:state.selectedDie ?? 0},ts:Date.now()}));
    }
    if(state.lastRoll && state.remainingDice.some(Boolean) && state.dice===null){
      const out: any[]=[];
      state.remainingDice.forEach((available,i)=>{if(available && legalPawnIndices(state,state.lastRoll![i]).length) out.push({type:'select' as const,player,payload:{dieIndex:i},ts:Date.now()});});
      if(out.length)return out;
    }
    if(!state.mustMove && state.dice===null && !state.remainingDice.some(Boolean)) return [{type:'roll' as const,player,payload:{value:7},ts:Date.now()}];
    return [];
  },
  validate(state,move){
    if(move.player!==state.playerIds[state.colors[state.turn]]) return false;
    if(move.type==='roll') {
      const payload = move.payload as RollMove;
      const d1=Number(payload.die1), d2=Number(payload.die2);
      return !state.mustMove && state.dice===null && !state.remainingDice.some(Boolean) && Number.isInteger(d1) && Number.isInteger(d2) && d1>=1 && d1<=6 && d2>=1 && d2<=6 && payload.value===d1+d2;
    }
    if(move.type==='select') {
      const i=(move.payload as SelectMove).dieIndex;
      if (i !== 0 && i !== 1) return false;
      return state.dice===null && state.remainingDice[i]===true && Boolean(state.lastRoll) && legalPawnIndices(state,state.lastRoll![i]).length>0;
    }
    const payload = move.payload as PickMove;
    return state.mustMove && state.dice!==null && legalPawnIndices(state,state.dice).includes(payload.pawnIndex);
  },
  apply(state,move){
    if(move.type==='roll'){
      const d1=Math.max(1,Math.min(6,Math.floor(Number((move.payload as any).die1))));
      const d2=Math.max(1,Math.min(6,Math.floor(Number((move.payload as any).die2))));
      const remainingDice:[boolean,boolean]=[true,true];
      const hasMove=legalPawnIndices(state,d1).length>0 || legalPawnIndices(state,d2).length>0;
      if(!hasMove) return {...state,dice:null,selectedDie:null,remainingDice:[false,false],mustMove:false,lastRoll:[d1,d2] as [number,number],turn:d1===d2?state.turn:(state.turn+1)%state.colors.length};
      return {...state,dice:null,selectedDie:null,remainingDice,mustMove:false,lastRoll:[d1,d2] as [number,number]};
    }
    if(move.type==='select'){
      const dieIndex=(move.payload as SelectMove).dieIndex;
      if(!state.lastRoll || !state.remainingDice[dieIndex] || !legalPawnIndices(state,state.lastRoll[dieIndex]).length)return state;
      return {...state,dice:state.lastRoll[dieIndex],selectedDie:dieIndex,mustMove:true};
    }
    const payload=move.payload as PickMove;
    const idx=payload.pawnIndex; const pawn=state.pawns[idx]; const dice=state.dice;
    if(!pawn || dice===null || state.selectedDie===null)return state;
    const ns=nextStep(pawn,dice); if(ns===null)return state;
    const pawns=state.pawns.map(p=>({...p})); const mover=pawns[idx];
    if(pawn.state==='yard'){mover.state='ring';mover.step=0;}
    else if(ns===FINISH_STEP){mover.state='finished';mover.step=ns;}
    else if(ns>RING_LENGTH-1){mover.state='home-col';mover.step=ns;}
    else mover.step=ns;
    if(mover.state==='ring') for(const v of captures(mover,pawns)){v.state='yard';v.step=-1;}
    const winner=hasWon({...state,pawns},mover.color);
    const remainingDice:[boolean,boolean]=[...state.remainingDice]; remainingDice[state.selectedDie]=false;
    const canUseOther=state.lastRoll ? remainingDice.some((available,i)=>available && legalPawnIndices({...state,pawns,dice:null,mustMove:false,remainingDice,selectedDie:null},state.lastRoll![i]).length>0) : false;
    const doubles = Boolean(state.lastRoll && state.lastRoll[0] === state.lastRoll[1]);
    const keepTurn=winner || canUseOther || doubles;
    return {...state,pawns,dice:null,selectedDie:null,mustMove:false,remainingDice:!winner && canUseOther?remainingDice:[false,false],turn:keepTurn?state.turn:(state.turn+1)%state.colors.length};
  },
  isOver(state) {
    const winnerColor = state.colors.find(color => hasWon(state, color));
    return winnerColor
      ? { winner: state.playerIds[winnerColor], reason: `${winnerColor} has finished all four pawns` }
      : null;
  },
  bot(state,player,difficulty){
    if(state.dice!==null && state.mustMove)return ludoPick(state,player,difficulty);
    if(state.lastRoll && state.remainingDice.some(Boolean)){
      const available = ([0, 1] as const).filter(i => state.remainingDice[i] && legalPawnIndices(state,state.lastRoll![i]).length > 0);
      if(available.length){
        // Choose the die whose best legal pawn move has the highest strategic value.
        const ranked = available.map(dieIndex => ({
          dieIndex,
          score: Math.max(...legalPawnIndices(state, state.lastRoll![dieIndex]).map(pawnIndex =>
            ludoPickScore(state, pawnIndex, state.lastRoll![dieIndex], difficulty))),
        })).sort((a,b) => b.score-a.score);
        const chosen = difficulty === 'easy' ? ranked[Math.floor(Math.random()*ranked.length)] : ranked[0];
        return {type:'select',player,payload:{dieIndex:chosen.dieIndex},ts:Date.now()} as any;
      }
    }
    return ludoRoll(state,player,difficulty);
  },
  path(state,move){
    if(move.type==='roll'||move.type==='select')return null;
    const pawn=state.pawns[(move.payload as PickMove).pawnIndex]; if(!pawn||state.dice===null)return null;
    const ns=nextStep(pawn,state.dice); if(ns===null)return null;
    const startStep=START_STEP[pawn.color]; const steps=[];
    if(pawn.state==='yard'){const c=pawnCell(pawn.color,0,pawn.id,'ring',startStep);steps.push({x:c[1],y:c[0],hop:true});}
    else for(let s=pawn.step+1;s<=ns;s++){const st=s>51?(s===57?'finished':'home-col'):'ring';const c=pawnCell(pawn.color,s,pawn.id,st,startStep);steps.push({x:c[1],y:c[0],hop:true});}
    const fc=pawnCell(pawn.color,pawn.step,pawn.id,pawn.state,startStep);const tc=pawnCell(pawn.color,ns,pawn.id,ns>51?(ns===57?'finished':'home-col'):'ring',startStep);
    return {from:{x:fc[1],y:fc[0]},to:{x:tc[1],y:tc[0]},steps,style:'hop',sound:'piece-move',soundPerStep:true};
  }
};


export { LudoBoard } from './Ludo';
export type { LudoState, RollMove, PickMove, SelectMove };