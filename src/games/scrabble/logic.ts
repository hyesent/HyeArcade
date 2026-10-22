import type {Player,Move} from '../../core/types';
import {getDictionaryWords,isValidWord,isDictionaryReady} from '../../core/dictionary';
export type Tile={id:string;letter:string;value:number;blank?:boolean};
export interface ScrabbleState{board:(Tile|null)[];bag:Tile[];racks:Record<string,Tile[]>;playerIds:string[];turn:number;scores:Record<string,number>;passes:number;started:boolean;log:string[];winner:string|null;}
export type ScrabbleMove={action:'play';tiles:{tileId:string;row:number;col:number}[];word:string}|{action:'pass'}|{action:'exchange';tileIds:string[]};
const N=15,I=(r:number,c:number)=>r*N+c;
const VALUES:Record<string,number>={a:1,b:3,c:3,d:2,e:1,f:4,g:2,h:4,i:1,j:8,k:5,l:1,m:3,n:1,o:1,p:3,q:10,r:1,s:1,t:1,u:1,v:4,w:4,x:8,y:4,z:10};
// Standard Scrabble premium layout. A premium is consumed after the square is first covered.
const premiumAt=(r:number,c:number)=>{
  const tw=new Set(['0,0','0,7','0,14','7,0','7,14','14,0','14,7','14,14']);
  const dw=new Set(['1,1','2,2','3,3','4,4','4,10','3,11','2,12','1,13','10,4','11,3','12,2','13,1','10,10','11,11','12,12','13,13','7,7']);
  const tl=new Set(['1,5','1,9','5,1','5,5','5,9','5,13','9,1','9,5','9,9','9,13','13,5','13,9']);
  const dl=new Set(['0,3','0,11','2,6','2,8','3,0','3,7','3,14','6,2','6,6','6,8','6,12','7,3','7,11','8,2','8,6','8,8','8,12','11,0','11,7','11,14','12,6','12,8','14,3','14,11']);
  const k=`${r},${c}`; return tw.has(k)?'TW':dw.has(k)?'DW':tl.has(k)?'TL':dl.has(k)?'DL':undefined;
};
function bag(){const counts:Record<string,number>={a:9,b:2,c:2,d:4,e:12,f:2,g:3,h:2,i:9,j:1,k:1,l:4,m:2,n:6,o:8,p:2,q:1,r:6,s:4,t:6,u:4,v:2,w:2,x:1,y:2,z:1};const out:Tile[]=[];let id=0;for(const [l,n] of Object.entries(counts))for(let i=0;i<n;i++)out.push({id:`t${id++}`,letter:l,value:VALUES[l]});for(let i=0;i<2;i++)out.push({id:`t${id++}`,letter:'',value:0,blank:true});return out.sort(()=>Math.random()-.5);}
function refill(s:ScrabbleState,p:string){const r=[...(s.racks[p]??[])],b=[...s.bag];while(r.length<7&&b.length)r.push(b.pop()!);return {...s,racks:{...s.racks,[p]:r},bag:b};}
function inBounds(r:number,c:number){return r>=0&&r<15&&c>=0&&c<15;}
function adjacent(b:(Tile|null)[],r:number,c:number){return (r>0&&!!b[I(r-1,c)])||(r<14&&!!b[I(r+1,c)])||(c>0&&!!b[I(r,c-1)])||(c<14&&!!b[I(r,c+1)]);}
function wordCells(b:(Tile|null)[], placed:Map<number,Tile>, r:number,c:number,dr:number,dc:number){
  let sr=r,sc=c; while(inBounds(sr-dr,sc-dc)&&b[I(sr-dr,sc-dc)]){sr-=dr;sc-=dc;}
  const cells:number[]=[]; let rr=sr,cc=sc; while(inBounds(rr,cc)&&(b[I(rr,cc)]||placed.has(I(rr,cc)))){cells.push(I(rr,cc));rr+=dr;cc+=dc;} return cells;
}
function blankAssignments(s:ScrabbleState,m:Extract<ScrabbleMove,{action:'play'}>,ordered:number[]){
  const posByIndex=new Map(ordered.map((x,i)=>[x,i]));
  const rack=new Map((s.racks[s.playerIds[s.turn]]??[]).map(t=>[t.id,t]));
  const assignments=new Map<number,string>();
  for(const pt of m.tiles){const tile=rack.get(pt.tileId);if(tile?.blank){const pos=posByIndex.get(I(pt.row,pt.col));if(pos===undefined)return null;const ch=(m.word[pos]??'').toLowerCase();if(!/^[a-z]$/.test(ch))return null;assignments.set(I(pt.row,pt.col),ch);}}
  return assignments;
}
function extractMain(s:ScrabbleState,m:Extract<ScrabbleMove,{action:'play'}>){
  const rows=new Set(m.tiles.map(t=>t.row)),cols=new Set(m.tiles.map(t=>t.col)); if(rows.size>1&&cols.size>1)return null;
  // With a single newly placed tile, infer the word direction from existing neighbours.
  // This is important when the move completes a vertical word: defaulting to horizontal
  // would reject an otherwise legal play.
  let horizontal:boolean;
  if(m.tiles.length===1){
    const t=m.tiles[0],tile=(s.racks[s.playerIds[s.turn]]??[]).find(x=>x.id===t.tileId);
    const formsWord=(isHorizontal:boolean)=>{
      let sr=t.row,sc=t.col;
      while(inBounds(sr-(isHorizontal?0:1),sc-(isHorizontal?1:0))&&s.board[I(sr-(isHorizontal?0:1),sc-(isHorizontal?1:0))]){sr-=isHorizontal?0:1;sc-=isHorizontal?1:0;}
      const letters:string[]=[];let rr=sr,cc=sc;
      while(inBounds(rr,cc)&&(s.board[I(rr,cc)]||(rr===t.row&&cc===t.col))){
        if(rr===t.row&&cc===t.col)letters.push(tile?.blank?(m.word[letters.length]??'').toLowerCase():(tile?.letter??''));
        else letters.push((s.board[I(rr,cc)]?.letter??'').toLowerCase());
        rr+=isHorizontal?0:1;cc+=isHorizontal?1:0;
      }
      return letters.join('')===m.word.toLowerCase();
    };
    const verticalNeighbour=(t.row>0&&!!s.board[I(t.row-1,t.col)])||(t.row<14&&!!s.board[I(t.row+1,t.col)]);
    const horizontalNeighbour=(t.col>0&&!!s.board[I(t.row,t.col-1)])||(t.col<14&&!!s.board[I(t.row,t.col+1)]);
    horizontal=formsWord(true)?true:formsWord(false)?false:horizontalNeighbour&&!verticalNeighbour?true:verticalNeighbour&&!horizontalNeighbour?false:true;
  } else {
    horizontal=rows.size===1;
  }
  const sorted=[...m.tiles].sort((a,b)=>horizontal?a.col-b.col:a.row-b.row); const fixed=horizontal?sorted[0].row:sorted[0].col; const low=horizontal?sorted[0].col:sorted[0].row,high=horizontal?sorted[sorted.length-1].col:sorted[sorted.length-1].row;
  const placed=new Map(sorted.map(t=>[I(t.row,t.col),t as any]));
  const cells:number[]=[]; for(let pos=low;pos<=high;pos++){const r=horizontal?fixed:pos,c=horizontal?pos:fixed,idx=I(r,c);if(!s.board[idx]&&!placed.has(idx))return null;cells.push(idx);}
  while(cells.length&&((horizontal?cells[0]%15:Math.floor(cells[0]/15))>0)){const first=cells[0],r=Math.floor(first/15),c=first%15;const nr=horizontal?r:c-1,nc=horizontal?c-1:r;const idx=I(nr,nc);if(!s.board[idx])break;cells.unshift(idx);}
  while(cells.length){const last=cells[cells.length-1],r=Math.floor(last/15),c=last%15;const nr=horizontal?r:c+1,nc=horizontal?c+1:r;if(!inBounds(nr,nc)||!s.board[I(nr,nc)])break;cells.push(I(nr,nc));}
  return {horizontal,placed,cells};
}
function wordValid(word:string){return isDictionaryReady() && isValidWord(word);}
function validPlacement(s:ScrabbleState,m:Extract<ScrabbleMove,{action:'play'}>){
  if(!m.tiles.length||!/^[a-z]{2,15}$/i.test(m.word))return false;
  const cells=m.tiles.map(t=>I(t.row,t.col)); if(new Set(cells).size!==cells.length||m.tiles.some(t=>!inBounds(t.row,t.col)||s.board[I(t.row,t.col)]))return false;
  const rack=s.racks[s.playerIds[s.turn]]??[]; const rackById=new Map(rack.map(t=>[t.id,t])); if(m.tiles.some(t=>!rackById.has(t.tileId)))return false;
  const main=extractMain(s,m); if(!main)return false;
  const touches=m.tiles.some(t=>adjacent(s.board,t.row,t.col)); if(s.started?!touches:!main.cells.includes(112))return false;
  const ordered=main.cells; const assignments=blankAssignments(s,m,ordered); if(!assignments)return false;
    const mainWord=ordered.map(idx=>{const pt=main.placed.get(idx);if(pt){const rt=rackById.get(pt.tileId)!;return rt.blank?(assignments.get(idx)??''):rt.letter;}return s.board[idx]?.letter??'';}).join('').toLowerCase(); if(mainWord!==m.word.toLowerCase()||!wordValid(mainWord))return false;
  // Every newly-created perpendicular word must also be valid.
  const charAt=(idx:number)=>{const pt=main.placed.get(idx);if(pt){const rt=rackById.get(pt.tileId)!;return rt.blank?(assignments.get(idx)??''):rt.letter;}return s.board[idx]?.letter??'';};
  for(const t of m.tiles){const dr=main.horizontal?1:0,dc=main.horizontal?0:1;const cross=wordCells(s.board,main.placed,t.row,t.col,dr,dc);if(cross.length>1){const w=cross.map(charAt).join('').toLowerCase();if(!wordValid(w))return false;}}
  return true;
}
function scorePlacement(s:ScrabbleState,m:Extract<ScrabbleMove,{action:'play'}>){
  const main=extractMain(s,m)!;const rack=new Map((s.racks[s.playerIds[s.turn]]??[]).map(t=>[t.id,t]));const valueAt=(idx:number)=>{const pt=main.placed.get(idx);if(!pt)return s.board[idx]?.value??0;const rt=rack.get(pt.tileId)!;const base=rt.blank?0:rt.value;const prem=premiumAt(Math.floor(idx/15),idx%15);return base*(prem==='DL'?2:prem==='TL'?3:1);};
  const wordScore=(cells:number[])=>{let total=0,mult=1;for(const idx of cells){total+=valueAt(idx);if(main.placed.has(idx)){const prem=premiumAt(Math.floor(idx/15),idx%15);if(prem==='DW')mult*=2;if(prem==='TW')mult*=3;}}return total*mult;};
  let total=wordScore(main.cells);for(const t of m.tiles){const cross=wordCells(s.board,main.placed,t.row,t.col,main.horizontal?1:0,main.horizontal?0:1);if(cross.length>1)total+=wordScore(cross);}if(m.tiles.length===7)total+=50;return total;
}
function finishByRack(s:ScrabbleState,p:string){if(s.bag.length>0||s.racks[p].length!==0)return null;const scores={...s.scores};let pTotal=0;for(const id of s.playerIds){const rackValue=(s.racks[id]??[]).reduce((n,t)=>n+(t.blank?0:t.value),0);if(id!==p)scores[id]-=rackValue;pTotal+=rackValue;}scores[p]+=pTotal;return scores;}
function winner(scores:Record<string,number>){return [...Object.keys(scores)].sort((a,b)=>(scores[b]??0)-(scores[a]??0))[0]??null;}
export function scrabbleSetup(players:Player[]):ScrabbleState{const b=bag();const racks:Record<string,Tile[]>={};const s:ScrabbleState={board:Array(225).fill(null),bag:b,racks,playerIds:players.map(p=>p.id),turn:0,scores:Object.fromEntries(players.map(p=>[p.id,0])),passes:0,started:false,log:[],winner:null};for(const p of players)s.racks[p.id]=[];let n=s;for(const p of players)n=refill(n,p.id);return n;}
export function scrabbleCurrent(s:ScrabbleState){return s.playerIds[s.turn];}
export function scrabbleLegalMoves(s:ScrabbleState,p:string):Move<ScrabbleMove>[]{if(p!==scrabbleCurrent(s)||s.winner)return[];const out:Move<ScrabbleMove>[]=[{type:'pass',player:p,payload:{action:'pass'},ts:Date.now()}];if(s.bag.length>=7)out.push({type:'exchange',player:p,payload:{action:'exchange',tileIds:[]},ts:Date.now()});return out;}
export function scrabbleValidate(s:ScrabbleState,m:Move<ScrabbleMove>){if(m.player!==scrabbleCurrent(s)||s.winner)return false;if(m.payload.action==='pass')return true;if(m.payload.action==='exchange')return m.payload.tileIds.length>0&&m.payload.tileIds.length<=7&&new Set(m.payload.tileIds).size===m.payload.tileIds.length&&m.payload.tileIds.every(id=>(s.racks[m.player]??[]).some(t=>t.id===id))&&s.bag.length>=7;return validPlacement({...s,playerIds:s.playerIds},m.payload);}
export function scrabbleApply(s:ScrabbleState,m:Move<ScrabbleMove>):ScrabbleState{const p=m.player;if(m.payload.action==='pass'){const n={...s,passes:s.passes+1,turn:(s.turn+1)%s.playerIds.length,log:[...s.log.slice(-7),`${p} passed`]};if(n.passes>=n.playerIds.length*2){const scores={...n.scores};for(const id of n.playerIds)scores[id]-=(n.racks[id]??[]).reduce((a,t)=>a+(t.blank?0:t.value),0);return{...n,scores,winner:winner(scores)};}return n;}if(m.payload.action==='exchange'){const ids=new Set(m.payload.tileIds),r=[...(s.racks[p]??[])],returned=r.filter(t=>ids.has(t.id)),keep=r.filter(t=>!ids.has(t.id));let bag=[...s.bag];const drawn:Tile[]=[];for(let i=0;i<returned.length;i++)drawn.push(bag.pop()!);bag=[...bag,...returned].sort(()=>Math.random()-.5);let n={...s,racks:{...s.racks,[p]:[...keep,...drawn]},bag,turn:(s.turn+1)%s.playerIds.length,passes:s.passes+1,log:[...s.log.slice(-7),`${p} exchanged ${returned.length} tiles`]};n=refill(n,p);if(n.passes>=n.playerIds.length*2){const scores={...n.scores};for(const id of n.playerIds)scores[id]-=(n.racks[id]??[]).reduce((a,t)=>a+(t.blank?0:t.value),0);n={...n,scores,winner:winner(scores)};}return n;}
  const used=new Set(m.payload.tiles.map(t=>t.tileId)),rack=(s.racks[p]??[]).filter(t=>!used.has(t.id)),board=[...s.board];for(const t of m.payload.tiles){const tile=(s.racks[p]??[]).find(x=>x.id===t.tileId)!;const main=extractMain(s,m.payload)!;const pos=main.cells.indexOf(I(t.row,t.col));board[I(t.row,t.col)]={...tile,letter:tile.blank?(m.payload.word[pos]??'').toLowerCase():tile.letter};}
  const score=scorePlacement(s,m.payload);const scores={...s.scores,[p]:(s.scores[p]??0)+score};let n:ScrabbleState={...s,board,racks:{...s.racks,[p]:rack},scores,turn:(s.turn+1)%s.playerIds.length,passes:0,started:true,log:[...s.log.slice(-7),`${p} played ${m.payload.word} for ${score}`]};const final=finishByRack(n,p);if(final)n={...n,scores:final,winner:winner(final)};else n=refill(n,p);return n;}
export function scrabbleOver(s:ScrabbleState){return s.winner?{winner:s.winner,reason:'Scrabble game finished',scores:s.scores}:null;}
function countLetters(word:string):Map<string,number>{const counts=new Map<string,number>();for(const letter of word)counts.set(letter,(counts.get(letter)??0)+1);return counts;}

export function scrabbleBot(s:ScrabbleState,p:string):Move<ScrabbleMove>{
  if(p!==scrabbleCurrent(s)||s.winner)return {type:'pass',player:p,payload:{action:'pass'},ts:Date.now()};
  const rack=s.racks[p]??[];
  const available=new Map<string,number>();
  for(const tile of rack)if(!tile.blank)available.set(tile.letter.toLowerCase(),(available.get(tile.letter.toLowerCase())??0)+1);
  const blankCount=rack.filter(t=>t.blank).length, boardLetters=new Map<string,number>();
  for(const tile of s.board)if(tile)boardLetters.set(tile.letter.toLowerCase(),(boardLetters.get(tile.letter.toLowerCase())??0)+1);
  let maxLineOccupied=0;
  for(let line=0;line<15;line++){let rowCount=0,colCount=0;for(let pos=0;pos<15;pos++){if(s.board[I(line,pos)])rowCount++;if(s.board[I(pos,line)])colCount++;}maxLineOccupied=Math.max(maxLineOccupied,rowCount,colCount);}
  // Prune words that cannot possibly be assembled from this rack plus any board letters.
  // This keeps the offline bot responsive even with the full bundled vocabulary.
  const words=getDictionaryWords().filter(w=>{
    if(w.length<2||w.length>Math.min(10,rack.length+maxLineOccupied)||w.length>rack.length+maxLineOccupied)return false;
    let blanks=blankCount;
    for(const [letter,count] of countLetters(w)){
      const capacity=(available.get(letter)??0)+(boardLetters.get(letter)??0);
      if(count>capacity){blanks-=count-capacity;if(blanks<0)return false;}
    }
    return true;
  }).sort((a,b)=>b.length-a.length).slice(0,5000);
  let best:{move:ScrabbleMove;score:number}|null=null;
  // Enumerate word starts and orientations. Existing letters must match; every empty cell consumes a rack tile.
  for(const word of words){
    for(const horizontal of [true,false]){
      for(let row=0;row<15;row++)for(let col=0;col<15;col++){
        const endRow=row+(horizontal?0:word.length-1),endCol=col+(horizontal?word.length-1:0);
        if(endRow>=15||endCol>=15)continue;
        if(!s.started && (horizontal ? (row!==7||col>7||col+word.length<=7) : (col!==7||row>7||row+word.length<=7)))continue;
        const tiles:{tileId:string;row:number;col:number}[]=[],used=new Set<string>();let possible=true;
        for(let k=0;k<word.length;k++){
          const r=row+(horizontal?0:k),c=col+(horizontal?k:0),existing=s.board[I(r,c)];
          if(existing){if(existing.letter.toLowerCase()!==word[k]){possible=false;break;}continue;}
          const tile=rack.find(t=>!used.has(t.id)&&!t.blank&&t.letter.toLowerCase()===word[k])
            ??rack.find(t=>!used.has(t.id)&&t.blank);
          if(!tile){possible=false;break;} used.add(tile.id);tiles.push({tileId:tile.id,row:r,col:c});
        }
        if(!possible||!tiles.length)continue;
        if(s.started&&!tiles.some(t=>adjacent(s.board,t.row,t.col)))continue;
        const move:ScrabbleMove={action:'play',tiles,word};
        const wrapped:Move<ScrabbleMove>={type:'play',player:p,payload:move,ts:Date.now()};
        if(!scrabbleValidate(s,wrapped))continue;
        const score=scorePlacement(s,move);
        if(!best||score>best.score)best={move,score};
      }
    }
  }
  return best?{type:'play',player:p,payload:best.move,ts:Date.now()}:{type:'pass',player:p,payload:{action:'pass'},ts:Date.now()};
}
