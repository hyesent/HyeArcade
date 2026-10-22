export type Ship={name:string;length:number;cells:number[]};
export type BSState={playerIds:string[];turn:number;ships:Ship[][];shots:number[][];hits:number[][];last:number|null;log:string[]};
