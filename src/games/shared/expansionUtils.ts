import type { Player, Move } from '../../core/types';
export const shuffle = <T,>(a:T[]):T[] => { const x=[...a]; for(let i=x.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[x[i],x[j]]=[x[j],x[i]];} return x; };
export const ids = (p:Player[]) => p.map(x=>x.id);
export const current = (s:{playerIds:string[];turn:number}) => s.playerIds[s.turn % s.playerIds.length];
export const move = (player:string,type:string,payload:any):Move<any> => ({type,player,payload,ts:Date.now()});
