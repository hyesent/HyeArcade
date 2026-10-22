import type { GameDefinition, Move } from '../../core/types';
import type { GridMove } from '../shared/expansionTypes.ts';
import { ids, current, move } from '../shared/expansionUtils.ts';
import type { BGState } from './types.ts';



function rawBGMoves(s:BGState,player:string):Move<GridMove>[] {
  const side=s.turn,opp=1-side,out:Move<GridMove>[]=[];
  s.dice.forEach((die,di)=>{
    if(!die)return;
    if(s.bar[side]===0)for(let from=0;from<24;from++){
      if(s.points[from][side]<=0)continue;
      const to=side===0?from-die:from+die;
      if(to<0||to>23){
        const inHome=s.bar[side]===0&&(side===0?s.points.slice(6,24).every(p=>p[side]===0):s.points.slice(0,18).every(p=>p[side]===0));
        const noFartherChecker=side===0?s.points.slice(from+1,6).every(p=>p[side]===0):s.points.slice(18,from).every(p=>p[side]===0);
        if(inHome&&noFartherChecker)out.push(move(player,'move',{from,to:side===0?-1:24,die,di}));
        continue;
      }
      if(s.points[to][opp]<=1)out.push(move(player,'move',{from,to,die,di}));
    }
    if(s.bar[side]>0){const to=side===0?24-die:die-1;if(to>=0&&to<24&&s.points[to][opp]<=1)out.push(move(player,'move',{from:side===0?24:-1,to,die,di,fromBar:true}));}
  });
  return out;
}
function simulateBGMove(s:BGState,payload:GridMove):BGState {
  const pts=s.points.map(p=>[...p]),bar=[...s.bar],off=[...s.off],side=s.turn,opp=1-side;
  const from=payload.from as number,to=payload.to as number,di=payload.di as number;
  if(payload.fromBar)bar[side]--;else pts[from][side]--;
  if(to<0||to>23)off[side]++;else{if(pts[to][opp]===1){pts[to][opp]=0;bar[opp]++;}pts[to][side]++;}
  const dice=[...s.dice];dice[di]=0;
  return {...s,points:pts,bar,off,dice};
}
function bgMaxMoves(s:BGState,player:string,depth=0,memo=new Map<string,number>()):number {
  if(depth>=4||s.dice.every(d=>!d))return 0;
  const key=`${s.turn}|${s.bar.join(',')}|${s.off.join(',')}|${s.dice.join(',')}|${s.points.map(point=>point.join(',')).join(';')}`;
  const cached=memo.get(key);if(cached!==undefined)return cached;
  const options=rawBGMoves(s,player);if(!options.length){memo.set(key,0);return 0;}
  const best=Math.max(...options.map(candidate=>1+bgMaxMoves(simulateBGMove(s,candidate.payload),player,depth+1,memo)));memo.set(key,best);return best;
}
function bgMoves(s:BGState,player:string):Move<GridMove>[] {
  if(s.doubleOfferedBy!==null)return player===s.playerIds[1-s.doubleOfferedBy]?[move(player,'accept-double',{}),move(player,'drop-double',{})]:[];
  if(current(s)!==player)return[];
  if(!s.rolled){const options=[move(player,'roll',{})];if(s.cube<64&&(s.cubeOwner===null||s.cubeOwner===s.turn))options.push(move(player,'offer-double',{}));return options;}
  const raw=rawBGMoves(s,player);if(!raw.length)return[move(player,'pass',{})];
  const memo=new Map<string,number>();const maximum=bgMaxMoves(s,player,0,memo);let legal=raw.filter(candidate=>1+bgMaxMoves(simulateBGMove(s,candidate.payload),player,1,memo)===maximum);
  const available=s.dice.filter(Boolean),distinct=[...new Set(available)];
  if(maximum===1&&available.length===2&&distinct.length===2){const high=Math.max(...distinct),highMoves=legal.filter(candidate=>candidate.payload.die===high);if(highMoves.length)legal=highMoves;}
  return legal;
}
export const backgammon:GameDefinition<BGState,GridMove>={id:'backgammon',name:'Backgammon',minPlayers:2,maxPlayers:2,icon:'backgammon',color:'#E8A56C',tags:['board','strategy','dice','lan'],supports:{bots:true,lan:true,passAndPlay:true},setup(p){const pts=Array.from({length:24},()=>[0,0]);const set=(i:number,side:number,n:number)=>pts[i][side]=n;set(23,0,2);set(12,0,5);set(7,0,3);set(5,0,5);set(0,1,2);set(11,1,5);set(16,1,3);set(18,1,5);return{playerIds:ids(p),turn:0,points:pts,bar:[0,0],off:[0,0],dice:[],rolled:false,cube:1,cubeOwner:null,doubleOfferedBy:null,cubeDroppedWinner:null,log:['White starts']};},currentPlayer(s){return s.doubleOfferedBy!==null?s.playerIds[1-s.doubleOfferedBy]:current(s);},legalMoves: bgMoves,validate(s,m){return this.legalMoves(s,m.player).some(x=>x.type===m.type&&JSON.stringify(x.payload)===JSON.stringify(m.payload));},apply(s,m){if(m.type==='offer-double')return{...s,doubleOfferedBy:s.turn,log:[...s.log,`${m.player} offered to double the cube`]};if(m.type==='accept-double')return{...s,cube:s.cube*2,cubeOwner:1-s.turn,doubleOfferedBy:null,dice:[],rolled:false,log:[...s.log,`${m.player} accepted the cube at ${s.cube*2}`]};if(m.type==='drop-double')return{...s,cubeDroppedWinner:s.doubleOfferedBy,doubleOfferedBy:null,log:[...s.log,`${m.player} dropped the cube`]};if(m.type==='roll'){const a=1+Math.floor(Math.random()*6),b=1+Math.floor(Math.random()*6);return{...s,dice:a===b?[a,a,a,a]:[a,b],rolled:true,log:[...s.log,`${m.player} rolled ${a}${a===b?` doubles ${b}`:` and ${b}`}`]};}if(m.type==='pass')return{...s,turn:(s.turn+1)%2,dice:[],rolled:false,log:[...s.log,`${m.player} had no legal move`]};const pts=s.points.map(p=>[...p]),bar=[...s.bar],off=[...s.off],side=s.turn,opp=1-side,{from,to,die,di,fromBar}=m.payload;if(fromBar){bar[side]--; }else pts[from][side]--;if(to<0||to>23)off[side]++;else{if(pts[to][opp]===1){pts[to][opp]=0;bar[opp]++;}pts[to][side]++;}const dice=[...s.dice];dice[di]=0;const next={...s,points:pts,bar,off,dice,log:[...s.log,`${m.player} moved using ${die}`]};const remaining=bgMoves({...next,rolled:true},m.player);if(remaining.every(candidate=>candidate.type==='pass')||dice.every(x=>!x)){return{...next,turn:(side+1)%2,dice:[],rolled:false};}return next;},isOver(s){if(s.cubeDroppedWinner!==null)return{winner:s.playerIds[s.cubeDroppedWinner],reason:`Opponent dropped the ${s.cube}-point cube`,scores:{[s.playerIds[s.cubeDroppedWinner]]:s.cube},pointsEarned:{[s.playerIds[s.cubeDroppedWinner]]:s.cube}};const i=s.off.findIndex(n=>n>=15);if(i<0)return null;const loser=1-i,home=i===0?s.points.slice(0,6):s.points.slice(18,24),gammon=s.off[loser]===0,backgammon=gammon&&(s.bar[loser]>0||home.some(point=>point[loser]>0)),multiplier=backgammon?3:gammon?2:1,stake=s.cube*multiplier;return{winner:s.playerIds[i],reason:backgammon?'Backgammon — all checkers borne off':gammon?'Gammon — all checkers borne off':'All checkers borne off',scores:{[s.playerIds[0]]:s.off[0],[s.playerIds[1]]:s.off[1]},pointsEarned:{[s.playerIds[i]]:stake}};},bot(s,p){const m=this.legalMoves(s,p);return m[Math.floor(Math.random()*m.length)];}};

