import type { GameDefinition, Player } from '../core/types';

type BaseState = {
  playerIds: string[];
  turn: number;
  round: number;
  scores: Record<string, number>;
  log: string[];
};

export type MonopolyPhase = 'roll' | 'buy' | 'offer' | 'auction' | 'bankruptcy-auction';

type MonopolyCard = { id: string; text: string; effect: string; amount?: number; target?: string; multiplier?: number };


export type MonopolyTrade = {
  from: string;
  to: string;
  offeredProperties: string[];
  requestedProperties: string[];
  offeredCash: number;
  requestedCash: number;
};

export type MonopolyAuction = {
  propertyId: string;
  bidderIndex: number;
  highBid: number;
  highBidder: string | null;
  passed: string[];
};

export type MonopolyState = BaseState & {
  money: Record<string, number>;
  positions: Record<string, number>;
  owned: Record<string, string | null>;
  houses: Record<string, number>;
  properties: Property[];
  jail: Record<string, number>;
  doubles: number;
  phase: MonopolyPhase;
  lastRoll: [number, number] | null;
  boardId: string;
  auction: MonopolyAuction | null;
  mortgages: Record<string, boolean>;
  chanceDeck: MonopolyCard[];
  chestDeck: MonopolyCard[];
  chanceIndex: number;
  chestIndex: number;
  jailFree: Record<string, number>;
  jailFreeSources: Record<string, {deck:'chance'|'chest'; cardId:string}[]>;
  pendingTrade: MonopolyTrade | null;
  bankrupt: Record<string, boolean>;
  bankAuctionQueue: string[];
  offerPropertyId: string | null;
  offerCount: number;
  pendingPurchaseOffer: { from: string; to: string; propertyId: string; amount: number; attempt: number } | null;
};

export type Property = {
  id: string;
  name: string;
  group: string;
  price: number;
  rent: number;
  type: 'property' | 'railroad' | 'utility' | 'tax' | 'chance' | 'chest' | 'corner';
};

export type SimpleState = BaseState & Record<string, unknown>;

function nextTurn(s: BaseState) { return (s.turn + 1) % s.playerIds.length; }
function addLog(s: BaseState, message: string) { return [...s.log, message]; }
function base(players: Player[]): BaseState {
  return { playerIds: players.map(p => p.id), turn: 0, round: 1, scores: Object.fromEntries(players.map(p => [p.id, 0])), log: [] };
}

const CITY_A: Property[] = [
  {id:'go',name:'START',group:'corner',price:0,rent:0,type:'corner'},
  {id:'a1',name:'Sunrise Avenue',group:'Amber',price:60,rent:2,type:'property'},
  {id:'ch1',name:'Community Chest',group:'chest',price:0,rent:0,type:'chest'},
  {id:'a2',name:'Palm Street',group:'Amber',price:60,rent:4,type:'property'},
  {id:'tax1',name:'City Tax',group:'tax',price:0,rent:200,type:'tax'},
  {id:'r1',name:'Central Rail',group:'Rail',price:200,rent:25,type:'railroad'},
  {id:'b1',name:'Market Lane',group:'Azure',price:100,rent:6,type:'property'},
  {id:'chance1',name:'Chance',group:'chance',price:0,rent:0,type:'chance'},
  {id:'b2',name:'Harbor Road',group:'Azure',price:100,rent:6,type:'property'},
  {id:'b3',name:'Garden Walk',group:'Azure',price:120,rent:8,type:'property'},
  {id:'jail',name:'JAIL / VISIT',group:'corner',price:0,rent:0,type:'corner'},
  {id:'c1',name:'Museum Row',group:'Rose',price:140,rent:10,type:'property'},
  {id:'u1',name:'Power Works',group:'utility',price:150,rent:20,type:'utility'},
  {id:'c2',name:'River Drive',group:'Rose',price:140,rent:10,type:'property'},
  {id:'c3',name:'Hye Boulevard',group:'Rose',price:160,rent:12,type:'property'},
  {id:'r2',name:'West Rail',group:'Rail',price:200,rent:25,type:'railroad'},
  {id:'d1',name:'Skyline Street',group:'Gold',price:180,rent:14,type:'property'},
  {id:'ch2',name:'Community Chest',group:'chest',price:0,rent:0,type:'chest'},
  {id:'d2',name:'Central Plaza',group:'Gold',price:180,rent:14,type:'property'},
  {id:'d3',name:'Grand Avenue',group:'Gold',price:200,rent:16,type:'property'},
  {id:'parking',name:'FREE PARKING',group:'corner',price:0,rent:0,type:'corner'},
  {id:'e1',name:'Ocean View',group:'Red',price:220,rent:18,type:'property'},
  {id:'chance2',name:'Chance',group:'chance',price:0,rent:0,type:'chance'},
  {id:'e2',name:'Lighthouse Road',group:'Red',price:220,rent:18,type:'property'},
  {id:'e3',name:'Port Avenue',group:'Red',price:240,rent:20,type:'property'},
  {id:'r3',name:'Harbor Rail',group:'Rail',price:200,rent:25,type:'railroad'},
  {id:'f1',name:'Old Town',group:'Green',price:260,rent:22,type:'property'},
  {id:'f2',name:'Founders Way',group:'Green',price:260,rent:22,type:'property'},
  {id:'u2',name:'Water Works',group:'utility',price:150,rent:20,type:'utility'},
  {id:'f3',name:'Royal Street',group:'Green',price:280,rent:24,type:'property'},
  {id:'goToJail',name:'GO TO JAIL',group:'corner',price:0,rent:0,type:'corner'},
  {id:'g1',name:'Palace Road',group:'Navy',price:300,rent:26,type:'property'},
  {id:'g2',name:'Crown Square',group:'Navy',price:300,rent:26,type:'property'},
  {id:'ch3',name:'Community Chest',group:'chest',price:0,rent:0,type:'chest'},
  {id:'g3',name:'Empire Avenue',group:'Navy',price:320,rent:28,type:'property'},
  {id:'r4',name:'Airport Rail',group:'Rail',price:200,rent:25,type:'railroad'},
  {id:'chance3',name:'Chance',group:'chance',price:0,rent:0,type:'chance'},
  {id:'h1',name:'Luxury Heights',group:'Purple',price:350,rent:35,type:'property'},
  {id:'tax2',name:'Luxury Tax',group:'tax',price:0,rent:100,type:'tax'},
  {id:'h2',name:'Grand Palace',group:'Purple',price:400,rent:50,type:'property'},
];
const CITY_B = CITY_A.map((p, i) => ({...p, name: ['PORT ROYALE','Dockside Lane','Treasure Chest','Captain Street','Harbor Tax','Galleon Rail','Coral Market','Sea Chance','Anchor Road','Mermaid Walk','FORT / VISIT','Old Port','Wind Works','Sailor Street','Royal Quay','Pirate Rail','Cannon Street','Treasure Chest','King’s Market','Admiral Avenue','FREE ANCHORAGE','Lagoon View','Sea Chance','Tortuga Road','Buccaneer Bay','Corsair Rail','Shipyard','Smuggler’s Row','Water Works','Blackbeard Street','GO TO FORT','Governor Road','Crown Harbor','Treasure Chest','Golden Coast','Island Rail','Sea Chance','Captain’s Retreat','Harbor Tax','Royal Fortress'][i] }));

function isPurchasable(p: Property) { return p.type === 'property' || p.type === 'railroad' || p.type === 'utility'; }
function groupCount(s: MonopolyState, group: string, owner: string) { return s.properties.filter(p => p.group === group && s.owned[p.id] === owner).length; }
function groupSize(s: MonopolyState, group: string) { return s.properties.filter(p => p.group === group).length; }
function hasMonopoly(s: MonopolyState, p: Property, owner: string) { return p.type === 'property' && groupCount(s, p.group, owner) === groupSize(s, p.group); }
function rentFor(s: MonopolyState, p: Property, owner: string, rollTotal: number): number {
  if (s.mortgages[p.id]) return 0;
  if (p.type === 'railroad') return 25 * Math.pow(2, Math.max(0, groupCount(s, 'Rail', owner) - 1));
  if (p.type === 'utility') return rollTotal * (groupCount(s, 'utility', owner) >= 2 ? 10 : 4);
  const houses = s.houses[p.id] ?? 0;
  if (houses > 0) return p.rent * ([1, 5, 15, 45, 80][Math.min(houses, 5)] ?? 80);
  return p.rent * (hasMonopoly(s, p, owner) ? 2 : 1);
}

function buildCost(p: Property) {
  if (p.type !== 'property') return 0;
  const costs: Record<string, number> = { Amber: 50, Azure: 50, Rose: 100, Gold: 100, Red: 150, Green: 150, Navy: 200, Purple: 200 };
  return costs[p.group] ?? 50;
}
function totalHouses(s: MonopolyState) { return Object.values(s.houses).reduce((n, v) => n + Math.min(v, 4), 0); }
function totalHotels(s: MonopolyState) { return Object.values(s.houses).filter(v => v >= 5).length; }


const CHANCE_DECK: MonopolyCard[] = [
  {id:'c01',text:'Advance to START',effect:'go'},
  {id:'c02',text:'Advance to Ocean View',effect:'move',target:'e1'},
  {id:'c03',text:'Advance to Port Avenue',effect:'move',target:'e3'},
  {id:'c04',text:'Advance to Museum Row',effect:'move',target:'c1'},
  {id:'c05',text:'Advance to the next railroad; rent is doubled if owned',effect:'nearestRail',multiplier:2},
  {id:'c06',text:'Advance to the next railroad; rent is doubled if owned',effect:'nearestRail',multiplier:2},
  {id:'c07',text:'Advance to the next utility; rent is ten times the dice total if owned',effect:'nearestUtility',multiplier:10},
  {id:'c08',text:'The Bank pays you $50',effect:'collect',amount:50},
  {id:'c09',text:'Keep this card: Get Out of Jail Free',effect:'jailFree'},
  {id:'c10',text:'Go back 3 spaces',effect:'back3'},
  {id:'c11',text:'Go directly to Jail; do not collect START money',effect:'jail'},
  {id:'c12',text:'Building repairs: pay $25 per house and $100 per hotel',effect:'repairs',amount:25},
  {id:'c13',text:'Speeding fine: pay $15',effect:'pay',amount:15},
  {id:'c14',text:'Advance to Central Rail',effect:'move',target:'r1'},
  {id:'c15',text:'Advance to Grand Palace',effect:'move',target:'h2'},
  {id:'c16',text:'Pay each other player $50',effect:'payEach',amount:50},
];
const CHEST_DECK: MonopolyCard[] = [
  {id:'h01',text:'Advance to START',effect:'go'},
  {id:'h02',text:'Bank error in your favor: collect $200',effect:'collect',amount:200},
  {id:'h03',text:'Doctor fee: pay $50',effect:'pay',amount:50},
  {id:'h04',text:'From sale of stock: collect $50',effect:'collect',amount:50},
  {id:'h05',text:'Keep this card: Get Out of Jail Free',effect:'jailFree'},
  {id:'h06',text:'Go directly to Jail; do not collect START money',effect:'jail'},
  {id:'h07',text:'Birthday: collect $10 from every other player',effect:'birthday',amount:10},
  {id:'h08',text:'You inherit $100',effect:'collect',amount:100},
  {id:'h09',text:'Hospital fee: pay $100',effect:'pay',amount:100},
  {id:'h10',text:'School fees: pay $50',effect:'pay',amount:50},
  {id:'h11',text:'Consulting fee: collect $25',effect:'collect',amount:25},
  {id:'h12',text:'Street repairs: pay $40 per house and $115 per hotel',effect:'repairs',amount:40},
  {id:'h13',text:'Second prize in a beauty contest: collect $10',effect:'collect',amount:10},
  {id:'h14',text:'Income-tax refund: collect $20',effect:'collect',amount:20},
  {id:'h15',text:'Holiday fund matures: collect $100',effect:'collect',amount:100},
  {id:'h16',text:'Life insurance matures: collect $100',effect:'collect',amount:100},
];
function shuffled<T>(items:T[]):T[]{ const a=[...items]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }
function nextUnownedByType(s: MonopolyState, from:number, type: Property['type']){ for(let i=1;i<=40;i++){const p=s.properties[(from+i)%40];if(p.type===type)return (from+i)%40;} return from; }

function canMortgage(s: MonopolyState, p: Property, owner: string) {
  if (!isPurchasable(p) || s.owned[p.id] !== owner || s.mortgages[p.id]) return false;
  if (p.type !== 'property') return true;
  return !s.properties.some(q => q.type === 'property' && q.group === p.group && (s.houses[q.id] ?? 0) > 0);
}
function mortgageValue(p: Property) { return Math.floor(p.price / 2); }
function canUnmortgage(s: MonopolyState, p: Property, owner: string) { return isPurchasable(p) && s.owned[p.id] === owner && !!s.mortgages[p.id] && s.money[owner] >= Math.ceil(mortgageValue(p) * 1.1); }

function tradeableProperty(s: MonopolyState, id: string, owner: string) {
  const p=s.properties.find(x=>x.id===id);
  if(!p || !isPurchasable(p) || s.owned[p.id]!==owner) return false;
  if(p.type==='property') {
    const group=s.properties.filter(x=>x.type==='property'&&x.group===p.group);
    if(group.some(x=>(s.houses[x.id]??0)>0)) return false;
  }
  return true;
}
function validTradeIds(s: MonopolyState, ids: unknown, owner: string) {
  if(!Array.isArray(ids) || ids.length>8 || new Set(ids.map(String)).size!==ids.length) return false;
  return ids.every(id=>tradeableProperty(s,String(id),owner));
}
function tradeInterestFor(s: MonopolyState, ids: string[]) {
  return ids.reduce((sum,id)=>sum+(s.mortgages[id]?Math.ceil(mortgageValue(s.properties.find(p=>p.id===id)!)*0.1):0),0);
}
function monopolyCurrentPlayer(s: MonopolyState) { for(let i=0;i<s.playerIds.length;i++){const id=s.playerIds[(s.turn+i)%s.playerIds.length];if(!s.bankrupt[id])return id;} return s.playerIds[s.turn]; }
function nextActiveIndex(s: MonopolyState, from: number) { for(let i=1;i<=s.playerIds.length;i++){const idx=(from+i)%s.playerIds.length;if(!s.bankrupt[s.playerIds[idx]])return idx;}return from; }
function sellBuildingsForDebt(s: MonopolyState, player: string, money: number, houses: Record<string,number>) {
  let cash=money;
  while(cash<0){
    const candidates=s.properties.filter(p=>p.type==='property'&&s.owned[p.id]===player&&(houses[p.id]??0)>0);
    if(!candidates.length)break;
    const max=Math.max(...candidates.map(p=>houses[p.id]??0));
    const p=candidates.find(x=>(houses[x.id]??0)===max)!;
    const refund=Math.floor(buildCost(p)/2); houses[p.id]=(houses[p.id]??0)-1; cash+=refund; if(houses[p.id]===0)delete houses[p.id];
  }
  return cash;
}
function mortgageForDebt(s: MonopolyState, player: string, money: number, mortgages: Record<string,boolean>) {
  let cash=money;
  while(cash<0){
    const candidates=s.properties.filter(p=>isPurchasable(p)&&s.owned[p.id]===player&&!mortgages[p.id]&&canMortgage(s,p,player));
    if(!candidates.length)break;
    const p=candidates.sort((a,b)=>mortgageValue(b)-mortgageValue(a))[0]; mortgages[p.id]=true; cash+=mortgageValue(p);
  }
  return cash;
}

export const monopoly: GameDefinition<MonopolyState, Record<string, unknown>> = {
  id:'monopoly', name:'Monopoly', minPlayers:2, maxPlayers:6, icon:'monopoly', color:'#E9B949',
  tags:['board','strategy','classic'], boards:[{id:'hye-city',name:'Hye City'},{id:'port-royale',name:'Port Royale'}],
  supports:{bots:true,lan:true,passAndPlay:true,currency:true},
  view(state){return {...state,chanceDeck:state.chanceDeck.map((_,i)=>({id:`hidden-chance-${i}`,text:'Hidden card',effect:'hidden'})),chestDeck:state.chestDeck.map((_,i)=>({id:`hidden-chest-${i}`,text:'Hidden card',effect:'hidden'}))};},
  setup(players,boardId='hye-city'){
    const b=boardId==='port-royale'?CITY_B:CITY_A;
    return {...base(players),properties:b,money:Object.fromEntries(players.map(p=>[p.id,1500])),positions:Object.fromEntries(players.map(p=>[p.id,0])),owned:Object.fromEntries(b.map(p=>[p.id,null])),houses:{},mortgages:Object.fromEntries(b.filter(p=>isPurchasable(p)).map(p=>[p.id,false])),jail:Object.fromEntries(players.map(p=>[p.id,0])),doubles:0,phase:'roll',lastRoll:null,boardId,auction:null,chanceDeck:shuffled(CHANCE_DECK),chestDeck:shuffled(CHEST_DECK),chanceIndex:0,chestIndex:0,jailFree:Object.fromEntries(players.map(p=>[p.id,0])),jailFreeSources:Object.fromEntries(players.map(p=>[p.id,[]])),pendingTrade:null,bankrupt:Object.fromEntries(players.map(p=>[p.id,false])),bankAuctionQueue:[],offerPropertyId:null,offerCount:0,pendingPurchaseOffer:null};
  },
  currentPlayer:monopolyCurrentPlayer,
  allowOutOfTurn:(s,m)=>['accept_trade','reject_trade','accept_purchase','reject_purchase'].includes(String((m.payload as Record<string,unknown>)?.action??'')) && (String((m.payload as Record<string,unknown>)?.action??'').includes('purchase') ? !!s.pendingPurchaseOffer && m.player===s.pendingPurchaseOffer.to : !!s.pendingTrade && m.player===s.pendingTrade.to),
  legalMoves:(s,p)=>{
    if(s.pendingPurchaseOffer && s.pendingPurchaseOffer.to===p) return [
      {type:'trade',player:p,payload:{action:'accept_purchase'},ts:Date.now()},
      {type:'trade',player:p,payload:{action:'reject_purchase'},ts:Date.now()}
    ];
    if(s.pendingTrade && s.pendingTrade.to===p) return [
      {type:'trade',player:p,payload:{action:'accept_trade'},ts:Date.now()},
      {type:'trade',player:p,payload:{action:'reject_trade'},ts:Date.now()}
    ];
    if(p!==monopolyCurrentPlayer(s))return [];
    if(s.phase==='roll'){
      const others=s.playerIds.filter(id=>id!==p);
      const trade=others.length ? [{type:'trade',player:p,payload:{action:'offer_trade',to:others[0],offeredProperties:[],requestedProperties:[],offeredCash:0,requestedCash:0},ts:Date.now()}] : [];
      if((s.jail[p]??0)>0){
        const jailMoves:any[]=[];
        if((s.jailFree[p]??0)>0) jailMoves.push({type:'jail_free',player:p,payload:{action:'use_jail_free'},ts:Date.now()});
        if(s.money[p]>=50) jailMoves.push({type:'jail',player:p,payload:{action:'pay_jail_fine'},ts:Date.now()});
        jailMoves.push({type:'roll',player:p,payload:{action:'roll'},ts:Date.now()});
        return jailMoves;
      }
      const builds=s.properties.filter(x=>x.type==='property'&&s.owned[x.id]===p&&hasMonopoly(s,x,p)&&(s.houses[x.id]??0)<5&&s.money[p]>=buildCost(x)).map(x=>({type:'build',player:p,payload:{action:'build',propertyId:x.id},ts:Date.now()}));
      const finance=s.properties.filter(x=>isPurchasable(x)&&s.owned[x.id]===p).flatMap(x=>{
        const out:any[]=[]; const group=s.properties.filter(g=>g.type==='property'&&g.group===x.group);
        if(!s.mortgages[x.id] && (x.type!=='property' || !group.some(g=>(s.houses[g.id]??0)>0))) out.push({type:'mortgage',player:p,payload:{action:'mortgage',propertyId:x.id},ts:Date.now()});
        if(s.mortgages[x.id] && s.money[p]>=Math.ceil(mortgageValue(x)*1.1)) out.push({type:'unmortgage',player:p,payload:{action:'unmortgage',propertyId:x.id},ts:Date.now()});
        if(x.type==='property' && (s.houses[x.id]??0)>0) out.push({type:'sell_building',player:p,payload:{action:'sell_building',propertyId:x.id},ts:Date.now()});
        return out;
      });
      return [{type:'roll',player:p,payload:{action:'roll'},ts:Date.now()},...builds,...finance,...trade];
    }
    if(s.phase==='buy')return [{type:'buy',player:p,payload:{action:'buy'},ts:Date.now()},{type:'auction',player:p,payload:{action:'auction'},ts:Date.now()},{type:'decline',player:p,payload:{action:'decline'},ts:Date.now()}];
    if(s.phase==='offer') return [{type:'trade',player:p,payload:{action:'offer_purchase',propertyId:s.offerPropertyId,amount:s.money[p]},ts:Date.now()},{type:'trade',player:p,payload:{action:'end_offer'},ts:Date.now()}];
    if((s.phase==='auction'||s.phase==='bankruptcy-auction')&&s.auction)return [{type:'auction',player:p,payload:{action:'bid',amount:s.auction.highBid+1},ts:Date.now()},{type:'auction',player:p,payload:{action:'pass'},ts:Date.now()}];
    return [];
  },
  validate:(s,m)=>{
    const a=String(m.payload.action??'');
    if(a==='accept_trade'||a==='reject_trade') return !!s.pendingTrade && m.player===s.pendingTrade.to;
    if(a==='accept_purchase') { const offer=s.pendingPurchaseOffer; if(!offer||m.player!==offer.to)return false; const p=s.properties.find(x=>x.id===offer.propertyId); const interest=p&&s.mortgages[p.id]?Math.ceil(mortgageValue(p)*0.1):0; return !!p && s.owned[p.id]===offer.to && tradeableProperty(s,p.id,offer.to) && s.money[offer.from]>=offer.amount+interest; }
    if(a==='reject_purchase') return !!s.pendingPurchaseOffer && m.player===s.pendingPurchaseOffer.to;
    if(a==='offer_purchase') { const offer=s.pendingPurchaseOffer; const p=s.properties.find(x=>x.id===s.offerPropertyId); const amount=Number(m.payload.amount); const interest=p&&s.mortgages[p.id]?Math.ceil(mortgageValue(p)*0.1):0; const to=p?s.owned[p.id]:null; return s.phase==='offer' && m.player===monopolyCurrentPlayer(s) && !!p && !!to && to!==m.player && tradeableProperty(s,p.id,to) && !offer && s.offerCount<5 && Number.isInteger(amount) && amount>0 && amount+interest<=s.money[m.player]; }
    if(a==='end_offer') return s.phase==='offer' && m.player===monopolyCurrentPlayer(s) && !s.pendingPurchaseOffer;
    if(m.player!==monopolyCurrentPlayer(s))return false;
    if(a==='offer_trade'){
      if(s.pendingTrade) return false;
      const to=String(m.payload.to??'');
      if(!s.playerIds.includes(to)||to===m.player) return false;
      const oc=Math.max(0,Math.floor(Number(m.payload.offeredCash??0)));
      const rc=Math.max(0,Math.floor(Number(m.payload.requestedCash??0)));
      if(oc!==Number(m.payload.offeredCash??0)||rc!==Number(m.payload.requestedCash??0)) return false;
      if(oc>s.money[m.player]) return false;
      if(!validTradeIds(s,m.payload.offeredProperties,m.player)||!validTradeIds(s,m.payload.requestedProperties,to)) return false;
      const op=Array.isArray(m.payload.offeredProperties)?m.payload.offeredProperties:[]; const rp=Array.isArray(m.payload.requestedProperties)?m.payload.requestedProperties:[]; return oc>0||rc>0||op.length>0||rp.length>0;
    }
    if(s.phase==='roll'){
      if(a==='use_jail_free') return (s.jail[m.player]??0)>0 && (s.jailFree[m.player]??0)>0;
      if(a==='pay_jail_fine') return (s.jail[m.player]??0)>0 && s.money[m.player]>=50;
      if(a==='roll')return true;
      if(a==='mortgage'||a==='unmortgage'||a==='sell_building'){
        const p=s.properties.find(x=>x.id===String(m.payload.propertyId)); if(!p||!isPurchasable(p)||s.owned[p.id]!==m.player)return false;
        if(a==='mortgage'){ if(s.mortgages[p.id])return false; if(p.type==='property'&&s.properties.filter(x=>x.type==='property'&&x.group===p.group).some(x=>(s.houses[x.id]??0)>0))return false; return true; }
        if(a==='unmortgage')return !!s.mortgages[p.id]&&s.money[m.player]>=Math.ceil(mortgageValue(p)*1.1);
        return p.type==='property'&&(s.houses[p.id]??0)>0;
      }
      if(a==='mortgage'){
        const p=s.properties.find(x=>x.id===String(m.payload.propertyId));
        return !!p && canMortgage(s,p,m.player);
      }
      if(a==='unmortgage'){
        const p=s.properties.find(x=>x.id===String(m.payload.propertyId));
        return !!p && canUnmortgage(s,p,m.player);
      }
      if(a==='build'){
        const p=s.properties.find(x=>x.id===String(m.payload.propertyId));
        if(!p||p.type!=='property'||s.owned[p.id]!==m.player||!hasMonopoly(s,p,m.player)||s.mortgages[p.id])return false;
        const n=s.houses[p.id]??0,cost=buildCost(p); if(n>=5||s.money[m.player]<cost)return false;
        if(n<4 && totalHouses(s)>=32)return false;
        if(n===4 && totalHotels(s)>=12)return false;
        const group=s.properties.filter(x=>x.type==='property'&&x.group===p.group); if(group.some(x=>s.mortgages[x.id]))return false; return !group.some(x=>(s.houses[x.id]??0)<n);
      }
    }
    if(s.phase==='buy')return a==='buy'||a==='auction'||a==='decline';
    if((s.phase==='auction'||s.phase==='bankruptcy-auction')&&s.auction){if(a==='pass')return !s.auction.passed.includes(m.player);if(a==='bid'){const amount=Number(m.payload.amount);return Number.isInteger(amount)&&amount>s.auction.highBid&&amount<=s.money[m.player];}}
    return false;
  },
  apply(s,m){
    const player=m.player, action=String(m.payload.action??'');
    if(action==='offer_purchase') {
      const prop=s.properties.find(x=>x.id===s.offerPropertyId); const to=prop ? s.owned[prop.id] : null; const amount=Math.floor(Number(m.payload.amount));
      const interest=prop&&s.mortgages[prop.id]?Math.ceil(mortgageValue(prop)*0.1):0;
      if(s.phase!=='offer'||!prop||!to||to===player||!tradeableProperty(s,prop.id,to)||s.pendingPurchaseOffer||s.offerCount>=5||amount<=0||amount+interest>s.money[player]) return s;
      const attempt=s.offerCount+1;
      return {...s,offerCount:attempt,pendingPurchaseOffer:{from:player,to,propertyId:prop.id,amount,attempt},log:addLog(s,`${player} offered ${to} $${amount} for ${prop.name} (offer ${attempt}/5)`)};
    }
    if(action==='reject_purchase') { const offer=s.pendingPurchaseOffer; if(!offer||offer.to!==player)return s; return {...s,pendingPurchaseOffer:null,log:addLog(s,`${player} rejected ${offer.from}'s $${offer.amount} offer for ${s.properties.find(p=>p.id===offer.propertyId)?.name??offer.propertyId}`)}; }
    if(action==='accept_purchase') { const offer=s.pendingPurchaseOffer; if(!offer||offer.to!==player||s.owned[offer.propertyId]!==player)return s; const prop=s.properties.find(p=>p.id===offer.propertyId); if(!prop||!tradeableProperty(s,prop.id,player))return s; const interest=s.mortgages[prop.id]?Math.ceil(mortgageValue(prop)*0.1):0; if(s.money[offer.from]<offer.amount+interest)return s; const money={...s.money,[offer.from]:s.money[offer.from]-offer.amount-interest,[player]:s.money[player]+offer.amount}; return {...s,money,owned:{...s.owned,[offer.propertyId]:offer.from},pendingPurchaseOffer:null,phase:'roll',offerPropertyId:null,offerCount:0,turn:nextActiveIndex(s,s.turn),log:addLog(s,`${player} accepted ${offer.from}'s $${offer.amount} offer; ${offer.from} bought ${prop.name}${interest?` and paid $${interest} mortgage interest`:''}`)}; }
    if(action==='end_offer') { if(s.phase!=='offer'||monopolyCurrentPlayer(s)!==player)return s; const nextTurn=s.doubles>0?s.turn:nextActiveIndex(s,s.turn); return {...s,phase:'roll',offerPropertyId:null,offerCount:0,turn:nextTurn,log:addLog(s,`${player} ended property offer window`)}; }
    if(action==='offer_trade') {
      if(s.pendingTrade) return s;
      const to=String(m.payload.to??'');
      const offeredProperties=(Array.isArray(m.payload.offeredProperties)?m.payload.offeredProperties:[]).map(String);
      const requestedProperties=(Array.isArray(m.payload.requestedProperties)?m.payload.requestedProperties:[]).map(String);
      const offeredCash=Math.floor(Number(m.payload.offeredCash??0));
      const requestedCash=Math.floor(Number(m.payload.requestedCash??0));
      if(!s.playerIds.includes(to)||to===player||offeredCash<0||requestedCash<0||offeredCash>s.money[player]||!validTradeIds(s,offeredProperties,player)||!validTradeIds(s,requestedProperties,to)) return s;
      const offeredNames=offeredProperties.map(id=>s.properties.find(p=>p.id===id)?.name??id).join(', ')||'no property';
      const requestedNames=requestedProperties.map(id=>s.properties.find(p=>p.id===id)?.name??id).join(', ')||'no property';
      return {...s,pendingTrade:{from:player,to,offeredProperties,requestedProperties,offeredCash,requestedCash},log:addLog(s,`${player} offered ${to} $${offeredCash} + ${offeredNames} for $${requestedCash} + ${requestedNames}`)};
    }
    if(action==='reject_trade') {
      if(!s.pendingTrade||s.pendingTrade.to!==player) return s;
      return {...s,pendingTrade:null,log:addLog(s,`${player} rejected ${s.pendingTrade.from}'s trade`)};
    }
    if(action==='accept_trade') {
      const t=s.pendingTrade;
      if(!t||t.to!==player) return s;
      if(s.money[t.from]<t.offeredCash || s.money[t.to]<t.requestedCash) return s;
      if(!validTradeIds(s,t.offeredProperties,t.from)||!validTradeIds(s,t.requestedProperties,t.to)) return s;
      const incomingMortgaged=t.offeredProperties.filter(id=>s.mortgages[id]);
      const outgoingMortgaged=t.requestedProperties.filter(id=>s.mortgages[id]);
      // Each buyer pays the Bank 10% mortgage interest on mortgaged property received.
      const interestForTo=tradeInterestFor(s,incomingMortgaged);
      const interestForFrom=tradeInterestFor(s,outgoingMortgaged);
      if(s.money[t.to]-t.requestedCash<interestForTo || s.money[t.from]-t.offeredCash<interestForFrom) return s;
      const money={...s.money};
      money[t.from]=money[t.from]-t.offeredCash+t.requestedCash-interestForFrom;
      money[t.to]=money[t.to]-t.requestedCash+t.offeredCash-interestForTo;
      const owned={...s.owned};
      for(const id of t.offeredProperties) owned[id]=t.to;
      for(const id of t.requestedProperties) owned[id]=t.from;
      const interestTotal=interestForTo+interestForFrom;
      const sources=interestTotal?` plus ${interestTotal} mortgage interest`:'';

      const gave=t.offeredProperties.map(id=>s.properties.find(p=>p.id===id)?.name??id).join(', ')||'no property';
      const received=t.requestedProperties.map(id=>s.properties.find(p=>p.id===id)?.name??id).join(', ')||'no property';
      return {...s,money,owned,pendingTrade:null,log:addLog(s,`${t.from} and ${t.to} completed a trade: $${t.offeredCash} + ${gave} exchanged for $${t.requestedCash} + ${received}${sources}`)};
    }
    if(s.phase==='roll'&&action==='pay_jail_fine') {
      if((s.jail[player]??0)<=0 || s.money[player]<50) return s;
      return {...s,money:{...s.money,[player]:s.money[player]-50},jail:{...s.jail,[player]:0},doubles:0,log:addLog(s,`${player} paid $50 to leave Jail; next roll is a normal turn`)};
    }
    if(s.phase==='roll'&&action==='use_jail_free') {
      if((s.jail[player]??0)<=0 || (s.jailFree[player]??0)<=0) return s;
      const sources=[...(s.jailFreeSources[player]??[])]; const source=sources.shift();
      if(!source) return s;
      const returned=(source.deck==='chance'?CHANCE_DECK:CHEST_DECK).find(c=>c.id===source.cardId);
      const patch=source.deck==='chance' ? {chanceDeck: returned ? [...s.chanceDeck, returned] : s.chanceDeck} : {chestDeck: returned ? [...s.chestDeck, returned] : s.chestDeck};
      return {...s,...patch,jail:{...s.jail,[player]:0},jailFree:{...s.jailFree,[player]:(s.jailFree[player]??0)-1},jailFreeSources:{...s.jailFreeSources,[player]:sources},log:addLog(s,`${player} used a Get Out of Jail Free card`)};
    }
    if(s.phase==='roll'&&(action==='mortgage'||action==='unmortgage'||action==='sell_building')){
      const p=s.properties.find(x=>x.id===String(m.payload.propertyId)); if(!p||!isPurchasable(p)||s.owned[p.id]!==player)return s;
      if(action==='mortgage'){ if(s.mortgages[p.id])return s; if(p.type==='property'&&s.properties.filter(x=>x.type==='property'&&x.group===p.group).some(x=>(s.houses[x.id]??0)>0))return s; const v=mortgageValue(p); return {...s,money:{...s.money,[player]:s.money[player]+v},mortgages:{...s.mortgages,[p.id]:true},log:addLog(s,`${player} mortgaged ${p.name} for $${v}`)}; }
      if(action==='unmortgage'){ if(!s.mortgages[p.id])return s; const cost=Math.ceil(mortgageValue(p)*1.1); if(s.money[player]<cost)return s; return {...s,money:{...s.money,[player]:s.money[player]-cost},mortgages:{...s.mortgages,[p.id]:false},log:addLog(s,`${player} unmortgaged ${p.name} for $${cost}`)}; }
      const n=s.houses[p.id]??0; if(p.type!=='property'||n<=0)return s; const group=s.properties.filter(x=>x.type==='property'&&x.group===p.group); if(group.some(x=>(s.houses[x.id]??0)>n))return s; const refund=Math.floor(buildCost(p)/2); return {...s,money:{...s.money,[player]:s.money[player]+refund},houses:{...s.houses,[p.id]:n-1},log:addLog(s,`${player} sold a building on ${p.name} for $${refund}`)};
    }
    if(s.phase==='roll'&&action==='build'){
      const p=s.properties.find(x=>x.id===String(m.payload.propertyId)); if(!p||p.type!=='property'||s.owned[p.id]!==player||!hasMonopoly(s,p,player))return s;
      const n=s.houses[p.id]??0,cost=buildCost(p); if(n>=5||s.money[player]<cost)return s;
      if(n<4 && totalHouses(s)>=32)return s;
      if(n===4 && totalHotels(s)>=12)return s;
      const group=s.properties.filter(x=>x.type==='property'&&x.group===p.group); if(group.some(x=>s.mortgages[x.id]|| (s.houses[x.id]??0)<n))return s;
      return {...s,money:{...s.money,[player]:s.money[player]-cost},houses:{...s.houses,[p.id]:n+1},log:addLog(s,`${player} built on ${p.name} for $${cost}`)};
    }
    if(s.phase==='buy'){
      const pos=s.positions[player],p=s.properties[pos];
      if(action==='buy'&&isPurchasable(p)&&!s.owned[p.id]&&s.money[player]>=p.price){
        const keepDouble=s.lastRoll&&s.lastRoll[0]===s.lastRoll[1];
        return {...s,money:{...s.money,[player]:s.money[player]-p.price},owned:{...s.owned,[p.id]:player},phase:'roll',turn:keepDouble?s.turn:(s.turn+1)%s.playerIds.length,log:addLog(s,`${player} bought ${p.name} for $${p.price}`)};
      }
      if(action==='auction'){
        const first=(s.turn+1)%s.playerIds.length; return {...s,phase:'auction',turn:first,auction:{propertyId:p.id,bidderIndex:first,highBid:0,highBidder:null,passed:[]},log:addLog(s,`${player} chose to auction ${p.name}`)};
      }
      if(action==='decline'){
        const keepDouble=s.lastRoll&&s.lastRoll[0]===s.lastRoll[1];
        const next=keepDouble?s.turn:nextActiveIndex(s,s.turn); return {...s,phase:'roll',turn:next,auction:null,log:addLog(s,`${player} declined ${p.name}; no auction started`)};
      }
      return s;
    }
    if((s.phase==='auction'||s.phase==='bankruptcy-auction')&&s.auction){
      const a=s.auction;
      if(action==='bid'){
        const amount=Number(m.payload.amount); let next=a.bidderIndex;
        for(let i=1;i<=s.playerIds.length;i++){const idx=(a.bidderIndex+i)%s.playerIds.length;const id=s.playerIds[idx];if(!s.bankrupt[id]&&id!==player&&!a.passed.includes(id)){next=idx;break;}}
        return {...s,turn:next,auction:{...a,bidderIndex:next,highBid:amount,highBidder:player},log:addLog(s,`${player} bid $${amount}`)};
      }
      const passed=[...new Set([...a.passed,player])];
      const active=s.playerIds.filter(x=>!s.bankrupt[x]&&x!==a.highBidder&&!passed.includes(x));
      if(!active.length){
        if(!a.highBidder){
          if(s.phase==='bankruptcy-auction'){
            const queue=s.bankAuctionQueue.slice(1);
            if(queue.length){const nextProp=queue[0];const first=nextActiveIndex(s,s.turn);return {...s,turn:first,auction:{propertyId:nextProp,bidderIndex:first,highBid:0,highBidder:null,passed:[]},bankAuctionQueue:queue,log:addLog(s,`No bids for ${a.propertyId}; next seized property auctioned`)};}
            return {...s,phase:'roll',turn:nextActiveIndex(s,s.turn),auction:null,bankAuctionQueue:[],log:addLog(s,'Bankruptcy property auctions completed')};
          }
          const next=nextActiveIndex(s,s.turn);return {...s,phase:'roll',turn:next,auction:null,log:addLog(s,'Auction ended with no bids')};
        }
        const winner=a.highBidder, price=a.highBid;
        const money={...s.money,[winner]:s.money[winner]-price};
        const owned={...s.owned,[a.propertyId]:winner};
        if(s.phase==='bankruptcy-auction'){
          const queue=s.bankAuctionQueue.slice(1);
          if(queue.length){const nextProp=queue[0];const first=nextActiveIndex(s,s.turn);return {...s,money,owned,turn:first,auction:{propertyId:nextProp,bidderIndex:first,highBid:0,highBidder:null,passed:[]},bankAuctionQueue:queue,log:addLog(s,`${winner} won ${a.propertyId} for $${price}; next seized property auctioned`)};}
          return {...s,money,owned,phase:'roll',turn:nextActiveIndex(s,s.turn),auction:null,bankAuctionQueue:[],log:addLog(s,`${winner} won ${a.propertyId} for $${price}; bankruptcy auctions completed`)};
        }
        return {...s,money,owned,phase:'roll',turn:nextActiveIndex(s,s.playerIds.indexOf(winner)),auction:null,log:addLog(s,`${winner} won ${a.propertyId} for $${price}`)};
      }
      let next=s.turn; for(let i=1;i<=s.playerIds.length;i++){const idx=(s.turn+i)%s.playerIds.length,id=s.playerIds[idx];if(!s.bankrupt[id]&&!passed.includes(id)&&id!==a.highBidder){next=idx;break;}}
      return {...s,turn:next,auction:{...a,bidderIndex:next,passed},log:addLog(s,`${player} passed the auction`)};
    }
    // Roll: standard two-dice Monopoly flow.
    const d1=1+Math.floor(Math.random()*6),d2=1+Math.floor(Math.random()*6),total=d1+d2,old=s.positions[player];
    const inJail=(s.jail[player]??0)>0;
    let escapedFromJail=false;
    if(inJail){
      if(d1!==d2){
        const attempts=(s.jail[player]??0)+1;
        if(attempts<3)return {...s,lastRoll:[d1,d2] as [number,number],doubles:0,jail:{...s.jail,[player]:attempts},turn:(s.turn+1)%s.playerIds.length,log:addLog(s,`${player} stayed in Jail`) };
        // third failed attempt: pay and move the roll
        // Third failed attempt: pay the $50 fine, then move according to that roll.
        s={...s,money:{...s.money,[player]:s.money[player]-50},jail:{...s.jail,[player]:0}};
      } else {
        s={...s,jail:{...s.jail,[player]:0}};
        escapedFromJail=true;
      }
    }
    let doubles=d1===d2?s.doubles+1:0;
    if(d1===d2&&doubles>=3){return {...s,positions:{...s.positions,[player]:10},jail:{...s.jail,[player]:1},lastRoll:[d1,d2] as [number,number],doubles:0,phase:'roll',turn:(s.turn+1)%s.playerIds.length,log:addLog(s,`${player} rolled three doubles and was sent to Jail`)};}
    const pos=(old+total)%40,passedGo=pos<old; let money=s.money[player]+(passedGo?200:0); const moneyBy={...s.money,[player]:money};
    const positions={...s.positions,[player]:pos},jail={...s.jail}; const prop=s.properties[pos]; const owner=s.owned[prop.id]; let creditor:string|null=null;
    let log=`${player} rolled ${d1}+${d2} and landed on ${prop.name}`;
    if(pos===30){positions[player]=10;jail[player]=1;log+=' and went to Jail';}
    if(prop.type==='tax'){money-=prop.rent;moneyBy[player]=money;log+=` and paid $${prop.rent} tax`;}
    if(isPurchasable(prop)&&owner&&owner!==player){const rent=rentFor(s,prop,owner,total);money-=rent;moneyBy[player]=money;moneyBy[owner]=(moneyBy[owner]??0)+rent;creditor=owner;log+=` and paid $${rent} rent`;}
    let cardNeedsBuy=false;
    let cardSentToJail=false;
    if(prop.type==='chance'||prop.type==='chest'){
      const isChance=prop.type==='chance';
      const deck=isChance?s.chanceDeck:s.chestDeck;
      const idx=isChance?s.chanceIndex:s.chestIndex;
      const card=deck[idx%deck.length];
      const deckPatch=isChance?{chanceIndex:(idx+1)%deck.length}:{chestIndex:(idx+1)%deck.length};
      let cardPos=pos;
      let cardPassedGo=false;
      const moveTo=(target:number)=>{ cardPassedGo=target<cardPos; cardPos=target; positions[player]=target; if(cardPassedGo) money+=200; };
      if(card.effect==='collect') money+=card.amount??0;
      else if(card.effect==='pay') money-=card.amount??0;
      else if(card.effect==='payEach'){
        const each=card.amount??50;
        for(const id of s.playerIds) if(id!==player){
          money-=each; moneyBy[id]=(moneyBy[id]??0)+each;
        }
      }
      else if(card.effect==='birthday'){
        for(const id of s.playerIds) if(id!==player){
          const gift=Math.min(card.amount??10, Math.max(0,moneyBy[id]??0));
          money-=gift; moneyBy[id]=(moneyBy[id]??0)-gift;
        }
        moneyBy[player]=(moneyBy[player]??0)+Math.max(0,card.amount??10)*(s.playerIds.length-1);
      }
      else if(card.effect==='go') moveTo(0);
      else if(card.effect==='move'&&card.target){
        const target=s.properties.findIndex(x=>x.id===card.target); if(target>=0) moveTo(target);
      }
      else if(card.effect==='back3') moveTo((cardPos+37)%40);
      else if(card.effect==='jail'){ positions[player]=10; jail[player]=1; doubles=0; }
      else if(card.effect==='jailFree'){
        const jf={...s.jailFree,[player]:(s.jailFree[player]??0)+1};
        const js: MonopolyState['jailFreeSources']={...s.jailFreeSources,[player]:[...(s.jailFreeSources[player]??[]),{deck:isChance?'chance':'chest',cardId:card.id}]};
        s={...s,jailFree:jf,jailFreeSources:js};
      }
      else if(card.effect==='nearestRail'){
        const target=nextUnownedByType(s,cardPos,'railroad'); moveTo(target);
        const owner=s.owned[s.properties[target].id];
        if(owner&&owner!==player){ const rent=rentFor(s,s.properties[target],owner,total)*(card.multiplier??1); money-=rent; moneyBy[owner]=(moneyBy[owner]??0)+rent; creditor=owner; }
      }
      else if(card.effect==='nearestUtility'){
        const target=nextUnownedByType(s,cardPos,'utility'); moveTo(target);
        const owner=s.owned[s.properties[target].id];
        if(owner&&owner!==player){ const rent=total*(card.multiplier??10); money-=rent; moneyBy[owner]=(moneyBy[owner]??0)+rent; creditor=owner; }
      }
      else if(card.effect==='repairs'){
        let bill=0;
        for(const q of s.properties) if(s.owned[q.id]===player){
          const n=s.houses[q.id]??0; if(n>=5) bill+=100; else bill+=n*(card.amount??25);
        }
        money-=bill;
      }
      if(card.effect==='jailFree') log+=` and drew ${card.text}`;
      else log+=` and drew ${card.text}`;
      s={...s,...deckPatch};
      if(card.effect==='jailFree'){
        if(isChance){ const nextDeck=s.chanceDeck.filter(c=>c.id!==card.id); s={...s,chanceDeck:nextDeck,chanceIndex:nextDeck.length ? s.chanceIndex % nextDeck.length : 0}; }
        else { const nextDeck=s.chestDeck.filter(c=>c.id!==card.id); s={...s,chestDeck:nextDeck,chestIndex:nextDeck.length ? s.chestIndex % nextDeck.length : 0}; }
      }
      // Cards that move the player must still resolve the destination space.
      const landed=s.properties[positions[player]];
      if(card.effect!=='jail'&&card.effect!=='jailFree'&&(card.effect==='go'||card.effect==='move'||card.effect==='back3'||card.effect==='nearestRail'||card.effect==='nearestUtility')){
        if(landed.id==='goToJail'){
          positions[player]=10; jail[player]=1; doubles=0; cardSentToJail=true;
        } else if(landed.type==='tax'){
          money-=landed.rent;
        }
        const landedOwner=s.owned[landed.id];
        if(!cardSentToJail && isPurchasable(landed)&&!landedOwner){
          cardNeedsBuy=true;
        }
        if(!cardSentToJail&&isPurchasable(landed)&&landedOwner&&landedOwner!==player&&card.effect!=='nearestRail'&&card.effect!=='nearestUtility'){
          const rent=rentFor(s,landed,landedOwner,total); money-=rent; moneyBy[landedOwner]=(moneyBy[landedOwner]??0)+rent; creditor=landedOwner;
        }
      }
    }
    moneyBy[player]=money;
    if(money<0){
      const houses={...s.houses};
      money=sellBuildingsForDebt(s,player,money,houses);
      const mortgaged={...s.mortgages};
      money=mortgageForDebt(s,player,money,mortgaged);
      moneyBy[player]=money;
      if(money<0){
        const owned={...s.owned}; const bankrupt={...s.bankrupt,[player]:true};
        const jail={...s.jail,[player]:0}; const jailFree={...s.jailFree,[player]:0}; const jailFreeSources={...s.jailFreeSources,[player]:[]};
        const seized=s.properties.filter(q=>owned[q.id]===player).map(q=>q.id);
        if(creditor){
          for(const q of s.properties) if(owned[q.id]===player){
            owned[q.id]=creditor; delete houses[q.id];
            if(mortgaged[q.id]){ const interest=Math.ceil(mortgageValue(q)*0.1); moneyBy[creditor]=(moneyBy[creditor]??0)-interest; }
          }
          moneyBy[creditor]=(moneyBy[creditor]??0)+Math.max(0,money+s.money[player]); moneyBy[player]=0;
          return {...s,money:moneyBy,owned,houses,mortgages:mortgaged,bankrupt,jail,jailFree,jailFreeSources,positions,lastRoll:[d1,d2] as [number,number],doubles:0,phase:'roll',turn:nextActiveIndex({...s,bankrupt},s.turn),log:addLog(s,`${player} went bankrupt to ${creditor}`)};
        }
        for(const q of s.properties) if(owned[q.id]===player){ owned[q.id]=null; delete houses[q.id]; mortgaged[q.id]=false; }
        if(seized.length){
          const first=nextActiveIndex({...s,bankrupt},s.turn);
          return {...s,money:{...moneyBy,[player]:0},owned,houses,mortgages:mortgaged,bankrupt,jail,jailFree,jailFreeSources,positions,lastRoll:[d1,d2] as [number,number],doubles:0,phase:'bankruptcy-auction',turn:first,auction:{propertyId:seized[0],bidderIndex:first,highBid:0,highBidder:null,passed:[]},bankAuctionQueue:seized,log:addLog(s,`${player} went bankrupt to the Bank; seized properties are being auctioned`)};
        }
        return {...s,money:{...moneyBy,[player]:0},owned,houses,mortgages:mortgaged,bankrupt,jail,jailFree,jailFreeSources,positions,lastRoll:[d1,d2] as [number,number],doubles:0,phase:'roll',turn:nextActiveIndex({...s,bankrupt},s.turn),log:addLog(s,`${player} went bankrupt to the Bank`)};
      }
    }
    const nextState={...s,money:moneyBy,positions,jail,lastRoll:[d1,d2] as [number,number],doubles,log:addLog(s,log)};
    if(isPurchasable(prop)&&!owner)return {...nextState,phase:'buy',turn:s.turn};
    if(isPurchasable(prop)&&owner&&owner!==player)return {...nextState,phase:'offer',turn:s.turn,offerPropertyId:prop.id,offerCount:0,pendingPurchaseOffer:null};
    if(cardNeedsBuy)return {...nextState,phase:'buy',turn:s.turn};
    if(cardSentToJail)return {...nextState,phase:'roll',turn:(s.turn+1)%s.playerIds.length,doubles:0};
    if(pos===10&&jail[player])return {...nextState,phase:'roll',turn:(s.turn+1)%s.playerIds.length,doubles:0};
    if(escapedFromJail)return {...nextState,phase:'roll',turn:(s.turn+1)%s.playerIds.length,doubles:0};
    if(d1===d2)return {...nextState,phase:'roll',turn:s.turn};
    return {...nextState,phase:'roll',turn:(s.turn+1)%s.playerIds.length,round:s.round+(s.turn===s.playerIds.length-1?1:0),doubles:0};
  },
  isOver(s){
    const solvent=s.playerIds.filter(p=>!s.bankrupt[p]);
    if(solvent.length===1)return {winner:solvent[0],reason:'All other players are bankrupt'};
    return null;
  },
  bot:(s,p)=>{
    if(s.phase==='roll'){
      const prop=s.properties.find(x=>x.type==='property'&&s.owned[x.id]===p&&hasMonopoly(s,x,p)&&(s.houses[x.id]??0)<4&&s.money[p]>=buildCost(x));
      return prop?{type:'build',player:p,payload:{action:'build',propertyId:prop.id},ts:Date.now()}:{type:'roll',player:p,payload:{action:'roll'},ts:Date.now()};
    }
    if(s.phase==='buy'){const prop=s.properties[s.positions[p]];return {type:prop&&s.money[p]>=prop.price?'buy':'decline',player:p,payload:{action:prop&&s.money[p]>=prop.price?'buy':'decline'},ts:Date.now()};}
    if((s.phase==='auction'||s.phase==='bankruptcy-auction')&&s.auction){const amount=s.auction.highBid+10;return {type:'auction',player:p,payload:{action:amount<=s.money[p]?'bid':'pass',amount},ts:Date.now()};}
    return {type:'roll',player:p,payload:{action:'roll'},ts:Date.now()};
  }
};

function makeBaseDefinition(id:string,name:string,icon:string,color:string,tags:string[],min:number,max:number, actionLabel:string): GameDefinition<SimpleState,Record<string,unknown>> {
  return {id,name,minPlayers:min,maxPlayers:max,icon,color,tags,supports:{bots:true,lan:true,passAndPlay:true},setup(players){return {...base(players), actionLabel, progress:0};},currentPlayer:s=>s.playerIds[s.turn],legalMoves:(s,p)=>p===s.playerIds[s.turn]?[{type:'action',player:p,payload:{action:'action'},ts:Date.now()}]:[],validate:(s,m)=>m.player===s.playerIds[s.turn]&&m.payload.action==='action',apply(s,m){const progress=(s.progress as number)+1; return {...s,progress,turn:nextTurn(s),round:s.round+ (s.turn===s.playerIds.length-1?1:0),scores:{...s.scores,[m.player]:(s.scores[m.player]??0)+1},log:addLog(s,`${m.player} ${actionLabel.toLowerCase()}`)};},isOver(s){if((s.progress as number)>=30){const winner=[...s.playerIds].sort((a,b)=>s.scores[b]-s.scores[a])[0];return {winner,reason:'Target reached',scores:s.scores};}return null;},bot:(_s,p)=>({type:'action',player:p,payload:{action:'action'},ts:Date.now()})};
}

export const chess = makeBaseDefinition('chess','Chess','chess','#8B7FE8',['board','strategy','classic'],2,2,'made a move');
