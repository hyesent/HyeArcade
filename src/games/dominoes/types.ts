export type Domino = [number, number];
export type DominoState = { playerIds:string[]; turn:number; hands:Domino[][]; chain:Domino[]; ends:[number|null,number|null]; stock:Domino[]; passes:number; scores:number[]; log:string[] };
