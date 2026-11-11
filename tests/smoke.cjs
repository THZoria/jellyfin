/* Current native-player UI/lifecycle mocks. No console GPU/audio claimed. */
"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const source=fs.readFileSync(path.join(__dirname,"../app.js"),"utf8");
class Element{
 constructor(tag){this.tag=tag;this.children=[];this.style={};this.attrs={};this.events={};this.textContent="";}
 appendChild(n){this.children.push(n);n.parentNode=this;}
 removeChild(n){this.children.splice(this.children.indexOf(n),1);n.parentNode=null;}
 get firstChild(){return this.children[0];}
 setAttribute(k,v){this.attrs[k]=v;}
 removeAttribute(k){delete this.attrs[k];if(k==="src")this.src="";}
 addEventListener(k,f){this.events[k]=f;}
 removeEventListener(k,f){if(this.events[k]===f)delete this.events[k];}
 focus(){}
}
const all=n=>[n,...n.children.flatMap(all)],tick=()=>new Promise(r=>setImmediate(r));
async function run(){
 const body=new Element("body"),events={},answers=[],requests=[],players=[];
   let offset=0,failViews=false,failAuth=false,failWrite=false,allowTranscode=true,pending=false,pendingPlayback=false,cancelled=false,cleared=0,nativeAction=null,saved=null,commits=0,validServer=true;
 function response(url,method,headers,data){
  requests.push({url,method,headers,data});
   if(url.endsWith("/System/Info/Public"))return validServer?{Version:"12.0.0",ServerName:"Home",Id:"server-id"}:{};
   if(url.endsWith("/Users/AuthenticateByName")){assert.equal(method,"POST");if(failAuth)throw Error("Identifiants refuses (401)");if(data==="{}")throw Error("POST /Users/AuthenticateByName : HTTP 400.");return {AccessToken:"TEST-TOKEN",User:{Id:"u1"}};}
  if(url.includes("/UserViews?")){if(failViews)throw Error("GET /UserViews : HTTP 404.");return {Items:[{Id:"lib",Name:"Series",IsFolder:true}]};}
  if(url.includes("/Items?")){const start=Number(new URL(url).searchParams.get("StartIndex"));return {Items:Array.from({length:Math.min(24,60-start)},(_,i)=>({Id:"film"+(start+i),Name:"Anime "+(start+i+1),IsFolder:false})),TotalRecordCount:60};}
   if(url.includes("/PlaybackInfo?"))return {MediaSources:[{Id:"src",Container:"mkv",RunTimeTicks:1200000000,SupportsTranscoding:allowTranscode,MediaStreams:[{Type:"Audio",Index:1},{Type:"Subtitle",Index:4,DisplayTitle:"Francais ASS"},{Type:"Subtitle",Index:9,DisplayTitle:"English PGS"}]}],PlaySessionId:"native-session"};
  if(url.includes("/Sessions/Playing"))return null;
  throw Error("Unexpected API path");
 }
  const context={document:{body,createElement:tag=>{assert.notEqual(tag,"video","Current UI must never use HTML video");return new Element(tag);}},navigator:{},innerWidth:1920,innerHeight:1080,setTimeout,clearTimeout,
  Date:class extends Date{static now(){return Date.now()+offset;}},requestAnimationFrame:()=>1,cancelAnimationFrame:()=>{},
  addEventListener:(k,f)=>{events[k]=f;},removeEventListener:(k,f)=>{if(events[k]===f)delete events[k];},
   CivKeyboard:{create:()=>({edit:async()=>answers.shift(),cancel:()=>{cleared++;}})},engine:{on:(_,fn)=>{nativeAction=fn;return {clear:()=>{cleared++;}};}},
    PayloadNative:{create:()=>({files:{read:async()=>saved,write:async(path,bytes)=>{assert.equal(path,"save:/civhomebrew/jellyfin-settings.json");if(failWrite)throw Error("Save unavailable");saved=bytes;},commit:()=>{commits++;}}})},
  JellyfinNativeHttp:{available:true,create:()=>async(url,method,headers,data,o)=>{
    if(pending||pendingPlayback&&url.includes("/PlaybackInfo?")){while(!o.cancel.cancelled)await tick();cancelled=true;throw Error("Cancelled");}
   return {status:200,headers:{},body:JSON.stringify(response(url,method,headers,data))};
  }},
  JellyfinNativePlayer:{create:o=>{
   assert.ok(o.url.includes("/stream.mkv?"));assert.ok(!o.url.includes("api_key"));
   assert.ok(o.headers.Authorization.includes('Token="TEST-TOKEN"'));
   const q=new URL(o.url).searchParams;assert.equal(q.get("VideoCodec"),"h264");assert.equal(q.get("AudioCodec"),"opus");assert.equal(q.get("Profile"),"baseline");assert.equal(q.get("AllowVideoStreamCopy"),"false");
   let resolve,paused=false;const finished=new Promise(r=>{resolve=r;});
    const p={options:o,released:false,finished,stats:()=>({seconds:12,paused}),togglePause:()=>{paused=!paused;return paused;},stop:async()=>{await tick();p.released=true;resolve({ok:true});return finished;}};
   players.push(p);queueMicrotask(()=>{o.onFormat({width:1280,height:720,displayWidth:1280,displayHeight:720});o.onImage("live:/moonlight-experiment/test");});return p;
  }}
 };
   context.window=context;for(const file of ["brand.js","player-layout.js","playback-options.js"])vm.runInNewContext(fs.readFileSync(path.join(__dirname,"..",file),"utf8"),context);const lifetime=vm.runInNewContext(source,context);await tick();
 const text=()=>all(body).map(n=>n.textContent).join("\n"),buttons=()=>all(body).filter(n=>n.tag==="button");
 async function key(key){offset+=200;events.keydown({key,repeat:false,preventDefault(){},stopImmediatePropagation(){}});await tick();}
 async function native(name,phase=0){offset+=200;nativeAction(name,phase,0,0);await tick();}
 async function click(prefix){const n=buttons().find(n=>n.attrs["aria-label"].startsWith(prefix));assert.ok(n,"Button: "+prefix);for(let i=0;n.style.display==="none"&&i<buttons().length;i++)await key("ArrowDown");assert.notEqual(n.style.display,"none");n.events.click();await tick();}
  assert.match(text(),/0.0.1.*SaoriYuki/);
 assert.ok(!text().includes("Sonde ExeFS")&&!text().includes("Test WebM"),"Old diagnostic branches removed from UI");
  assert.ok(!buttons().some(n=>n.attrs["aria-label"].startsWith("Utilisateur")),"Login gated before server acceptance");
  assert.equal(requests.length,0,"No default server contacted");
  await click("Continuer");assert.equal(requests.length,0);assert.equal(saved,null);
  answers.push("http://test.invalid:8096");await click("Adresse du serveur");validServer=false;await click("Continuer");assert.equal(saved,null);assert.ok(!text().includes("Nom du compte"));
  validServer=true;await click("Continuer");assert.equal(JSON.parse(saved).server,"http://test.invalid:8096");assert.equal(commits,1);
  answers.push("alice");await click("Utilisateur");answers.push("SECRET-PASSWORD");await click("Mot de passe");assert.ok(!text().includes("SECRET-PASSWORD"));
  assert.ok(buttons().find(n=>n.attrs["data-selected"]==="true").attrs["aria-label"].startsWith("Mot de passe"),"Keyboard completion preserves the edited field");
  answers.push(null);nativeAction("accept",0,0,0);await tick();assert.equal(answers.length,0,"The next A activates immediately after keyboard completion");
 failViews=true;await click("Se connecter");assert.match(text(),/Connecte - catalogue indisponible/);failViews=false;await click("Reessayer le catalogue");
 assert.equal(JSON.parse(requests.find(r=>r.url.endsWith("AuthenticateByName")).data).Pw,"SECRET-PASSWORD");
  assert.deepEqual(Object.keys(JSON.parse(saved)),["server"],"Never persist account or credentials");
  await click("Series");assert.match(text(),/Page 1 \/ 3/);await key("ArrowRight");assert.match(text(),/Page 2 \/ 3/);await click("Page suivante");assert.match(text(),/Page 3 \/ 3/);
 assert.ok(!buttons().some(n=>n.attrs["aria-label"].startsWith("Page suivante")));await key("ArrowLeft");await key("ArrowLeft");
 for(let i=0;i<12;i++)await key("ArrowDown");const selected=buttons().find(n=>n.attrs["data-selected"]==="true");assert.equal(selected.attrs["aria-label"],"Anime 12");assert.notEqual(selected.style.display,"none");
  await key("Enter");await click("Lire");assert.equal(players.length,1);assert.ok(all(body).some(n=>n.tag==="img"&&n.src==="live:/moonlight-experiment/test"));assert.ok(!text().includes("TEST-TOKEN"));
 const overlay=all(body).find(n=>n.id==="jellyfin-fullscreen-player"),image=overlay.children.find(n=>n.tag==="img");
 assert.equal(overlay.style.position,"fixed");assert.equal(overlay.style.left,"0");assert.equal(overlay.style.right,"0");assert.equal(overlay.style.top,"0");assert.equal(overlay.style.bottom,"0");
 assert.equal(buttons().length,0,"No Jellyfin menu or player buttons during playback");
 assert.ok(body.children[0].children.filter(n=>n!==overlay).every(n=>n.style.display==="none"),"All application chrome is hidden");
 assert.equal(image.style.width,"1920px");assert.equal(image.style.height,"1080px");assert.equal(image.style.left,"0px");assert.equal(image.style.top,"0px");
 players[0].options.onFormat({width:720,height:576,displayWidth:4,displayHeight:3});assert.equal(image.style.width,"1440px");assert.equal(image.style.left,"240px");assert.equal(image.style.height,"1080px");
 context.innerWidth=1280;context.innerHeight=720;events.resize();assert.equal(image.style.width,"960px");assert.equal(image.style.left,"160px");assert.equal(image.style.height,"720px");
 await native("nav-down");await native("accept");assert.ok(overlay.children.some(n=>n.textContent==="Pause"&&n.style.display==="block"),"Native A pauses regardless of directional input/focus");
 await native("accept",3);assert.ok(overlay.children.some(n=>n.textContent==="Pause"&&n.style.display==="block"),"Holding A does not repeatedly toggle pause");
  await native("accept");assert.ok(!overlay.children.some(n=>n.textContent==="Pause"&&n.style.display==="block"),"Native A resumes; transient playback HUD is allowed");
 await native("cancel");await tick();assert.ok(players[0].released);assert.equal(overlay.parentNode,null);assert.equal(image.src,"");assert.notEqual(body.children[0].children[0].style.display,"none","Catalogue chrome restored on native B");
 players[0].options.onImage("live:/moonlight-experiment/late");assert.equal(image.src,"","Late callbacks cannot restore a closed player's image");
 assert.equal(buttons().find(n=>n.attrs["data-selected"]==="true").attrs["aria-label"],"Anime 12");
 const stopped=requests.find(r=>r.url.endsWith("/Sessions/Playing/Stopped"));assert.equal(JSON.parse(stopped.data).PositionTicks,120000000);
  await click("Anime 1");allowTranscode=false;await click("Lire");assert.match(text(),/Aucune source autorisant le transcodage/);assert.equal(players.length,1);allowTranscode=true;
  await click("Lire");players[1].options.onError("Flux HTTP : HTTP 500 pour la demande video.");await tick();assert.match(text(),/HTTP 500/);assert.ok(players[1].released);assert.ok(!all(body).some(n=>n.id==="jellyfin-fullscreen-player"),"Error tears down fullscreen so its message is visible");
  await key("Escape");await click("Anime 1");await click("Lire");players[2].options.onEnded();await tick();assert.match(text(),/Fin de lecture/);assert.ok(!all(body).some(n=>n.id==="jellyfin-fullscreen-player"),"Natural end restores the application UI");
   await key("Escape");await click("Anime 1");await click("Lire");
  const q=p=>new URL(p.options.url).searchParams;
  assert.equal(q(players[3]).get("SubtitleMethod"),"Drop");assert.equal(q(players[3]).get("SubtitleStreamIndex"),"-1");
  await native("nav-up");assert.ok(all(body).some(n=>n.id==="jellyfin-subtitles"));assert.match(text(),/Francais ASS/);assert.match(text(),/English PGS/);
  await native("cancel");assert.equal(players[3].released,false,"B closes subtitle menu without exiting playback");
  await native("nav-right");await native("nav-right");assert.match(text(),/Aller a  0:32/);
  await new Promise(r=>setTimeout(r,500));await tick();assert.equal(players.length,5,"Multiple seek presses coalesce into one replacement stream");assert.ok(players[3].released);
  assert.equal(q(players[4]).get("StartTimeTicks"),"320000000");
  players[3].options.onImage("live:/stale-seek");assert.ok(!all(body).some(n=>n.src==="live:/stale-seek"));
  await native("nav-up");await native("nav-down");await native("accept");await tick();
  assert.equal(q(players[5]).get("SubtitleStreamIndex"),"4");assert.equal(q(players[5]).get("SubtitleMethod"),"Encode");assert.equal(q(players[5]).get("StartTimeTicks"),"440000000");
  await native("accept");assert.equal(players[5].stats().paused,true);
  await native("nav-up");await native("nav-down");await native("accept");await tick();
  assert.equal(q(players[6]).get("SubtitleStreamIndex"),"9","Use the PGS stream index, not its position in the filtered list");assert.equal(players[6].stats().paused,true,"Changing subtitles retains pause");
  await native("nav-left");await new Promise(r=>setTimeout(r,500));await tick();
  assert.equal(q(players[7]).get("StartTimeTicks"),"580000000");assert.equal(q(players[7]).get("SubtitleStreamIndex"),"9");assert.equal(players[7].stats().paused,true);
  await native("nav-up");await native("nav-up");await native("nav-up");await native("accept");await tick();
  assert.equal(q(players[8]).get("SubtitleMethod"),"Drop");assert.equal(q(players[8]).get("SubtitleStreamIndex"),"-1","Subtitle disabling reopens at current position");
  const sessions=players.slice(3).map(p=>q(p).get("PlaySessionId"));assert.equal(new Set(sessions).size,sessions.length,"Each replacement has its own server transcode session");
  const stopAfterSeek=requests.filter(r=>r.url.endsWith("/Sessions/Playing/Stopped")).map(r=>JSON.parse(r.data));assert.ok(stopAfterSeek.some(s=>s.PositionTicks===440000000),"Stop reports include the absolute seek offset");
  pendingPlayback=true;await native("nav-right");await new Promise(r=>setTimeout(r,500));await tick();
  await native("cancel");await tick();assert.ok(cancelled,"B cancels an in-flight seek even while the replacement is loading");assert.ok(!all(body).some(n=>n.id==="jellyfin-fullscreen-player"));
  pendingPlayback=false;await click("Anime 1");await click("Lire");await native("nav-right");await context.__civswitchApp.close();await lifetime;assert.ok(players.at(-1).released,"App close cancels pending seeks and awaits native teardown");
 assert.equal(body.children.length,0);assert.equal(context.__civswitchApp,undefined);assert.deepEqual(Object.keys(events),[]);assert.equal(cleared,2);
 // Existing API transport cancellation still works independently of native video.
   const second=vm.runInNewContext(source,context);await tick();await tick();assert.ok(text().includes("Nom du compte"),"Saved server revalidated successfully on relaunch");assert.ok(!text().includes("alice")&&!text().includes("••••••••"),"Account fields start empty without opt-in");
  const checkbox=()=>buttons().find(n=>n.attrs.role==="checkbox");assert.equal(checkbox().attrs["aria-checked"],"false");
  answers.push("remembered-alice");await click("Utilisateur");answers.push("REMEMBERED-SECRET");await click("Mot de passe");
  await click("Memoriser mes identifiants");assert.equal(checkbox().attrs["aria-checked"],"true");assert.deepEqual(Object.keys(JSON.parse(saved)),["server"],"Consent alone does not save unverified credentials");
  failAuth=true;await click("Se connecter");assert.deepEqual(Object.keys(JSON.parse(saved)),["server"],"Rejected credentials are never saved");failAuth=false;answers.push("REMEMBERED-SECRET");await click("Mot de passe");
  await click("Se connecter");assert.deepEqual(JSON.parse(saved).credentials,{username:"remembered-alice",password:"REMEMBERED-SECRET"});assert.equal(JSON.parse(saved).rememberCredentials,true);assert.ok(!saved.includes("TEST-TOKEN"));
  const remembered=saved;await context.__civswitchApp.close();await second;
  const restored=vm.runInNewContext(source,context);await tick();await tick();assert.match(text(),/remembered-alice/);assert.ok(!text().includes("REMEMBERED-SECRET"));assert.equal(checkbox().attrs["aria-checked"],"true");
  failWrite=true;await click("Memoriser mes identifiants");assert.equal(checkbox().attrs["aria-checked"],"true");assert.match(text(),/Impossible d'effacer/);assert.ok(JSON.parse(saved).credentials,"Failed removal is not presented as successful");failWrite=false;
  await click("Memoriser mes identifiants");assert.deepEqual(Object.keys(JSON.parse(saved)),["server"],"Unchecking immediately removes saved credentials");await context.__civswitchApp.close();await restored;
  saved=remembered;const different=vm.runInNewContext(source,context);await tick();await tick();await click("Changer de serveur");answers.push("http://other.invalid:8096");await click("Adresse du serveur");await click("Continuer");assert.ok(text().includes("Nom du compte"));assert.equal(checkbox().attrs["aria-checked"],"false");assert.deepEqual(JSON.parse(saved),{server:"http://other.invalid:8096"},"Credentials never migrate to a different server");await context.__civswitchApp.close();await different;
  pending=true;const third=vm.runInNewContext(source,context);await tick();await context.__civswitchApp.close();await third;assert.ok(cancelled,"Saved server revalidation cancelled cleanly on close");
  pending=false;saved="{corrupt";const before=requests.length,fourth=vm.runInNewContext(source,context);await tick();assert.equal(requests.length,before);assert.ok(text().includes("Ajouter une adresse"));assert.ok(!text().includes("Nom du compte"));await context.__civswitchApp.close();await fourth;
  console.log("PASS: server/login persistence, fullscreen A/B, coalesced forward/back seek, ASS/PGS selection/off, absolute position reports, pause preservation, stale callback rejection, cancellation and teardown (host mocks).");
}
run().catch(e=>{console.error(e);process.exitCode=1;});
