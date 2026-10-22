export type MDColor = 'brown'|'lightBlue'|'pink'|'orange'|'red'|'yellow'|'green'|'darkBlue'|'railroad'|'utility';
export type MDCardKind = 'property'|'wild'|'money'|'action'|'rent';
export type MDAction = 'dealBreaker'|'forcedDeal'|'slyDeal'|'justSayNo'|'debtCollector'|'birthday'|'doubleRent'|'house'|'hotel'|'passGo';
export type MDCard = { id:string; kind:MDCardKind; name:string; value:number; colors?:MDColor[]; wild?:boolean; action?:MDAction; rent?:number; };
export type MDPending = { type:'rent'|'birthday'|'debt'|'sly'|'forced'|'dealBreaker'; sourcePlayer:string; targetPlayer:string; amount:number; cardId:string; color?:MDColor; doubled?:boolean };
export interface MonopolyDealState {
 playerIds:string[]; turn:number; hands:Record<string,string[]>; bank:Record<string,string[]>; properties:Record<string,string[]>; deck:string[]; discard:string[]; cards:Record<string,MDCard>;
 playsLeft:number; hasDrawn:boolean; pending:MDPending|null; pendingResponse:string|null; pendingQueue: MDPending[]; houses:Record<string,number>; hotels:Record<string,number>; doubleRent:Record<string,number>; log:string[]; won:string|null; wildColors:Record<string,MDColor>;
}
export type MonopolyDealMove =
 | {action:'playMoney';cardId:string}|{action:'playProperty';cardId:string;color?:MDColor}|{action:'moveWild';cardId:string;color:MDColor}
 | {action:'playAction';cardId:string;target?:string;targetCardId?:string;color?:MDColor}|{action:'pay';cardIds:string[]}
 | {action:'respond';accept:boolean;cardId?:string;cardIds?:string[]}|{action:'endTurn'}|{action:'discard';cardIds:string[]}|{action:'draw'};
