import type { Cell, CheckersState, CheckersMove } from './types';

export function idx(row: number, col: number, size: number): number { return row * size + col; }
export function rowOf(i: number, size: number): number { return Math.floor(i / size); }
export function colOf(i: number, size: number): number { return i % size; }
export function isDark(i: number, size: number): boolean { return (rowOf(i, size) + colOf(i, size)) % 2 === 1; }
export function colorOf(cell: Cell): 'r' | 'b' | null { return cell ? cell.toLowerCase() as 'r' | 'b' : null; }
export function isKing(cell: Cell): boolean { return cell === 'R' || cell === 'B'; }
const DIAGONALS: [number, number][] = [[-1,-1],[-1,1],[1,-1],[1,1]];
const inside = (r:number,c:number,size:number) => r>=0 && r<size && c>=0 && c<size;
function isInternational(size:number) { return size === 10; }
function isPromotion(cell:Cell,to:number,size:number) { return (cell==='r' && rowOf(to,size)===0) || (cell==='b' && rowOf(to,size)===size-1); }
function promote(cell:Cell,to:number,size:number):Cell { return isPromotion(cell,to,size) ? (cell==='r'?'R':'B') : cell; }

// 8x8 kings move one diagonal square; 10x10 international kings are flying kings.
export function jumpsFor(board: Cell[], i: number, size: number): CheckersMove[] {
  const cell=board[i]; if(!cell) return [];
  const myColor=colorOf(cell)!; const r=rowOf(i,size), c=colOf(i,size); const moves:CheckersMove[]=[];
  if (isInternational(size) && isKing(cell)) {
    for(const [dr,dc] of DIAGONALS){
      let rr=r+dr, cc=c+dc, enemy=-1;
      while(inside(rr,cc,size)){
        const at=idx(rr,cc,size), target=board[at];
        if(!target){ if(enemy!==-1) moves.push({from:i,to:at,captured:enemy}); rr+=dr;cc+=dc;continue; }
        if(colorOf(target)===myColor || enemy!==-1) break;
        enemy=at; rr+=dr;cc+=dc;
      }
    }
    return moves;
  }
  const dirs = isInternational(size) || isKing(cell)
    ? DIAGONALS
    : (cell==='r' ? [[-1,-1],[-1,1]] as [number,number][] : [[1,-1],[1,1]] as [number,number][]);
  for(const [dr,dc] of dirs){
    const mr=r+dr,mc=c+dc,lr=r+2*dr,lc=c+2*dc;
    if(!inside(lr,lc,size)||!inside(mr,mc,size)) continue;
    const mid=idx(mr,mc,size),land=idx(lr,lc,size);
    if(board[mid] && colorOf(board[mid])!==myColor && board[land]===null) moves.push({from:i,to:land,captured:mid});
  }
  return moves;
}

export function simpleMovesFor(board:Cell[],i:number,size:number):CheckersMove[]{
  const cell=board[i]; if(!cell)return[];
  const r=rowOf(i,size),c=colOf(i,size),moves:CheckersMove[]=[];
  if(isInternational(size)&&isKing(cell)){
    for(const [dr,dc] of DIAGONALS){let rr=r+dr,cc=c+dc;while(inside(rr,cc,size)){const to=idx(rr,cc,size);if(board[to]!==null)break;moves.push({from:i,to,captured:null});rr+=dr;cc+=dc;}}
    return moves;
  }
  const dirs=isKing(cell)?DIAGONALS:(cell==='r'?[[-1,-1],[-1,1]]:[[1,-1],[1,1]]) as [number,number][];
  for(const [dr,dc] of dirs){const nr=r+dr,nc=c+dc;if(!inside(nr,nc,size))continue;const to=idx(nr,nc,size);if(board[to]===null)moves.push({from:i,to,captured:null});}
  return moves;
}

export function applyMoveToBoard(board:Cell[],move:CheckersMove,size:number):Cell[]{
  const next=[...board],piece=next[move.from]; if(!piece||move.to<0||move.to>=next.length)return next;
  next[move.from]=null;if(move.captured!==null)next[move.captured]=null;
  next[move.to]=promote(piece,move.to,size);return next;
}

function maxCaptureFrom(board:Cell[],from:number,size:number):number{
  const piece=board[from];if(!piece)return 0;
  let best=0;
  for(const move of jumpsFor(board,from,size)){
    const next=applyMoveToBoard(board,move,size);
    // In international draughts, a man reaching the king row during a capture ends its turn.
    const becameKing=!isKing(piece)&&isKing(next[move.to]);
    const count=1+(isInternational(size)&&becameKing?0:maxCaptureFrom(next,move.to,size));
    if(count>best)best=count;
  }
  return best;
}
function maxCaptureForMove(board:Cell[],move:CheckersMove,size:number):number{
  const piece=board[move.from],next=applyMoveToBoard(board,move,size);
  const becameKing=!!piece&&!isKing(piece)&&isKing(next[move.to]);
  return 1+(isInternational(size)&&becameKing?0:maxCaptureFrom(next,move.to,size));
}

export function legalMovesFor(state:CheckersState,playerIdx:0|1):CheckersMove[]{
  const myColor=playerIdx===0?'r':'b', {board,size}=state;
  if(state.forcedFrom!==null){
    const forced=board[state.forcedFrom];if(!forced||colorOf(forced)!==myColor)return[];
    const jumps=jumpsFor(board,state.forcedFrom,size);
    if(isInternational(size)&&jumps.length){const max=Math.max(...jumps.map(m=>maxCaptureForMove(board,m,size)));return jumps.filter(m=>maxCaptureForMove(board,m,size)===max);}
    return jumps;
  }
  const jumps:CheckersMove[]=[];
  for(let i=0;i<board.length;i++)if(board[i]&&colorOf(board[i])===myColor)jumps.push(...jumpsFor(board,i,size));
  if(jumps.length){
    if(isInternational(size)){const max=Math.max(...jumps.map(m=>maxCaptureForMove(board,m,size)));return jumps.filter(m=>maxCaptureForMove(board,m,size)===max);}
    return jumps;
  }
  const simple:CheckersMove[]=[];
  for(let i=0;i<board.length;i++)if(board[i]&&colorOf(board[i])===myColor)simple.push(...simpleMovesFor(board,i,size));
  return simple;
}
export function hasMoves(state:CheckersState,playerIdx:0|1):boolean{return legalMovesFor(state,playerIdx).length>0;}
export function setupBoard(size:number):Cell[]{const board:Cell[]=Array(size*size).fill(null),rows=size===8?3:4;for(let r=0;r<rows;r++)for(let c=0;c<size;c++)if((r+c)%2===1)board[idx(r,c,size)]='b';for(let r=size-rows;r<size;r++)for(let c=0;c<size;c++)if((r+c)%2===1)board[idx(r,c,size)]='r';return board;}
