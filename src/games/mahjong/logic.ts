import type {Player,Move} from '../../core/types';

/** HyeArcade Mahjong ruleset: Chinese / Official International Rules (MCR core). */
export type MahjongTile={id:string;kind:string};
export interface MahjongState{
  wall:MahjongTile[]; deadWall:MahjongTile[];
  hands:Record<string,MahjongTile[]>; discards:Record<string,MahjongTile[]>;
  melds:Record<string,MahjongTile[][]>; flowers:Record<string,MahjongTile[]>;
  playerIds:string[]; turn:number; dealer:number; round:number;
  lastDiscard:MahjongTile|null; phase:'draw'|'discard'|'claim'; claimFrom:number|null;
  claimResponses:number; winner:string|null; winnerBy:'discard'|'self-draw'|null;
  scores:Record<string,number>; handScore:number; handNumber:number; prevailingWind:number; log:string[];
}
export type MahjongMove={action:'draw'}|{action:'discard';tileId:string}|{action:'chi';tileIds:string[]}|{action:'pon';tileIds:string[]}|{action:'kong';tileIds:string[]}|{action:'win'}|{action:'passClaim'}|{action:'nextHand'};

const suits=['m','p','s'];
const kinds=[...suits.flatMap(s=>Array.from({length:9},(_,i)=>`${s}${i+1}`)),...Array.from({length:4},(_,i)=>`w${i+1}`),...Array.from({length:3},(_,i)=>`d${i+1}`),...Array.from({length:8},(_,i)=>`f${i+1}`)];
const WIND=['w1','w2','w3','w4'];
const DRAGONS=['d1','d2','d3'];
const FLOWERS=Array.from({length:8},(_,i)=>`f${i+1}`);

function deck(){const a:MahjongTile[]=[];let id=0;for(const k of kinds){const copies=FLOWERS.includes(k)?1:4;for(let i=0;i<copies;i++)a.push({id:`mj${id++}`,kind:k});}return a.sort(()=>Math.random()-.5);}
function counts(hand:MahjongTile[]){const c:Record<string,number>={};for(const t of hand)c[t.kind]=(c[t.kind]??0)+1;return c;}
function isFlower(k:string){return k[0]==='f';}
function isHonor(k:string){return k[0]==='w'||k[0]==='d';}
function isSuit(k:string){return suits.includes(k[0]);}
function meldable(c:Record<string,number>,remaining:number):boolean{if(remaining===0)return true;const k=Object.keys(c).find(x=>(c[x]??0)>0);if(!k)return true;if((c[k]??0)>=3){c[k]-=3;if(meldable(c,remaining-3))return true;c[k]+=3;}const suit=k[0],n=Number(k.slice(1));if(isSuit(k)&&n<=7&&(c[`${suit}${n+1}`]??0)>0&&(c[`${suit}${n+2}`]??0)>0){c[k]--;c[`${suit}${n+1}`]--;c[`${suit}${n+2}`]--;if(meldable(c,remaining-3))return true;c[k]++;c[`${suit}${n+1}`]++;c[`${suit}${n+2}`]++;}return false;}
function standardWin(hand:MahjongTile[],openMelds=0){const needed=14-openMelds*3;if(hand.length!==needed)return false;const base=counts(hand);for(const k of Object.keys(base))if(base[k]>=2){const c={...base};c[k]-=2;if(meldable(c,needed-2))return true;}return false;}
function nextIndex(s:MahjongState){return (s.claimFrom!+1)%s.playerIds.length;}
function canPon(hand:MahjongTile[],tile:MahjongTile){return (counts(hand)[tile.kind]??0)>=2;}
function claimIdsForChi(hand:MahjongTile[],tile:MahjongTile){if(!isSuit(tile.kind))return null;const suit=tile.kind[0],n=Number(tile.kind.slice(1)),byKind=counts(hand);const sets=[[n-2,n-1],[n-1,n+1],[n+1,n+2]];for(const pair of sets){if(pair.every(x=>x>=1&&x<=9&&(byKind[`${suit}${x}`]??0)>0)){const ids:string[]=[];for(const x of pair){const t=hand.find(t=>t.kind===`${suit}${x}`&&!ids.includes(t.id));if(!t)break;ids.push(t.id);}if(ids.length===2)return ids;}}return null;}
function specialWinningStructure(all:MahjongTile[],melds:MahjongTile[][]){
  const c=counts(all);
  const orphanKinds=['m1','m9','p1','p9','s1','s9','w1','w2','w3','w4','d1','d2','d3'];
  const sevenPairs=melds.length===0&&all.length===14&&Object.values(c).filter(v=>v===2).length===7&&Object.values(c).every(v=>v===2);
  const thirteenOrphans=melds.length===0&&all.length===14&&orphanKinds.every(k=>(c[k]??0)>=1)&&Object.keys(c).every(k=>orphanKinds.includes(k))&&orphanKinds.filter(k=>(c[k]??0)>=2).length===1;
  const suitSet=new Set(all.filter(t=>isSuit(t.kind)).map(t=>t.kind[0]));
  const honors=all.filter(t=>isHonor(t.kind));
  const nineGates=melds.length===0&&all.length===14&&suitSet.size===1&&honors.length===0&&(()=>{
    const su=[...suitSet][0];
    return [1,9].every(n=>(c[`${su}${n}`]??0)>=3)&&[2,3,4,5,6,7,8].every(n=>(c[`${su}${n}`]??0)>=1)&&Object.values(c).reduce((a,b)=>a+b,0)===14;
  })();
  return {sevenPairs,thirteenOrphans,nineGates};
}

function basicScore(s:MahjongState,p:string,bySelfDraw:boolean,winningTile?:MahjongTile){
  const melds=s.melds[p]??[]; const flowers=s.flowers[p]??[];
  const concealed=s.hands[p]??[];
  const all=[...concealed,...melds.flat(),...(winningTile?[winningTile]:[])].filter(t=>!isFlower(t.kind));
  const sets=melds.filter(m=>m.length>=3);
  const c=counts(all); let points=0; let named=0;
  const add=(v:number)=>{points+=v;named+=v;};
  const suitTiles=all.filter(t=>isSuit(t.kind)); const suitSet=new Set(suitTiles.map(t=>t.kind[0]));
  const honors=all.filter(t=>isHonor(t.kind));
  const allSimple=all.length>0&&all.every(t=>isSuit(t.kind)&&Number(t.kind.slice(1))>=2&&Number(t.kind.slice(1))<=8);
  const allHonors=all.length>0&&all.every(t=>isHonor(t.kind));
  const allTerminals=all.length>0&&all.every(t=>isSuit(t.kind)&&['1','9'].includes(t.kind.slice(1)));
  const noHonors=honors.length===0;
  const fullFlush=suitSet.size===1&&honors.length===0;
  const halfFlush=suitSet.size===1&&honors.length>0;
  const allTypes=new Set(all.map(t=>isHonor(t.kind)?'h':t.kind[0]));
  const allTypesPattern=allTypes.size===4;
  const pungSets=sets.filter(m=>m.length>=3&&new Set(m.map(t=>t.kind)).size===1);
  const chowSets=sets.filter(m=>m.length===3&&new Set(m.map(t=>t.kind)).size===3&&isSuit(m[0].kind));
  const kongSets=sets.filter(m=>m.length===4&&new Set(m.map(t=>t.kind)).size===1);
  const allPungs=sets.length===4&&pungSets.length===4;
  const allChows=sets.length===4&&chowSets.length===4;
  const specials=specialWinningStructure(all,melds);
  const sevenPairs=specials.sevenPairs;
  const dragonPungs=pungSets.filter(m=>DRAGONS.includes(m[0].kind)).length;
  const windPungs=pungSets.filter(m=>WIND.includes(m[0].kind)).length;
  const terminalHonorPungs=pungSets.filter(m=>isHonor(m[0].kind)||['1','9'].includes(m[0].kind.slice(1))).length;
  const concealedPungs=pungSets.filter(m=>m.every(t=>concealed.some(x=>x.id===t.id))).length;
  const concealedHand=melds.length===0;
  const allFives=all.length>0&&all.every(t=>isSuit(t.kind)&&[2,3,4,5,6,7,8].includes(Number(t.kind.slice(1))))&&all.some(t=>t.kind.endsWith('5'));
  const middleOnly=all.length>0&&all.every(t=>isSuit(t.kind)&&Number(t.kind.slice(1))>=4&&Number(t.kind.slice(1))<=6);
  const upperOnly=all.length>0&&all.every(t=>isSuit(t.kind)&&Number(t.kind.slice(1))>=7);
  const lowerOnly=all.length>0&&all.every(t=>isSuit(t.kind)&&Number(t.kind.slice(1))<=3);
  const chowStarts=chowSets.map(m=>Math.min(...m.filter(t=>isSuit(t.kind)).map(t=>Number(t.kind.slice(1)) )));
  const pureStraight=suitSet.size===1&&[1,4,7].every(n=>chowStarts.includes(n));
  const pureTripleChow=suitSet.size===1&&[1,2,3,4,5,6,7].some(n=>chowSets.filter(m=>m[0]?.kind[0]===[...suitSet][0]&&chowStarts[chowSets.indexOf(m)]===n).length>=3);
  const mixedStraight=[1,4,7].every(start=>chowSets.some(m=>m[0]?.kind[0] && chowStarts[chowSets.indexOf(m)]===start)) && suitSet.size>=2;
  const allEven=all.length>0&&all.every(t=>isSuit(t.kind)&&[2,4,6,8].includes(Number(t.kind.slice(1))));
  const allGreen=all.length>0&&all.every(t=>['s2','s3','s4','s6','s8','d2'].includes(t.kind));
  const nineGates=specials.nineGates;
  const thirteenOrphans=specials.thirteenOrphans;
  const allGreenLike=allGreen;

  // Basic MCR scoring. These are additive; special hands are evaluated below.
  if(allChows)add(2);                 // Four Chows
  if(allPungs)add(6);                 // Four Pungs/Kongs
  if(dragonPungs>=1)add(2*dragonPungs); // Dragon Pung/Kong, 2 each
  const prevalent=`w${(s.prevailingWind%4)+1}`;
  const seat=`w${(s.playerIds.indexOf(p)-s.dealer+4)%4+1}`;
  if(pungSets.some(m=>m[0]?.kind===prevalent))add(2);
  if(pungSets.some(m=>m[0]?.kind===seat))add(2);
  // Flowers are bonus points only; they never count toward the 8-point win minimum.
  points += flowers.length;
  if(bySelfDraw)add(1);

  // 1-point patterns
  if(noHonors)add(1);
  if(terminalHonorPungs)add(terminalHonorPungs);
  if(chowSets.some(m=>{const ns=m.filter(t=>isSuit(t.kind)).map(t=>Number(t.kind.slice(1))).sort((a,b)=>a-b);return ns[0]===1&&ns[1]===2&&ns[2]===3;}))add(1);
  if(chowSets.some(m=>{const ns=m.filter(t=>isSuit(t.kind)).map(t=>Number(t.kind.slice(1))).sort((a,b)=>a-b);return ns[0]===7&&ns[1]===8&&ns[2]===9;}))add(1);
  if(kongSets.some(m=>m.every(t=>t.id.startsWith('mj'))))add(1);

  // 2-point patterns
  if(concealedHand)add(2);
  if(sevenPairs)add(24);
  if(allSimple)add(2);
  const tileHog=Object.values(c).some(v=>v===4)&&!kongSets.some(m=>m[0]&&c[m[0].kind]===4); if(tileHog)add(2);
  
  // 4/6/8/12/16/24/32/48/64/88 patterns represented by robust whole-hand tests.
  if(halfFlush)add(6);
  if(allTypesPattern)add(6);
  if(pureStraight)add(16);
  if(mixedStraight)add(8);
  if(allFives)add(16);
  if(allEven)add(24);
  if(fullFlush)add(24);
  if(pureTripleChow)add(24);
  if(middleOnly)add(24);
  if(upperOnly)add(24);
  if(lowerOnly)add(24);
  if(allTerminals)add(64);
  if(allHonors)add(64);
  if(allGreenLike)add(88);
  if(nineGates)add(88);
  if(thirteenOrphans)add(88);
  // MCR exclusion families: limit duplicate credit from patterns subsumed by a limit hand.
  if(allTerminals||allHonors||nineGates||thirteenOrphans||allGreenLike){
    points -= (allSimple?2:0) + (fullFlush?24:0) + (halfFlush?6:0) + (noHonors?1:0);
  }
  if(dragonPungs===3)add(8);           // Big Three Dragons
  if(windPungs===3)add(12);            // Big Three Winds
  if(windPungs===4)add(88);            // Big Four Winds
  if(kongSets.length===2)add(4);
  if(kongSets.length===3)add(32);
  if(kongSets.length===4)add(88);
  if(concealedPungs>=2)add(concealedPungs>=4?64:concealedPungs>=3?16:2);
  if(concealedPungs>=4)add(64);

  // Special hands that do not fit the standard 4-meld decomposition.
  // Special hands are already included above.

  // Flowers are bonus points only. A zero-pattern hand (Chicken Hand) is not a legal MCR win.
  return {points,named};
}
function isWinningHand(s:MahjongState,p:string,tiles:MahjongTile[]){
  const melds=s.melds[p]??[];
  return standardWin(tiles,melds.length)||specialWinningStructure(tiles,melds).sevenPairs||specialWinningStructure(tiles,melds).thirteenOrphans||specialWinningStructure(tiles,melds).nineGates;
}
function canWinByScore(s:MahjongState,p:string,bySelfDraw:boolean,winningTile?:MahjongTile){
  const r=basicScore(s,p,bySelfDraw,winningTile);
  return r.named>=8;
}
function drawReplacement(s:MahjongState):{wall:MahjongTile[];deadWall:MahjongTile[];tile:MahjongTile|null}{const dead=[...s.deadWall];const tile=dead.pop()??null;const wall=[...s.wall];const shift=wall.pop();if(shift)dead.unshift(shift);return{wall,deadWall:dead,tile};}
function nextAfterClaim(s:MahjongState,p:string){return s.playerIds.indexOf(p);}

function replaceInitialFlowers(wall:MahjongTile[],deadWall:MahjongTile[],hand:MahjongTile[]){
  const h=[...hand], flowers:MahjongTile[]=[]; let live=[...wall], dead=[...deadWall];
  for(let i=h.length-1;i>=0;i--)if(isFlower(h[i].kind)){flowers.push(h[i]);h.splice(i,1);const r=drawReplacement({wall:live,deadWall:dead} as MahjongState);live=r.wall;dead=r.deadWall;if(r.tile)h.push(r.tile);}
  return {hand:h,flowers,wall:live,deadWall:dead};
}
export function mahjongSetup(players:Player[]):MahjongState{
  let w=deck();const deadWall=w.splice(w.length-14,14);const hands:Record<string,MahjongTile[]>={},discards:Record<string,MahjongTile[]>={},melds:Record<string,MahjongTile[][]>={},flowers:Record<string,MahjongTile[]>={},scores:Record<string,number>={};
  for(const p of players){let dealt=w.splice(0,13);const r=replaceInitialFlowers(w,deadWall,dealt);w=r.wall;hands[p.id]=r.hand;flowers[p.id]=r.flowers;discards[p.id]=[];melds[p.id]=[];scores[p.id]=0;}
  return{wall:w,deadWall,hands,discards,melds,flowers,playerIds:players.map(p=>p.id),turn:0,dealer:0,round:0,lastDiscard:null,phase:'draw',claimFrom:null,claimResponses:0,winner:null,winnerBy:null,scores,handScore:0,handNumber:1,prevailingWind:0,log:['MCR core rules • 144-tile set • 14-tile dead wall • 16-hand session']};
}
export function mahjongCurrent(s:MahjongState){return s.playerIds[s.turn];}

export function mahjongLegalMoves(s:MahjongState,p:string):Move<MahjongMove>[] {
  if(s.winner){return p===mahjongCurrent(s)&&s.handNumber<16?[{type:'nextHand',player:p,payload:{action:'nextHand'},ts:Date.now()}]:[];}
  if(s.phase==='claim'){
    if(!s.lastDiscard||p!==s.playerIds[s.turn])return[];
    const hand=s.hands[p]??[],out:Move<MahjongMove>[]=[{type:'passClaim',player:p,payload:{action:'passClaim'},ts:Date.now()}];
    if(isWinningHand(s,p,[...hand,s.lastDiscard]) && canWinByScore(s,p,false,s.lastDiscard))out.push({type:'win',player:p,payload:{action:'win'},ts:Date.now()});
    if(canPon(hand,s.lastDiscard))out.push({type:'pon',player:p,payload:{action:'pon',tileIds:hand.filter(t=>t.kind===s.lastDiscard!.kind).slice(0,2).map(t=>t.id)},ts:Date.now()});
    if(hand.filter(t=>t.kind===s.lastDiscard!.kind).length>=3)out.push({type:'kong',player:p,payload:{action:'kong',tileIds:hand.filter(t=>t.kind===s.lastDiscard!.kind).slice(0,3).map(t=>t.id)},ts:Date.now()});
    if(s.turn===((s.claimFrom!+1)%s.playerIds.length)){const ids=claimIdsForChi(hand,s.lastDiscard);if(ids)out.push({type:'chi',player:p,payload:{action:'chi',tileIds:ids},ts:Date.now()});}
    return out;
  }
  if(p!==mahjongCurrent(s))return[];
  const hand=s.hands[p]??[];
  if(s.phase==='draw')return s.wall.length?[{type:'draw',player:p,payload:{action:'draw'},ts:Date.now()}]:[];
  const out:Move<MahjongMove>[] = hand.map(t=>({type:'discard',player:p,payload:{action:'discard',tileId:t.id},ts:Date.now()}));
  if(isWinningHand(s,p,hand) && canWinByScore(s,p,true))out.push({type:'win',player:p,payload:{action:'win'},ts:Date.now()});
  const c=counts(hand);
  for(const k of Object.keys(c))if(c[k]>=4)out.push({type:'kong',player:p,payload:{action:'kong',tileIds:hand.filter(t=>t.kind===k).slice(0,4).map(t=>t.id)},ts:Date.now()});
  // Added Kong: extend an existing melded Pung with the fourth matching tile.
  for(const meld of s.melds[p]??[]){
    if(meld.length===3&&new Set(meld.map(t=>t.kind)).size===1){
      const extra=hand.find(t=>t.kind===meld[0].kind);
      if(extra)out.push({type:'kong',player:p,payload:{action:'kong',tileIds:[extra.id]},ts:Date.now()});
    }
  }
  return out;
}
export function mahjongValidate(s:MahjongState,m:Move<MahjongMove>){return mahjongLegalMoves(s,m.player).some(x=>JSON.stringify(x.payload)===JSON.stringify(m.payload));}

function higherPriorityClaimExists(s:MahjongState,p:string,action:'pon'|'kong'|'chi'){
  if(s.phase!=='claim'||!s.lastDiscard)return false;
  const tile=s.lastDiscard;
  for(const id of s.playerIds){
    if(id===p||id===s.playerIds[s.claimFrom??0])continue;
    const hand=s.hands[id]??[];
    if((action==='pon'||action==='kong')&&isWinningHand(s,id,[...hand,tile]))return true;
    if(action==='chi'&&(canPon(hand,tile)||hand.filter(t=>t.kind===tile.kind).length>=3))return true;
  }
  return false;
}

export function mahjongApply(s:MahjongState,m:Move<MahjongMove>):MahjongState{
  const p=m.player;
  if(m.payload.action==='nextHand'){
    if(!s.winner||p!==mahjongCurrent(s)||s.handNumber>=16)return s;
    let w=deck();const deadWall=w.splice(w.length-14,14);const hands:Record<string,MahjongTile[]>={},discards:Record<string,MahjongTile[]>={},melds:Record<string,MahjongTile[][]>={},flowers:Record<string,MahjongTile[]>={};
    for(const id of s.playerIds){let dealt=w.splice(0,13);const r=replaceInitialFlowers(w,deadWall,dealt);w=r.wall;hands[id]=r.hand;flowers[id]=r.flowers;discards[id]=[];melds[id]=[];}
    const dealer=(s.dealer+1)%s.playerIds.length; const next={...s,wall:w,deadWall,hands,discards,melds,flowers,dealer,turn:dealer,round:Math.floor(s.handNumber/4),lastDiscard:null,phase:'draw' as const,claimFrom:null,claimResponses:0,winner:null,winnerBy:null,handScore:0,handNumber:s.handNumber+1,prevailingWind:Math.floor(s.handNumber/4),log:[...s.log.slice(-7),`Hand ${s.handNumber} complete • next dealer ${s.playerIds[dealer]}`]};
    return next;
  }
  if(m.payload.action==='draw'){
    if(p!==mahjongCurrent(s)||s.phase!=='draw'||!s.wall.length)return s;
    let n={...s,wall:[...s.wall],deadWall:[...s.deadWall],hands:{...s.hands,[p]:[...(s.hands[p]??[])]},flowers:{...s.flowers,[p]:[...(s.flowers[p]??[])]}};
    let tile:MahjongTile|null=null;
    while(n.wall.length){tile=n.wall.pop()!;if(isFlower(tile.kind)){n.flowers[p]=[...n.flowers[p],tile];const r=drawReplacement(n);n.wall=r.wall;n.deadWall=r.deadWall;if(!r.tile){tile=null;break;}tile=r.tile;}else break;}
    if(!tile)return{...n,phase:'draw'};
    n.hands[p]=[...n.hands[p],tile];
    return{...n,phase:'discard',log:[...n.log.slice(-7),`${p} drew${isFlower(tile.kind)?' replacement':''}`]};
  }
  if(m.payload.action==='win'){
    if(!mahjongLegalMoves(s,p).some(x=>x.payload.action==='win'))return s;
    const bySelfDraw=s.phase==='discard';const winningTile=bySelfDraw?undefined:s.lastDiscard??undefined;const pts=basicScore(s,p,bySelfDraw,winningTile).points;const scores={...s.scores};
    // MCR: discard win takes 8 from each opponent plus the hand points from the discarder; self-draw takes 8 + hand points from each opponent.
    const handValue=pts; const discarder=s.claimFrom===null?null:s.playerIds[s.claimFrom];
    for(const id of s.playerIds)if(id!==p)scores[id]-=(bySelfDraw?8+handValue:(id===discarder?8+handValue:8));
    scores[p]+=(bySelfDraw?3*(8+handValue):(3*8+handValue));
    return{...s,winner:p,winnerBy:bySelfDraw?'self-draw':'discard',scores,handScore:pts,log:[...s.log.slice(-7),`${p} declared Mahjong for ${pts} hand points` ]};
  }
  if(m.payload.action==='passClaim'){
    if(s.phase!=='claim'||s.claimFrom===null||p!==s.playerIds[s.turn])return s;
    if(s.claimResponses<s.playerIds.length-2)return{...s,turn:(s.turn+1)%s.playerIds.length,claimResponses:s.claimResponses+1,log:[...s.log.slice(-7),`${p} passed claim`]};
    return{...s,turn:nextIndex(s),phase:'draw',claimFrom:null,claimResponses:0,log:[...s.log.slice(-7),`No claim on ${s.lastDiscard?.kind??'discard'}`]};
  }
  if((m.payload.action==='pon'||m.payload.action==='kong'||m.payload.action==='chi')&&s.phase==='claim'&&s.lastDiscard){
    if(p!==s.playerIds[s.turn])return s;
    if((m.payload.action==='pon'||m.payload.action==='kong'||m.payload.action==='chi')&&higherPriorityClaimExists(s,p,m.payload.action))return s;
    const ids=m.payload.tileIds,hand=[...(s.hands[p]??[])];const expected=m.payload.action==='kong'?3:2;
    if(ids.length!==expected||new Set(ids).size!==expected||ids.some(id=>!hand.some(t=>t.id===id)))return s;
    const taken=ids.map(id=>hand.find(t=>t.id===id)!);const tile=s.lastDiscard;
    const valid=m.payload.action==='pon'?taken.every(t=>t.kind===tile.kind):m.payload.action==='kong'?taken.every(t=>t.kind===tile.kind):claimIdsForChi(hand,tile)?.every(id=>ids.includes(id))===true;if(!valid)return s;
    const remaining=hand.filter(t=>!ids.includes(t.id));const meld=[...taken,tile];let wall=[...s.wall],deadWall=[...s.deadWall];
    if(m.payload.action==='kong'){const r=drawReplacement({...s,wall,deadWall});wall=r.wall;deadWall=r.deadWall;if(r.tile)remaining.push(r.tile);}
    return{...s,hands:{...s.hands,[p]:remaining},melds:{...s.melds,[p]:[...(s.melds[p]??[]),meld]},wall,deadWall,lastDiscard:null,phase:'discard',claimFrom:null,claimResponses:0,turn:nextAfterClaim(s,p),log:[...s.log.slice(-7),`${p} claimed ${m.payload.action}${m.payload.action==='kong'?' and drew a replacement':''}`]};
  }
  if(s.phase==='discard'&&p===mahjongCurrent(s)&&m.payload.action==='kong'){
    const ids=m.payload.tileIds,hand=[...(s.hands[p]??[])];
    if(ids.length===1){
      const extra=hand.find(t=>t.id===ids[0]);
      if(!extra)return s;
      const melds=[...(s.melds[p]??[])];
      const idx=melds.findIndex(meld=>meld.length===3&&new Set(meld.map(t=>t.kind)).size===1&&meld[0].kind===extra.kind);
      if(idx<0)return s;
      const remaining=hand.filter(t=>t.id!==extra.id);
      const upgraded=[...melds[idx],extra];
      const nextMelds=[...melds]; nextMelds[idx]=upgraded;
      const r=drawReplacement(s);
      if(!r.tile)return s;
      return{...s,hands:{...s.hands,[p]:[...remaining,r.tile]},melds:{...s.melds,[p]:nextMelds},wall:r.wall,deadWall:r.deadWall,phase:'discard',log:[...s.log.slice(-7),`${p} extended a Pung to a Kong and drew a replacement`]};
    }
    if(ids.length!==4||new Set(ids).size!==4||ids.some(id=>!hand.some(t=>t.id===id)))return s;
    const taken=ids.map(id=>hand.find(t=>t.id===id)!);
    if(!taken.every(t=>t.kind===taken[0].kind))return s;
    const remaining=hand.filter(t=>!ids.includes(t.id));
    const r=drawReplacement(s);
    if(!r.tile)return s;
    return{...s,hands:{...s.hands,[p]:[...remaining,r.tile]},melds:{...s.melds,[p]:[...(s.melds[p]??[]),taken]},wall:r.wall,deadWall:r.deadWall,phase:'discard',log:[...s.log.slice(-7),`${p} declared a concealed Kong and drew a replacement`]};
  }
  if(s.phase!=='discard'||p!==mahjongCurrent(s))return s;
  const discardMove=m.payload as Extract<MahjongMove,{action:'discard'}>;const hand=[...(s.hands[p]??[])],i=hand.findIndex(t=>t.id===discardMove.tileId);if(i<0)return s;const [tile]=hand.splice(i,1);
  return{...s,hands:{...s.hands,[p]:hand},discards:{...s.discards,[p]:[...(s.discards[p]??[]),tile]},lastDiscard:tile,turn:(s.turn+1)%s.playerIds.length,phase:'claim',claimFrom:s.turn,claimResponses:0,log:[...s.log.slice(-7),`${p} discarded ${tile.kind}`]};
}
export function mahjongOver(s:MahjongState){if(s.handNumber>=16&&s.winner)return{winner:Object.entries(s.scores).sort((a,b)=>b[1]-a[1])[0]?.[0]??null,reason:'MCR 16-hand session complete',scores:s.scores};if(s.handNumber>=16&&s.wall.length===0&&s.phase==='draw')return{winner:Object.entries(s.scores).sort((a,b)=>b[1]-a[1])[0]?.[0]??null,reason:'MCR 16-hand session complete after final draw',scores:s.scores};return null;}
export function mahjongBot(s:MahjongState,p:string){const moves=mahjongLegalMoves(s,p);if(!moves.length)return null as never;if(s.phase==='claim'){const win=moves.find(m=>m.payload.action==='win');if(win)return win;const kong=moves.find(m=>m.payload.action==='kong');if(kong)return kong;const pon=moves.find(m=>m.payload.action==='pon');if(pon)return pon;const chi=moves.find(m=>m.payload.action==='chi');if(chi)return chi;return moves.find(m=>m.payload.action==='passClaim')!;}const win=moves.find(m=>m.payload.action==='win');if(win)return win;const kong=moves.find(m=>m.payload.action==='kong');if(kong)return kong;if(s.phase==='draw')return moves[0];const hand=s.hands[p]??[];return moves.find(m=>m.payload.action==='discard'&&m.payload.tileId===hand[hand.length-1]?.id)??moves[0];}
