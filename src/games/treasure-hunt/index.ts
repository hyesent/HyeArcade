import type { GameDefinition } from '../../core/types';
import type { TreasureHuntState, TreasureMove } from './types';
import { treasureApply, treasureBot, treasureCurrent, treasureLegalMoves, treasureOver, treasureSetup, treasureValidate } from './logic';
export const treasureHunt: GameDefinition<TreasureHuntState,TreasureMove> = {
  id:'treasure-hunt',name:'Treasure Hunt',minPlayers:1,maxPlayers:4,icon:'treasure',color:'#E9B949',tags:['adventure','board','casual'],
  supports:{bots:true,lan:true,passAndPlay:true,solo:true}, setup:treasureSetup,currentPlayer:treasureCurrent,legalMoves:treasureLegalMoves,validate:treasureValidate,apply:treasureApply,isOver:treasureOver,
  bot:(s,p)=>treasureBot(s,p),
  view(state) { const revealed = state.guesses.some(guess => guess.distance === 0) || state.guesses.length >= state.maxGuesses; return { ...state, treasure: revealed ? state.treasure : { row: -1, col: -1 } }; },
};
export type { TreasureHuntState,TreasureMove } from './types';
