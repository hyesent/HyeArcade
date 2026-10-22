export type HeartCard={s:string;r:number};
export type HeartsState={playerIds:string[];turn:number;hands:HeartCard[][];passRound:number;passed:boolean[];passSelections:number[][];trick:{player:number;card:HeartCard}[];heartsBroken:boolean;tricksPlayed:number;points:number[];roundPoints:number[];round:number;gameOver:boolean;log:string[]};
