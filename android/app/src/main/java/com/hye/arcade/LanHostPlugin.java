package com.hye.arcade;

import android.net.wifi.WifiManager;
import android.util.Log;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.BufferedInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Enumeration;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** Embedded Android LAN relay matching the Hye Arcade /api/rooms protocol. */
@CapacitorPlugin(name = "LanHost")
public class LanHostPlugin extends Plugin {
    private static final String TAG = "HyeArcadeLan";
    private static final int DISCOVERY_PORT = 47872;
    private static final int BODY_LIMIT = 1_000_000;
    private static final Set<String> PRIVATE_GAMES = new HashSet<>(java.util.Arrays.asList(
            "crazy-eights", "uno", "whot", "monopoly-deal", "scrabble", "mahjong", "treasure-hunt", "scramble", "monopoly"));
    private final Map<String, Room> rooms = new ConcurrentHashMap<>();
    private final ExecutorService workers = Executors.newCachedThreadPool();
    private volatile ServerSocket serverSocket;
    private volatile Thread acceptThread;
    private volatile boolean running;
    private volatile int serverPort = 8787;
    private volatile DatagramSocket discoverySocket;
    private volatile Thread discoveryThread;
    private WifiManager.MulticastLock multicastLock;

    private static class SseClient {
        final String id;
        final Socket socket;
        final OutputStream output;
        volatile boolean open = true;
        SseClient(String id, Socket socket, OutputStream output) { this.id=id; this.socket=socket; this.output=output; }
        synchronized void write(String text) throws IOException {
            if (!open) throw new IOException("SSE client closed");
            output.write(text.getBytes(StandardCharsets.UTF_8)); output.flush();
        }
        void close() { open=false; try { socket.close(); } catch (Exception ignored) {} }
    }
    private static class Room {
        final String code, gameId;
        volatile String hostId;
        volatile JSONObject session;
        volatile JSONObject views = new JSONObject();
        final Map<String,SseClient> clients = new ConcurrentHashMap<>();
        final List<JSONObject> events = Collections.synchronizedList(new ArrayList<>());
        final Map<String,Set<String>> requests = new ConcurrentHashMap<>();
        final Map<String,List<Long>> messageTimes = new ConcurrentHashMap<>();
        volatile int sequence = 0;
        Room(String code,String gameId,String hostId,JSONObject session){this.code=code;this.gameId=gameId;this.hostId=hostId;this.session=session;}
    }

    @PluginMethod
    public void start(PluginCall call) {
        try {
            ensureServer();
            JSObject result = new JSObject();
            result.put("baseUrl", "http://" + localAddress() + ":" + serverPort);
            result.put("port", serverPort);
            call.resolve(result);
        } catch (Exception e) { call.reject("Could not start the local LAN server: " + e.getMessage(), e); }
    }

    @PluginMethod
    public synchronized void stop(PluginCall call) {
        running = false;
        for (Room room : rooms.values()) for (SseClient client : room.clients.values()) client.close();
        rooms.clear();
        try { if (discoverySocket != null) discoverySocket.close(); } catch (Exception ignored) {}
        try { if (serverSocket != null) serverSocket.close(); } catch (Exception ignored) {}
        if (multicastLock != null) { try { if (multicastLock.isHeld()) multicastLock.release(); } catch (Exception ignored) {} multicastLock = null; }
        serverSocket = null; discoverySocket = null;
        call.resolve();
    }

    @PluginMethod
    public void discover(PluginCall call) {
        workers.execute(() -> {
            JSONArray hosts = new JSONArray();
            Set<String> seen = new HashSet<>();
            DatagramSocket socket = null;
            try {
                socket = new DatagramSocket(); socket.setBroadcast(true); socket.setSoTimeout(180);
                byte[] request = "HYE_ARCADE_DISCOVER".getBytes(StandardCharsets.UTF_8);
                for (InetAddress broadcast : broadcastAddresses()) {
                    try { socket.send(new DatagramPacket(request, request.length, broadcast, DISCOVERY_PORT)); } catch (Exception ignored) {}
                }
                long until = System.currentTimeMillis() + 1250;
                byte[] buffer = new byte[1024];
                while (System.currentTimeMillis() < until) {
                    try {
                        DatagramPacket packet = new DatagramPacket(buffer, buffer.length); socket.receive(packet);
                        JSONObject found = new JSONObject(new String(packet.getData(), packet.getOffset(), packet.getLength(), StandardCharsets.UTF_8));
                        String base = found.optString("baseUrl", "");
                        if (!base.isEmpty() && seen.add(base)) { JSONObject item = new JSONObject(); item.put("name", found.optString("name", "Hye Arcade")); item.put("baseUrl", base); hosts.put(item); }
                    } catch (java.net.SocketTimeoutException ignored) { }
                }
            } catch (Exception e) { Log.w(TAG, "LAN discovery failed", e); }
            finally { if (socket != null) socket.close(); }
            JSObject result = new JSObject();
            result.put("hosts", hosts); call.resolve(result);
        });
    }

    private synchronized void ensureServer() throws IOException {
        if (running && serverSocket != null && !serverSocket.isClosed()) return;
        IOException last = null;
        for (int port = 8787; port <= 8797; port++) {
            try { serverSocket = new ServerSocket(port); serverPort = port; break; }
            catch (IOException e) { last=e; }
        }
        if (serverSocket == null || serverSocket.isClosed()) throw last != null ? last : new IOException("No free LAN port");
        running = true;
        acquireMulticastLock();
        startDiscoveryListener();
        acceptThread = new Thread(() -> {
            while (running && serverSocket != null && !serverSocket.isClosed()) {
                try { Socket client = serverSocket.accept(); client.setTcpNoDelay(true); workers.execute(() -> handle(client)); }
                catch (IOException e) { if (running) Log.w(TAG, "LAN accept failed", e); }
            }
        }, "HyeArcade-Lan-Accept");
        acceptThread.setDaemon(true); acceptThread.start();
    }

    private void startDiscoveryListener() {
        try {
            discoverySocket = new DatagramSocket(null); discoverySocket.setReuseAddress(true); discoverySocket.bind(new java.net.InetSocketAddress(DISCOVERY_PORT));
            discoveryThread = new Thread(() -> {
                byte[] buffer = new byte[256];
                while (running && discoverySocket != null && !discoverySocket.isClosed()) {
                    try {
                        DatagramPacket packet = new DatagramPacket(buffer, buffer.length); discoverySocket.receive(packet);
                        String message = new String(packet.getData(), packet.getOffset(), packet.getLength(), StandardCharsets.UTF_8);
                        if (!message.startsWith("HYE_ARCADE_DISCOVER")) continue;
                        JSONObject response = new JSONObject(); response.put("name", "Hye Arcade"); response.put("baseUrl", "http://" + localAddress() + ":" + serverPort);
                        byte[] bytes = response.toString().getBytes(StandardCharsets.UTF_8);
                        discoverySocket.send(new DatagramPacket(bytes, bytes.length, packet.getAddress(), packet.getPort()));
                    } catch (Exception e) { if (running) Log.w(TAG, "Discovery packet failed", e); }
                }
            }, "HyeArcade-Lan-Discovery");
            discoveryThread.setDaemon(true); discoveryThread.start();
        } catch (Exception e) { Log.w(TAG, "Could not start UDP discovery", e); }
    }

    private void acquireMulticastLock() {
        try {
            WifiManager wifi = (WifiManager) getContext().getApplicationContext().getSystemService(android.content.Context.WIFI_SERVICE);
            if (wifi != null) { multicastLock = wifi.createMulticastLock("HyeArcadeLanDiscovery"); multicastLock.setReferenceCounted(false); if (!multicastLock.isHeld()) multicastLock.acquire(); }
        } catch (Exception e) { Log.w(TAG, "Multicast lock unavailable", e); }
    }

    private String localAddress() {
        String fallback = "127.0.0.1";
        try {
            Enumeration<NetworkInterface> interfaces = NetworkInterface.getNetworkInterfaces();
            List<InetAddress> candidates = new ArrayList<>();
            while (interfaces.hasMoreElements()) {
                NetworkInterface ni = interfaces.nextElement();
                if (!ni.isUp() || ni.isLoopback()) continue;
                Enumeration<InetAddress> addresses = ni.getInetAddresses();
                while (addresses.hasMoreElements()) {
                    InetAddress a = addresses.nextElement();
                    if (a instanceof Inet4Address && !a.isLoopbackAddress()) {
                        if (a.isSiteLocalAddress()) {
                            String n = ni.getName().toLowerCase(Locale.ROOT);
                            if (n.contains("wlan") || n.contains("wifi") || n.contains("ap")) return a.getHostAddress();
                            candidates.add(a);
                        }
                    }
                }
            }
            if (!candidates.isEmpty()) return candidates.get(0).getHostAddress();
        } catch (Exception ignored) {}
        return fallback;
    }

    private List<InetAddress> broadcastAddresses() {
        List<InetAddress> result = new ArrayList<>();
        try {
            Enumeration<NetworkInterface> interfaces = NetworkInterface.getNetworkInterfaces();
            while (interfaces.hasMoreElements()) {
                NetworkInterface ni = interfaces.nextElement(); if (!ni.isUp() || ni.isLoopback()) continue;
                for (java.net.InterfaceAddress ia : ni.getInterfaceAddresses()) if (ia.getBroadcast() != null) result.add(ia.getBroadcast());
            }
        } catch (Exception ignored) {}
        try { result.add(InetAddress.getByName("255.255.255.255")); } catch (Exception ignored) {}
        return result;
    }

    private void handle(Socket socket) {
        try {
            BufferedInputStream input = new BufferedInputStream(socket.getInputStream());
            String requestLine = readLine(input); if (requestLine == null || requestLine.isEmpty()) { socket.close(); return; }
            String[] request = requestLine.split(" "); if (request.length < 2) { respond(socket,400,error("Bad request")); return; }
            String method=request[0], target=request[1];
            Map<String,String> headers=new HashMap<>(); String line;
            while ((line=readLine(input)) != null && !line.isEmpty()) { int split=line.indexOf(':'); if(split>0) headers.put(line.substring(0,split).trim().toLowerCase(Locale.ROOT),line.substring(split+1).trim()); }
            int length=0; try { length=Math.min(BODY_LIMIT,Integer.parseInt(headers.getOrDefault("content-length","0"))); } catch(Exception ignored) {}
            byte[] body=new byte[length]; int offset=0; while(offset<length){int n=input.read(body,offset,length-offset);if(n<0)break;offset+=n;}
            JSONObject payload = body.length==0?new JSONObject():new JSONObject(new String(body,0,offset,StandardCharsets.UTF_8));
            String path=target.split("\\?",2)[0]; Map<String,String> query=parseQuery(target.contains("?")?target.substring(target.indexOf('?')+1):"");
            if("OPTIONS".equals(method)){ respondRaw(socket,204,"", "text/plain", true); return; }
            if("POST".equals(method) && "/api/rooms".equals(path)){ createRoom(socket,payload); return; }
            String[] parts=path.split("/");
            if(parts.length>=4 && "api".equals(parts[1]) && "rooms".equals(parts[2])){
                Room room=rooms.get(parts[3].toUpperCase(Locale.ROOT)); if(room==null){respond(socket,404,error("Room not found"));return;}
                String endpoint=parts.length>=5?parts[4]:"";
                if("GET".equals(method)&&"events".equals(endpoint)){streamEvents(socket,room,query,headers);return;}
                if("GET".equals(method)&&endpoint.isEmpty()){respond(socket,200,publicRoomInfo(room));return;}
                if("POST".equals(method)&&"join".equals(endpoint)){joinRoom(socket,room,payload);return;}
                if("POST".equals(method)&&"start".equals(endpoint)){startRoom(socket,room,payload);return;}
                if("POST".equals(method)&&"session".equals(endpoint)){publishSession(socket,room,payload);return;}
                if("POST".equals(method)&&"message".equals(endpoint)){message(socket,room,payload);return;}
            }
            respond(socket,404,error("Not found"));
        } catch (Exception e) { Log.w(TAG,"HTTP request failed",e); try { respond(socket,500,error(e.getMessage()==null?"Server error":e.getMessage())); } catch(Exception ignored){} }
    }

    private static String readLine(BufferedInputStream in) throws IOException {
        ByteArrayOutputStream out=new ByteArrayOutputStream(); int b;
        while((b=in.read())!=-1){if(b=='\n')break;if(b!='\r')out.write(b);if(out.size()>8192)throw new IOException("Header too long");}
        if(b==-1&&out.size()==0)return null;return out.toString("UTF-8");
    }
    private Map<String,String> parseQuery(String q){Map<String,String> out=new HashMap<>();for(String pair:q.split("&")){if(pair.isEmpty())continue;String[] kv=pair.split("=",2);try{out.put(URLDecoder.decode(kv[0],"UTF-8"),kv.length>1?URLDecoder.decode(kv[1],"UTF-8"):"");}catch(Exception ignored){}}return out;}
    private JSONObject error(String message){JSONObject o=new JSONObject();try{o.put("error",message==null?"Server error":message);}catch(Exception ignored){}return o;}
    private void respond(Socket socket,int status,JSONObject body)throws IOException{respondRaw(socket,status,body.toString(),"application/json; charset=utf-8",false);}
    private void respondRaw(Socket socket,int status,String body,String type,boolean noBody)throws IOException{
        byte[] bytes=body.getBytes(StandardCharsets.UTF_8);OutputStream out=socket.getOutputStream();String label=status==200?"OK":status==204?"No Content":status==400?"Bad Request":status==403?"Forbidden":status==404?"Not Found":status==409?"Conflict":status==413?"Payload Too Large":status==429?"Too Many Requests":status==503?"Service Unavailable":"Error";
        String head="HTTP/1.1 "+status+" "+label+"\r\nContent-Type: "+type+"\r\nContent-Length: "+(noBody?0:bytes.length)+"\r\nConnection: close\r\nAccess-Control-Allow-Origin: *\r\nAccess-Control-Allow-Headers: content-type,last-event-id\r\nAccess-Control-Allow-Methods: GET,POST,OPTIONS\r\nAccess-Control-Allow-Private-Network: true\r\nCache-Control: no-cache\r\n\r\n";
        out.write(head.getBytes(StandardCharsets.UTF_8));if(!noBody)out.write(bytes);out.flush();socket.close();
    }
    private JSONObject player(String id,String profileId,String name,String kind,int seat){JSONObject p=new JSONObject();try{p.put("id",id);if(profileId!=null&&!profileId.isEmpty())p.put("profileId",profileId);p.put("name",name);p.put("kind",kind);p.put("seat",seat);p.put("connected",true);}catch(Exception ignored){}return p;}
    private JSONObject createSession(String gameId,JSONArray players){JSONObject s=new JSONObject();long now=System.currentTimeMillis();try{s.put("id",UUID.randomUUID().toString());s.put("gameId",gameId);s.put("players",players);s.put("state",JSONObject.NULL);s.put("history",new JSONArray());s.put("status","lobby");s.put("result",JSONObject.NULL);s.put("createdAt",now);s.put("updatedAt",now);}catch(Exception ignored){}return s;}
    private int maxPlayers(String id){switch(id){case"whot":return 6;case"monopoly":return 6;case"monopoly-deal":return 5;case"ludo":case"snake-ladder":case"crazy-eights":case"uno":case"scrabble":case"mahjong-solitaire":case"scramble":case"treasure-hunt":return 4;case"mahjong":return 4;case"solitaire":case"vita-mahjong":return 1;default:return 2;}}
    private int minPlayers(String id){return "mahjong".equals(id)?4:("solitaire".equals(id)||"mahjong-solitaire".equals(id)||"vita-mahjong".equals(id)||"scramble".equals(id)||"treasure-hunt".equals(id))?1:2;}
    private void createRoom(Socket socket,JSONObject body)throws Exception{
        String game=body.optString("gameId","");JSONObject supplied=body.optJSONObject("player");if(game.isEmpty()||supplied==null){respond(socket,400,error("gameId and player are required"));return;}
        String code;SecureRandom random=new SecureRandom();do{byte[] bytes=new byte[3];random.nextBytes(bytes);StringBuilder b=new StringBuilder();for(byte x:bytes)b.append(String.format(Locale.ROOT,"%02X",x));code=b.toString();}while(rooms.containsKey(code));
        String id=UUID.randomUUID().toString();JSONArray players=new JSONArray();players.put(player(id,supplied.optString("profileId",""),safe(supplied.optString("name","Player"),32),"human",0));JSONObject session=createSession(game,players);Room room=new Room(code,game,id,session);rooms.put(code,room);respond(socket,200,publicInfo(room,id));
    }
    private String safe(String value,int max){if(value==null)return"";String v=value.trim();return v.length()>max?v.substring(0,max):v;}
    private JSONObject publicInfo(Room room,String id)throws JSONException{JSONObject o=new JSONObject();o.put("code",room.code);o.put("clientId",id);o.put("session",personalized(room,id));o.put("host",room.hostId.equals(id));o.put("baseUrl","http://"+localAddress()+":"+serverPort);o.put("sequence",room.sequence);return o;}
    private JSONObject publicRoomInfo(Room room)throws JSONException{JSONObject o=new JSONObject();o.put("code",room.code);o.put("gameId",room.gameId);o.put("status",room.session.optString("status","lobby"));o.put("hostOnline",room.clients.containsKey(room.hostId));JSONArray players=room.session.optJSONArray("players");JSONArray names=new JSONArray();if(players!=null)for(int i=0;i<players.length();i++){JSONObject p=players.optJSONObject(i);JSONObject x=new JSONObject();x.put("name",p.optString("name","Player"));x.put("seat",p.optInt("seat",i));x.put("connected",p.optBoolean("connected",false));names.put(x);}o.put("players",names);return o;}
    private JSONObject personalized(Room room,String id){JSONObject view=room.views.optJSONObject(id);if(view!=null)return view;if(PRIVATE_GAMES.contains(room.gameId)){try{JSONObject hidden=new JSONObject(room.session.toString());hidden.put("state",JSONObject.NULL);hidden.remove("initialState");hidden.put("history",new JSONArray());return hidden;}catch(Exception ignored){}}return room.session;}
    private void joinRoom(Socket socket,Room room,JSONObject body)throws Exception{
        if(!body.optString("gameId",room.gameId).equals(room.gameId)){respond(socket,409,error("Wrong game for this room"));return;}if(!"lobby".equals(room.session.optString("status"))){respond(socket,409,error("Game already started"));return;}
        JSONArray players=room.session.optJSONArray("players");if(players.length()>=maxPlayers(room.gameId)){respond(socket,409,error("Room is full ("+maxPlayers(room.gameId)+" players max)"));return;}JSONObject supplied=body.optJSONObject("player");if(supplied==null){respond(socket,400,error("Player is required"));return;}
        String id=UUID.randomUUID().toString();players.put(player(id,supplied.optString("profileId",""),safe(supplied.optString("name","Player"),32),"remote",players.length()));room.session.put("updatedAt",System.currentTimeMillis());emit(room,event("session",new JSONObject().put("session",room.session)),null);respond(socket,200,publicInfo(room,id));
    }
    private void startRoom(Socket socket,Room room,JSONObject body)throws Exception{
        if(!room.hostId.equals(body.optString("clientId"))){respond(socket,403,error("Only host can start"));return;}if(!"lobby".equals(room.session.optString("status"))){respond(socket,409,error("Game already started"));return;}JSONArray roomPlayers=room.session.optJSONArray("players"),bots=body.optJSONArray("bots");Set<String> known=new HashSet<>();for(int i=0;i<roomPlayers.length();i++)known.add(roomPlayers.optJSONObject(i).optString("id"));int limit=maxPlayers(room.gameId);if(bots!=null)for(int i=0;i<bots.length()&&roomPlayers.length()<limit;i++){JSONObject bot=bots.optJSONObject(i);if(bot==null||!"bot".equals(bot.optString("kind")))continue;String botId=safe(bot.optString("id",""),100);if(botId.isEmpty()||known.contains(botId))continue;JSONObject b=new JSONObject();b.put("id",botId);b.put("name",safe(bot.optString("name","Bot"),32));b.put("kind","bot");b.put("seat",roomPlayers.length());b.put("connected",true);String difficulty=bot.optString("difficulty","medium");b.put("difficulty",java.util.Arrays.asList("easy","medium","hard").contains(difficulty)?difficulty:"medium");String personality=bot.optString("personality","friendly");b.put("personality",java.util.Arrays.asList("friendly","rival","strategist","quiet").contains(personality)?personality:"friendly");roomPlayers.put(b);known.add(botId);}if(roomPlayers.length()>limit){respond(socket,409,error("Room is full"));return;}if(roomPlayers.length()<minPlayers(room.gameId)){respond(socket,409,error("Not enough players"));return;}if(body.has("boardId")&&!body.isNull("boardId"))room.session.put("boardId",safe(body.optString("boardId"),80));room.session.put("status","playing");room.session.put("updatedAt",System.currentTimeMillis());emit(room,event("session",new JSONObject().put("session",room.session)),null);JSONObject ok=new JSONObject();ok.put("ok",true);ok.put("sequence",room.sequence);respond(socket,200,ok);
    }
    private void publishSession(Socket socket,Room room,JSONObject body)throws Exception{
        if(!room.hostId.equals(body.optString("clientId"))){respond(socket,403,error("Only host can publish session"));return;}JSONObject submitted=body.optJSONObject("session");if(submitted==null||!room.gameId.equals(submitted.optString("gameId"))||submitted.optJSONArray("players")==null||submitted.optJSONArray("history")==null){respond(socket,400,error("Invalid session snapshot"));return;}if(submitted.toString().getBytes(StandardCharsets.UTF_8).length>700_000){respond(socket,413,error("Session snapshot too large"));return;}
        JSONArray members=room.session.optJSONArray("players"), incoming=submitted.optJSONArray("players");if(incoming.length()!=members.length()||incoming.length()>maxPlayers(room.gameId)){respond(socket,409,error("Session players do not match room"));return;}Set<String> memberIds=new HashSet<>();for(int i=0;i<members.length();i++)memberIds.add(members.getJSONObject(i).optString("id"));for(int i=0;i<incoming.length();i++)if(!memberIds.contains(incoming.getJSONObject(i).optString("id"))){respond(socket,409,error("Unknown session player"));return;}
        JSONObject views=body.optJSONObject("views");if(PRIVATE_GAMES.contains(room.gameId)){if(views==null){respond(socket,409,error("Private-information protection is missing"));return;}for(String id:memberIds)if(!views.has(id)){respond(socket,409,error("Private-information view missing for a player"));return;}}
        JSONArray canonical=new JSONArray();for(int i=0;i<members.length();i++){JSONObject member=members.getJSONObject(i);JSONObject update=findPlayer(incoming,member.optString("id"));JSONObject p=new JSONObject(update.toString());p.put("id",member.optString("id"));p.put("name",member.optString("name"));p.put("kind",member.optString("kind"));p.put("profileId",member.optString("profileId",JSONObject.NULL==member.opt("profileId")?"":member.optString("profileId")));p.put("seat",i);p.put("connected",member.optBoolean("connected",false));canonical.put(p);}submitted.put("players",canonical);submitted.put("history",trimArray(submitted.optJSONArray("history"),1500));submitted.put("updatedAt",System.currentTimeMillis());room.session=submitted;room.views=views==null?new JSONObject():new JSONObject(views.toString());
        for(String playerId:memberIds){JSONObject view=room.views.optJSONObject(playerId);if(view==null)continue;view.put("players",new JSONArray(canonical.toString()));if(playerId.equals(room.hostId)){view.put("history",new JSONArray(room.session.optJSONArray("history").toString()));room.views.put(playerId,view);continue;}JSONArray safeHistory=new JSONArray();JSONArray source=view.optJSONArray("history");if(source!=null)for(int hi=Math.max(0,source.length()-1500);hi<source.length();hi++){JSONObject item=source.optJSONObject(hi);if(item==null)continue;JSONObject safeMove=new JSONObject();safeMove.put("type",safe(item.optString("type","move"),40));safeMove.put("player",safe(item.optString("player",""),100));safeMove.put("ts",item.optLong("ts",System.currentTimeMillis()));safeMove.put("payload",new JSONObject());safeMove.put("summary",safe(item.optString("summary","Played a move"),240));safeHistory.put(safeMove);}view.put("history",safeHistory);room.views.put(playerId,view);}
        emit(room,event("session",new JSONObject().put("session",room.session)),room.views);JSONObject ok=new JSONObject();ok.put("ok",true);ok.put("sequence",room.sequence);respond(socket,200,ok);
    }
    private JSONObject findPlayer(JSONArray a,String id)throws JSONException{for(int i=0;i<a.length();i++){JSONObject p=a.getJSONObject(i);if(id.equals(p.optString("id")))return p;}return new JSONObject();}
    private JSONArray trimArray(JSONArray a,int max){JSONArray out=new JSONArray();if(a==null)return out;for(int i=Math.max(0,a.length()-max);i<a.length();i++)out.put(a.opt(i));return out;}
    private void streamEvents(Socket socket,Room room,Map<String,String> query,Map<String,String> headers)throws Exception{
        String id=query.getOrDefault("clientId","");boolean found=false;JSONArray players=room.session.optJSONArray("players");for(int i=0;i<players.length();i++)if(id.equals(players.getJSONObject(i).optString("id")))found=true;if(!found){respond(socket,403,error("Unknown player"));return;}
        OutputStream out=socket.getOutputStream();String header="HTTP/1.1 200 OK\r\nContent-Type: text/event-stream; charset=utf-8\r\nCache-Control: no-cache\r\nConnection: keep-alive\r\nAccess-Control-Allow-Origin: *\r\nAccess-Control-Allow-Headers: content-type,last-event-id\r\nAccess-Control-Allow-Private-Network: true\r\n\r\n: connected\n\n";out.write(header.getBytes(StandardCharsets.UTF_8));out.flush();SseClient client=new SseClient(id,socket,out);SseClient old=room.clients.put(id,client);if(old!=null&&old!=client)old.close();
        boolean wasOffline=false;JSONArray roomPlayers=room.session.optJSONArray("players");for(int i=0;i<roomPlayers.length();i++){JSONObject p=roomPlayers.optJSONObject(i);if(id.equals(p.optString("id"))){wasOffline=!p.optBoolean("connected",true);p.put("connected",true);break;}}if(wasOffline)emit(room,event("session",new JSONObject().put("session",room.session)),room.views);
        int last=0;try{last=Integer.parseInt(headers.getOrDefault("last-event-id",query.getOrDefault("afterSequence","0")));}catch(Exception ignored){}
        if(last>0)replay(room,client,last);else sendSnapshot(room,client);
        try{while(running&&client.open&&!socket.isClosed()){Thread.sleep(15000);client.write(": keep-alive\n\n");}}catch(Exception ignored){}finally{client.close();room.clients.remove(id,client);workers.execute(()->{try{Thread.sleep(3500);if(room.clients.containsKey(id))return;boolean changed=false;JSONArray ps=room.session.optJSONArray("players");for(int i=0;i<ps.length();i++){JSONObject p=ps.optJSONObject(i);if(id.equals(p.optString("id"))&&p.optBoolean("connected",true)){p.put("connected",false);changed=true;break;}}if(!changed)return;if(room.hostId.equals(id)&&!PRIVATE_GAMES.contains(room.gameId)){String next=null;for(int i=0;i<ps.length();i++){JSONObject p=ps.optJSONObject(i);String candidate=p.optString("id");if(!id.equals(candidate)&&p.optBoolean("connected",false)){next=candidate;break;}}if(next!=null){room.hostId=next;emit(room,event("host",new JSONObject().put("player",next)),null);}}emit(room,event("session",new JSONObject().put("session",room.session)),room.views);}catch(Exception ignored){}});}
    }
    private JSONObject event(String type,JSONObject data)throws JSONException{JSONObject e=new JSONObject(data.toString());e.put("type",type);return e;}
    private JSONObject enrich(Room room,JSONObject message)throws JSONException{JSONObject e=new JSONObject(message.toString());int seq=++room.sequence;e.put("version",1);e.put("sequence",seq);e.put("eventId",room.code+":"+seq);if(!e.has("senderId")){String sender=e.optString("player","");if(sender.isEmpty()&&e.optJSONObject("move")!=null)sender=e.optJSONObject("move").optString("player","");if(!sender.isEmpty())e.put("senderId",sender);}return e;}
    private synchronized void emit(Room room,JSONObject message,JSONObject views)throws JSONException{
        JSONObject e=enrich(room,message);if("session".equals(e.optString("type"))){synchronized(room.events){Iterator<JSONObject> it=room.events.iterator();while(it.hasNext())if("session".equals(it.next().optString("type")))it.remove();}}
        room.events.add(e);while(room.events.size()>500)room.events.remove(0);for(SseClient c:room.clients.values())sendEvent(room,c,e,views);
    }
    private void sendEvent(Room room,SseClient client,JSONObject event,JSONObject views){try{if("move".equals(event.optString("type"))&&!client.id.equals(room.hostId))return;if("move.rejected".equals(event.optString("type"))&&!client.id.equals(event.optString("player")))return;JSONObject outgoing=new JSONObject(event.toString());if("session".equals(outgoing.optString("type"))){JSONObject data=outgoing.optJSONObject("session");JSONObject view=views==null?room.views.optJSONObject(client.id):views.optJSONObject(client.id);if(view!=null)outgoing.put("session",view);else if(PRIVATE_GAMES.contains(room.gameId)&&data!=null){JSONObject safe=new JSONObject(data.toString());safe.put("state",JSONObject.NULL);safe.remove("initialState");safe.put("history",new JSONArray());outgoing.put("session",safe);}}client.write("id: "+outgoing.optInt("sequence")+"\ndata: "+outgoing.toString()+"\n\n");}catch(Exception e){client.close();room.clients.remove(client.id,client);}}
    private void sendSnapshot(Room room,SseClient client){try{JSONObject m=new JSONObject();m.put("type","session");m.put("version",1);m.put("sequence",room.sequence);m.put("eventId",room.code+":"+room.sequence);m.put("session",personalized(room,client.id));sendEvent(room,client,m,null);}catch(Exception ignored){}}
    private void replay(Room room,SseClient client,int after){synchronized(room.events){int oldest=room.events.isEmpty()?room.sequence:room.events.get(0).optInt("sequence");if(after<oldest-1){sendSnapshot(room,client);return;}for(JSONObject e:room.events)if(e.optInt("sequence")>after)sendEvent(room,client,e,null);}}
    private void message(Socket socket,Room room,JSONObject body)throws Exception{
        String clientId=safe(body.optString("clientId",""),100);if(!containsPlayer(room,clientId)){respond(socket,403,error("Unknown player"));return;}JSONObject m=body.optJSONObject("message");if(m==null){respond(socket,400,error("Invalid message"));return;}String type=m.optString("type","");String requestId=safe(m.optString("requestId",""),100);if(!requestId.isEmpty()){Set<String> ids=room.requests.computeIfAbsent(clientId,k->ConcurrentHashMap.newKeySet());if(ids.contains(requestId)){JSONObject ok=new JSONObject();ok.put("ok",true);ok.put("deduplicated",true);ok.put("sequence",room.sequence);respond(socket,200,ok);return;}ids.add(requestId);}
        JSONObject normalized=new JSONObject();normalized.put("type",type);normalized.put("senderId",clientId);
        if("move.accepted".equals(type)){if(!room.hostId.equals(clientId)){respond(socket,403,error("Only host can publish accepted moves"));return;}JSONObject accepted=m.optJSONObject("move");if(!"playing".equals(room.session.optString("status"))||accepted==null||!containsPlayer(room,accepted.optString("player",""))){respond(socket,400,error("Invalid accepted move"));return;}normalized.put("move",accepted);}
        else if("move.rejected".equals(type)){if(!room.hostId.equals(clientId)){respond(socket,403,error("Only host can reject a move"));return;}String target=safe(m.optString("player",""),100);if(!containsPlayer(room,target)){respond(socket,400,error("Unknown move recipient"));return;}normalized.put("player",target);normalized.put("message",safe(m.optString("message","Move rejected"),160));}
        else if("move".equals(type)){if(!"playing".equals(room.session.optString("status"))){respond(socket,409,error("Match is not active"));return;}if(room.hostId.equals(clientId)){respond(socket,409,error("Host dispatches moves locally"));return;}JSONObject move=m.optJSONObject("move");if(move==null||!clientId.equals(move.optString("player"))){respond(socket,403,error("Move sender mismatch"));return;}if(!room.clients.containsKey(room.hostId)){respond(socket,503,error("Room coordinator is offline"));return;}if(move.toString().length()>16000){respond(socket,413,error("Move payload too large"));return;}normalized.put("move",move);}
        else if("chat".equals(type)||"emote".equals(type)){List<Long> times=room.messageTimes.computeIfAbsent(clientId,k->Collections.synchronizedList(new ArrayList<>()));long now=System.currentTimeMillis();synchronized(times){times.removeIf(t->now-t>5000);if(times.size()>=12){respond(socket,429,error("Sending too quickly"));return;}times.add(now);}if("chat".equals(type)){String actor=safe(m.optString("player",clientId),100);if(!actor.equals(clientId)&&!(room.hostId.equals(clientId)&&isBot(room,actor))){respond(socket,403,error("Cannot speak as another player"));return;}String text=safe(m.optString("text",""),200);if(text.isEmpty()){respond(socket,400,error("Message cannot be empty"));return;}normalized.put("player",actor);normalized.put("text",text);if(m.has("presetId"))normalized.put("presetId",safe(m.optString("presetId"),40));normalized.put("ts",now);}else{String emoji=safe(m.optString("emoji",""),12);if(emoji.isEmpty()||emoji.codePointCount(0,emoji.length())>4){respond(socket,400,error("Invalid reaction"));return;}normalized.put("player",clientId);normalized.put("emoji",emoji);normalized.put("ts",now);}}
        else if("resync_request".equals(type)){int after=Math.max(0,m.optInt("afterSequence",0));SseClient target=room.clients.get(clientId);if(target!=null)replay(room,target,after);JSONObject ok=new JSONObject();ok.put("ok",true);ok.put("sequence",room.sequence);respond(socket,200,ok);return;}
        else {respond(socket,400,error("Unsupported message type"));return;}
        if("move".equals(type)||"move.rejected".equals(type)){String targetId="move".equals(type)?room.hostId:normalized.optString("player","");SseClient target=room.clients.get(targetId);String directId=room.code+":direct:"+(requestId.isEmpty()?UUID.randomUUID().toString():requestId);normalized.put("version",1);normalized.put("sequence",0);normalized.put("eventId",directId);if(target!=null)try{target.write("data: "+normalized.toString()+"\n\n");}catch(Exception ignored){}JSONObject ok=new JSONObject();ok.put("ok",true);ok.put("sequence",room.sequence);ok.put("eventId",directId);respond(socket,200,ok);return;}
        emit(room,normalized,null);JSONObject ok=new JSONObject();ok.put("ok",true);ok.put("sequence",room.sequence);ok.put("eventId",room.code+":"+room.sequence);respond(socket,200,ok);
    }
    private boolean containsPlayer(Room r,String id){JSONArray a=r.session.optJSONArray("players");if(a==null)return false;for(int i=0;i<a.length();i++)if(id.equals(a.optJSONObject(i).optString("id")))return true;return false;}
    private boolean isBot(Room r,String id){JSONArray a=r.session.optJSONArray("players");if(a==null)return false;for(int i=0;i<a.length();i++){JSONObject p=a.optJSONObject(i);if(id.equals(p.optString("id"))&&"bot".equals(p.optString("kind")))return true;}return false;}
}
