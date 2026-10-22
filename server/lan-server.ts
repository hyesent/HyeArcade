import { createServer } from 'node:http';
import { randomBytes, randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

type Player = { id:string; profileId?:string; name:string; kind:'human'|'bot'|'remote'; seat:number; connected:boolean; difficulty?:'easy'|'medium'|'hard'; personality?:'friendly'|'rival'|'strategist'|'quiet' };
type Session = { id:string; gameId:string; boardId?:string; players:Player[]; state:any; initialState?:any; history:any[]; status:'lobby'|'playing'|'finished'; result:any; createdAt:number; updatedAt:number };
type RoomEvent = { sequence:number; message:any; at:number; views?:Record<string,Session>; privateState?:boolean };
type Room = { code:string; hostId:string; gameId:string; session:Session; sessionViews:Record<string,Session>; clients:Map<string,ServerResponse>; sequence:number; events:RoomEvent[]; disconnectTimers:Map<string,ReturnType<typeof setTimeout>>; requests:Map<string,Map<string,{sequence:number;eventId:string}>>; messageTimes:Map<string,number[]> };
const PRIVATE_STATE_GAMES = new Set(['crazy-eights','uno','whot','monopoly-deal','scrabble','mahjong','treasure-hunt','scramble','monopoly']);
const GAME_LIMITS: Record<string,{min:number;max:number}> = {
  'chess':{min:2,max:2},'checkers':{min:2,max:2},'drafts':{min:2,max:2},'tic-tac-toe':{min:2,max:2},'connect-four':{min:2,max:2},'gomoku':{min:2,max:2},'pirate-go':{min:2,max:2},'ludo':{min:2,max:4},'snake-ladder':{min:2,max:4},'crazy-eights':{min:2,max:4},'uno':{min:2,max:4},'whot':{min:2,max:6},'scrabble':{min:2,max:4},'mahjong':{min:4,max:4},'monopoly-deal':{min:2,max:5},'monopoly':{min:2,max:6},'scramble':{min:1,max:4},'treasure-hunt':{min:1,max:4},'solitaire':{min:1,max:1},'mahjong-solitaire':{min:1,max:1},'vita-mahjong':{min:1,max:1},'ayo':{min:2,max:2},
};
const gameLimits=(gameId:string)=>GAME_LIMITS[gameId] ?? {min:2,max:4};
const rooms=new Map<string,Room>();
const code=()=>randomBytes(3).toString('hex').toUpperCase();
const body=async(req:IncomingMessage)=>{let s='';for await(const c of req){s+=c;if(s.length>1_000_000)throw new Error('Request body too large');}return s?JSON.parse(s):{};};
function cors(res:ServerResponse){res.setHeader('access-control-allow-origin','*');res.setHeader('access-control-allow-headers','content-type,last-event-id');res.setHeader('access-control-allow-methods','GET,POST,OPTIONS');res.setHeader('cache-control','no-cache');}
function reply(res:ServerResponse,status:number,data:any){cors(res);res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify(data));}
function personalizedMessage(event:RoomEvent,clientId:string){if(event.message?.type==='session'){const view=event.views?.[clientId]??roomSessionView(event,clientId);if(view)return {...event.message,session:view};if(event.privateState)return {...event.message,session:{...event.message.session,state:null,initialState:undefined,history:[]}};}return event.message;}
function roomSessionView(event:RoomEvent,clientId:string){return event.views?.[clientId];}
function send(res:ServerResponse,event:RoomEvent,clientId=''){if(!res.destroyed)res.write(`id: ${event.sequence}\ndata: ${JSON.stringify(personalizedMessage(event,clientId))}\n\n`);}
function canReceiveEvent(room:Room,event:RoomEvent,clientId:string){const message=event.message;if(message?.type==='move'&&clientId!==room.hostId)return false;if(message?.type==='move.rejected'&&clientId!==message.player)return false;return true;}
function replayEvents(res:ServerResponse,room:Room,clientId:string,after:number){
  const pending=room.events.filter(event=>event.sequence>after);let expected=after+1;let gap=false;
  for(const event of pending){if(event.sequence!==expected){gap=true;break;}expected=event.sequence+1;}
  if(expected<=room.sequence)gap=true;
  if(gap){const snapshot=[...room.events].reverse().find(event=>event.message?.type==='session');if(snapshot){send(res,snapshot,clientId);after=snapshot.sequence;}else{send(res,{sequence:room.sequence,message:{type:'session',version:1,sequence:room.sequence,eventId:`${room.code}:${room.sequence}`,session:room.sessionViews[clientId]??room.session},at:Date.now(),privateState:PRIVATE_STATE_GAMES.has(room.gameId),views:room.sessionViews},clientId);after=room.sequence;}}
  for(const event of room.events)if(event.sequence>after&&canReceiveEvent(room,event,clientId))send(res,event,clientId);
}
function emit(room:Room,message:any,views?:Record<string,Session>){const sequence=++room.sequence;const enriched={...message,version:1,sequence,eventId:`${room.code}:${sequence}`,senderId:message.senderId??message.player??message.move?.player??undefined};const event:RoomEvent={sequence,message:enriched,at:Date.now(),views,privateState:PRIVATE_STATE_GAMES.has(room.gameId)};if(message.type==='session')room.events=room.events.filter(item=>item.message?.type!=='session');room.events.push(event);if(room.events.length>500)room.events.splice(0,room.events.length-500);for(const [clientId,res] of room.clients)if(canReceiveEvent(room,event,clientId))send(res,event,clientId);return event;}
function publicInfo(room:Room,clientId:string){const session=room.sessionViews[clientId]??(PRIVATE_STATE_GAMES.has(room.gameId)?{...room.session,state:null,initialState:undefined,history:[]}:room.session);return {code:room.code,clientId,session,host:room.hostId===clientId,sequence:room.sequence};}
function refreshSessionViews(room:Room){for(const [playerId,view] of Object.entries(room.sessionViews)){room.sessionViews[playerId]={...view,players:room.session.players.map(player=>({...player})),history:playerId===room.hostId?[...room.session.history]:(room.sessionViews[playerId]?.history??[])};}}
function safeText(value:unknown,max:number){return typeof value==='string'?value.trim().slice(0,max):'';}
function fail(res:ServerResponse,status:number,error:string){reply(res,status,{error});}
const server=createServer(async(req,res)=>{
  cors(res);if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
  const url=new URL(req.url??'/',`http://${req.headers.host??'localhost'}`);const parts=url.pathname.split('/').filter(Boolean);
  try{
    if(req.method==='POST'&&url.pathname==='/api/rooms'){
      const b=await body(req);if(!b.gameId||!b.player||typeof b.player.name!=='string')return fail(res,400,'gameId and player name are required');
      const limits=gameLimits(String(b.gameId));let c=code();while(rooms.has(c))c=code();const clientId=randomUUID();const p:Player={id:clientId,profileId:safeText(b.player.profileId,100)||undefined,name:safeText(b.player.name,32)||'Player',kind:'human',seat:0,connected:true};
      const now=Date.now();const session:Session={id:randomUUID(),gameId:b.gameId,players:[p],state:null,history:[],status:'lobby',result:null,createdAt:now,updatedAt:now};
      const room:Room={code:c,hostId:clientId,gameId:b.gameId,session,sessionViews:{},clients:new Map(),sequence:0,events:[],disconnectTimers:new Map(),requests:new Map(),messageTimes:new Map()};rooms.set(c,room);return reply(res,200,publicInfo(room,clientId));
    }
    if(parts[0]==='api'&&parts[1]==='rooms'&&parts[2]){
      const c=parts[2].toUpperCase(),room=rooms.get(c);if(!room)return fail(res,404,'Room not found');
      if(req.method==='GET'&&parts[3]==='events'){
        const clientId=url.searchParams.get('clientId')??'';if(!room.session.players.some(p=>p.id===clientId))return fail(res,403,'Unknown player');
        const oldTimer=room.disconnectTimers.get(clientId);if(oldTimer){clearTimeout(oldTimer);room.disconnectTimers.delete(clientId);}
        res.writeHead(200,{'content-type':'text/event-stream','cache-control':'no-cache','connection':'keep-alive','access-control-allow-origin':'*'});res.write(': connected\n\n');const heartbeat=setInterval(()=>{if(!res.destroyed)res.write(': keep-alive\n\n');},15000);room.clients.set(clientId,res);
        const p=room.session.players.find(x=>x.id===clientId);if(p)p.connected=true;
        const last=Number(req.headers['last-event-id']??url.searchParams.get('afterSequence')??0);
        const oldest=room.events[0]?.sequence??room.sequence;
        if(last>0&&last>=oldest-1){replayEvents(res,room,clientId,last);}
        else send(res,{sequence:room.sequence,message:{type:'session',version:1,sequence:room.sequence,eventId:`${room.code}:${room.sequence}`,session:room.sessionViews[clientId]??(PRIVATE_STATE_GAMES.has(room.gameId)?{...room.session,state:null,initialState:undefined,history:[]}:room.session)},at:Date.now(),privateState:PRIVATE_STATE_GAMES.has(room.gameId),views:room.sessionViews},clientId);
        req.on('close',()=>{clearInterval(heartbeat);if(room.clients.get(clientId)===res)room.clients.delete(clientId);const timer=setTimeout(()=>{if(room.clients.has(clientId))return;const pp=room.session.players.find(x=>x.id===clientId);if(pp)pp.connected=false;if(room.hostId===clientId&&!PRIVATE_STATE_GAMES.has(room.gameId)){const next=room.session.players.find(x=>x.id!==clientId&&x.connected);if(next){room.hostId=next.id;emit(room,{type:'host',player:next.id});}}room.session.updatedAt=Date.now();refreshSessionViews(room);emit(room,{type:'session',session:room.session},room.sessionViews);room.disconnectTimers.delete(clientId);},3500);room.disconnectTimers.set(clientId,timer);});return;
      }
      if(req.method==='GET'&&parts.length===3)return reply(res,200,{code:room.code,gameId:room.gameId,status:room.session.status,hostOnline:room.session.players.some(p=>p.id===room.hostId&&p.connected),players:room.session.players.map(p=>({name:p.name,seat:p.seat,connected:p.connected}))});
      if(req.method==='POST'&&parts[3]==='join'){
        const b=await body(req);const limits=gameLimits(room.gameId);if(b.gameId&&b.gameId!==room.gameId)return fail(res,409,'Wrong game for this room');if(room.session.status!=='lobby')return fail(res,409,'Game already started');if(room.session.players.length>=limits.max)return fail(res,409,`Room is full (${limits.max} players max)`);if(!b.player||typeof b.player.name!=='string')return fail(res,400,'Player name is required');const id=randomUUID();const p:Player={id,profileId:safeText(b.player.profileId,100)||undefined,name:safeText(b.player.name,32)||'Player',kind:'remote',seat:room.session.players.length,connected:true};room.session.players.push(p);room.session.updatedAt=Date.now();emit(room,{type:'session',session:room.session});return reply(res,200,publicInfo(room,id));
      }
      if(req.method==='POST'&&parts[3]==='start'){
        const b=await body(req);const limits=gameLimits(room.gameId);if(b.clientId!==room.hostId)return fail(res,403,'Only host can start');if(room.session.status!=='lobby')return fail(res,409,'Game already started');const known=new Set(room.session.players.map(p=>p.id));const bots=Array.isArray(b.bots)?b.bots.slice(0,limits.max-room.session.players.length):[];for(const bot of bots){if(!bot||bot.kind!=='bot'||typeof bot.id!=='string'||typeof bot.name!=='string')continue;const botId=safeText(bot.id,100);if(!botId||known.has(botId))continue;known.add(botId);const difficulty=['easy','medium','hard'].includes(bot.difficulty)?bot.difficulty:'medium';const personality=['friendly','rival','strategist','quiet'].includes(bot.personality)?bot.personality:'friendly';room.session.players.push({id:botId,name:safeText(bot.name,32)||'Bot',kind:'bot',seat:room.session.players.length,connected:true,difficulty,personality});}if(room.session.players.length>limits.max)return fail(res,409,`Room is full (${limits.max} players max)`);if(room.session.players.length<limits.min)return fail(res,409,`Need at least ${limits.min} players to start`);if(typeof b.boardId==='string'&&b.boardId.length<=80)room.session.boardId=b.boardId;room.session.status='playing';room.session.updatedAt=Date.now();emit(room,{type:'session',session:room.session});return reply(res,200,{ok:true,sequence:room.sequence});
      }
      if(req.method==='POST'&&parts[3]==='session'){
        const b=await body(req);if(b.clientId!==room.hostId)return fail(res,403,'Only host can publish session');if(!b.session||b.session.gameId!==room.gameId||!Array.isArray(b.session.players)||!Array.isArray(b.session.history))return fail(res,400,'Invalid session snapshot');
        if(Buffer.byteLength(JSON.stringify(b.session),'utf8')>700_000)return fail(res,413,'Session snapshot is too large');
        const limits=gameLimits(room.gameId);if(b.session.players.length>limits.max)return fail(res,409,'Session has too many players');
        const memberIds=new Set(room.session.players.map(p=>p.id));if(b.session.players.length!==memberIds.size||b.session.players.some((p:Player)=>!memberIds.has(p?.id)))return fail(res,409,'Session player list does not match room membership');
        if(b.session.history.length>1500)return fail(res,413,'Match history is too large; start a new match to continue');
        // The host owns game state, but the relay owns membership and identity fields.
        const canonicalPlayers=room.session.players.map((member,index)=>{const submitted=b.session.players.find((p:Player)=>p.id===member.id);return {...submitted,id:member.id,profileId:member.profileId,name:member.name,kind:member.kind,seat:index,connected:member.connected};});
        const nextSession:Session={...b.session,players:canonicalPlayers,history:b.session.history.slice(-1500),updatedAt:Date.now()};
        const nextViews:Record<string,Session>={};if(b.views&&typeof b.views==='object'){for(const [playerId,view] of Object.entries(b.views) as [string,Session][]){if(memberIds.has(playerId)&&view&&view.gameId===room.gameId&&Array.isArray(view.players)&&Array.isArray(view.history)&&view.players.length<=limits.max)nextViews[playerId]=playerId===room.hostId?{...nextSession,players:canonicalPlayers.map((member)=>({...member})),history:[...nextSession.history]}:{...view,players:canonicalPlayers.map((member)=>({...member})),history:(view.history??[]).slice(-1500).map((move:any)=>({type:safeText(move?.type,40),player:safeText(move?.player,100),ts:Number(move?.ts)||Date.now(),payload:{},summary:safeText(move?.summary,240)}))};}}
        if(PRIVATE_STATE_GAMES.has(room.gameId)&&!nextSession.players.every(player=>nextViews[player.id]))return fail(res,409,'Private-information protection is missing for one or more players');
        room.session=nextSession;room.sessionViews=nextViews;const ev=emit(room,{type:'session',session:room.session},room.sessionViews);return reply(res,200,{ok:true,sequence:ev.sequence});
      }
      if(req.method==='POST'&&parts[3]==='message'){
        const b=await body(req);const clientId=safeText(b.clientId,100);if(!room.session.players.some(p=>p.id===clientId))return fail(res,403,'Unknown player');const m=b.message;if(!m||typeof m.type!=='string')return fail(res,400,'Invalid message');const requestId=safeText(m.requestId,100);if(requestId){const cached=room.requests.get(clientId)?.get(requestId);if(cached)return reply(res,200,{ok:true,...cached,deduplicated:true});}if(m.type==='chat'||m.type==='emote'){const now=Date.now();const recent=(room.messageTimes.get(clientId)??[]).filter(ts=>now-ts<5000);if(recent.length>=12)return fail(res,429,'You are sending messages too quickly');recent.push(now);room.messageTimes.set(clientId,recent);}
        let normalized:any;
        if(m.type==='move.accepted'){
          if(clientId!==room.hostId)return fail(res,403,'Only the room coordinator can publish accepted moves');if(!m.move||!room.session.players.some(p=>p.id===m.move.player)||typeof m.move.type!=='string')return fail(res,400,'Invalid accepted move');normalized={type:'move.accepted',move:m.move,senderId:clientId};
        }else if(m.type==='move.rejected'){
          if(clientId!==room.hostId)return fail(res,403,'Only the room coordinator can reject a move');const target=safeText(m.player,100);if(!room.session.players.some(p=>p.id===target))return fail(res,400,'Unknown rejected-move recipient');normalized={type:'move.rejected',player:target,message:safeText(m.message,160)||'Move rejected',senderId:clientId};
        }else if(m.type==='move'){
          if(room.session.status!=='playing')return fail(res,409,'Match is not active');if(room.hostId===clientId)return fail(res,409,'Host must dispatch its own moves locally');if(!m.move||m.move.player!==clientId||typeof m.move.type!=='string')return fail(res,403,'Move sender does not match the connected player');if(!room.clients.has(room.hostId))return fail(res,503,'Room coordinator is offline; reconnect the host before moving');if(Buffer.byteLength(JSON.stringify(m.move),'utf8')>16_000)return fail(res,413,'Move payload is too large');normalized={type:'move',move:{...m.move,player:clientId},senderId:clientId};
        }else if(m.type==='chat'){
          const text=safeText(m.text,200);if(!text)return fail(res,400,'Message cannot be empty');const actor=safeText(m.player,100);const botActor=actor&&room.session.players.some(p=>p.id===actor&&p.kind==='bot');if(actor&&actor!==clientId&&!(clientId===room.hostId&&botActor))return fail(res,403,'Cannot speak as another player');normalized={type:'chat',player:botActor?actor:clientId,text,ts:Date.now(),presetId:safeText(m.presetId,40)||undefined,senderId:clientId};
        }else if(m.type==='emote'){
          const emoji=safeText(m.emoji,12);if(!emoji||Array.from(emoji).length>4)return fail(res,400,'Invalid reaction');normalized={type:'emote',player:clientId,emoji,ts:Date.now(),senderId:clientId};
        }else if(m.type==='resync_request'){
          const after=Math.max(0,Number(m.afterSequence)||0);const oldest=room.events[0]?.sequence??room.sequence;if(after>=oldest-1){const target=room.clients.get(clientId);if(target)replayEvents(target,room,clientId,after);}else{const snapshot={sequence:room.sequence,message:{type:'session',version:1,sequence:room.sequence,eventId:`${room.code}:${room.sequence}`,session:room.session},at:Date.now(),privateState:PRIVATE_STATE_GAMES.has(room.gameId),views:room.sessionViews};const target=room.clients.get(clientId);if(target)send(target,{...snapshot,message:{...snapshot.message,session:room.sessionViews[clientId]??room.session}},clientId);}return reply(res,200,{ok:true,sequence:room.sequence});
        }else if(m.type==='join'||m.type==='leave'||m.type==='host')return fail(res,403,'Room membership events are server-controlled');
        else return fail(res,400,'Unsupported message type');
        if(m.type==='move'||m.type==='move.rejected'){
          const targetId=m.type==='move'?room.hostId:String(normalized.player);const target=room.clients.get(targetId);
          const direct={...normalized,version:1,sequence:0,eventId:`${room.code}:direct:${requestId||randomUUID()}`};
          if(target&&!target.destroyed)target.write(`data: ${JSON.stringify(direct)}\n\n`);
          const ack={sequence:room.sequence,eventId:direct.eventId};if(requestId){let cache=room.requests.get(clientId);if(!cache){cache=new Map();room.requests.set(clientId,cache);}cache.set(requestId,ack);if(cache.size>500)cache.delete(cache.keys().next().value!);}return reply(res,200,{ok:true,...ack});
        }
        const event=emit(room,normalized);const ack={sequence:event.sequence,eventId:event.message.eventId};if(requestId){let cache=room.requests.get(clientId);if(!cache){cache=new Map();room.requests.set(clientId,cache);}cache.set(requestId,ack);if(cache.size>500)cache.delete(cache.keys().next().value!);}return reply(res,200,{ok:true,...ack});
      }
    }
    reply(res,404,{error:'Not found'});
  }catch(e){reply(res,500,{error:e instanceof Error?e.message:'Server error'});}
});
function arg(name:string,fallback:string){const i=process.argv.indexOf(name);return i>=0&&process.argv[i+1]?process.argv[i+1]:fallback;}
const port=Number(arg('--port',process.env.PORT||'8787'));const host=arg('--host','0.0.0.0');server.listen(port,host,()=>console.log(`HyeArcade LAN server listening on http://${host}:${port}`));
