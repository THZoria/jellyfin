/* Jellyfin transport/demux/clock around Moonlight-CivSwitch's native media path.
 * No HTML video, VFS alias, Sunshine server, generated Moonlight protocol core,
 * executable patch or whole-film download. VOD timing uses a small derived adapter.
 */
(function(g){
 "use strict";
 function create(options){
  var o=options||{},cancel={cancelled:false},queue=[],queueBytes=0,io=null,media=null,heap=null,networkTask=null,networkError=null,eof=false,tracks=null;
  var firstPts=null,origin=null,paused=false,pauseAt=0,tailAt=null,lastStats=0,closed=false,failed=null;
  var frameWait=null;
  var buffering=true,bufferAt=null,lastVideo=null,lastAudio=null,saturated=false;
  var maxBytes=16777216,maxPackets=4096,maxAhead=20000;
  var deps=o.dependencies||{},clock=deps.clock||function(){return g.performance&&g.performance.now?g.performance.now():Date.now();};
  function sleep(ms){return new Promise(function(r){setTimeout(r,ms);});}
  function active(){if(cancel.cancelled)throw Error("Lecture native arretee.");}
  function status(s){if(o.onStatus&&!cancel.cancelled)o.onStatus(s);}
  function mediaDeadline(){return (g.MoonlightTelemetry&&g.MoonlightTelemetry.now?g.MoonlightTelemetry.now():Date.now())+1;}
  function playClock(){return paused?pauseAt:buffering&&bufferAt!==null?bufferAt:clock();}
  function seconds(){return origin===null?0:Math.max(0,(playClock()-origin)/1000);}
  function ahead(){if(firstPts===null)return 0;var end=lastVideo;if(tracks&&tracks.audio)end=end===null?null:Math.min(end,lastAudio===null?firstPts:lastAudio);return end===null?0:Math.max(0,end-firstPts-seconds()*1000);}
  function notifyBuffer(){if(o.onBuffer&&!cancel.cancelled)o.onBuffer({buffering:buffering,bufferedSeconds:ahead()/1000,paused:paused});}
  function targetAt(timestamp){return buffering||origin===null||firstPts===null?Infinity:origin+timestamp/1000-firstPts;}
  function wakeFrame(){if(frameWait)frameWait.finish();}
  function nextFrame(service){return new Promise(function(resolve){
   var wait={raf:null,timer:null,service:null,finish:function(){
    if(frameWait!==wait)return;frameWait=null;clearTimeout(wait.timer);clearTimeout(wait.service);
    if(wait.raf!==null&&typeof g.cancelAnimationFrame==="function")g.cancelAnimationFrame(wait.raf);resolve();
   }};frameWait=wait;
   var raf=typeof g.requestAnimationFrame==="function"&&typeof g.cancelAnimationFrame==="function";
   wait.timer=setTimeout(wait.finish,raf?50:8);
   wait.service=setTimeout(function(){if(frameWait!==wait||cancel.cancelled)return;try{service();}catch(e){networkError=e;wait.finish();}},4);
   if(raf)wait.raf=g.requestAnimationFrame(wait.finish);
  });}
  var finished=(async function(){
   await Promise.resolve(); // Return the controller before invoking any UI callbacks.
   try{
    if(g.__jellyfinNativeQuarantine)throw Error("Un lecteur natif precedent n'a pas pu etre libere. Redemarre Civilization VII.");
    var exchange;
    if(deps.exchange){exchange=deps.exchange;io=deps.io;media=deps.media;}
    else{
     if(!g.JellyfinNativeHttp||!g.JellyfinNativeHttp.available||!g.MoonlightStreamIO||!g.MoonlightStreamMedia||!g.MoonlightNativeTexture)throw Error("Composants du lecteur natif absents.");
     var bridge=g.JellyfinNativeHttp.bridge();
     io=g.MoonlightStreamIO.create({resolveNativeSymbol:bridge.resolve},{batchReceive:false});
     exchange=g.JellyfinNativeHttp.create(bridge);
    }
    heap=new Uint8Array(4194304);
    var core={HEAPU8:heap,_malloc:function(){throw Error("Allocation CPU inattendue : lecteur GPU uniquement.");},_free:function(){throw Error("Liberation CPU inattendue.");},_ml_png_release:function(){}};
    if(!media){
     if(!g.JellyfinVodPacer)throw Error("Ordonnanceur VOD absent du paquet.");
      media=g.MoonlightStreamMedia.create(io,core,{smoothVideo:false,videoPacer:g.JellyfinVodPacer.create({clock:clock,targetAt:targetAt,paused:function(){return paused||buffering;}}),presentationDue:function(timestamp){return !paused&&!buffering&&clock()>=targetAt(timestamp);},onImage:function(url){if(!cancel.cancelled&&o.onImage)o.onImage(url);},onStatus:status});
    }
    var videoPointer=0x1000,spsPointer=0x110000,ppsPointer=0x120000,audioPointer=0x130000;
    var demux=g.JellyfinMatroska.create({cancel:cancel,onTracks:async function(t){
     active();if(tracks)throw Error("Changement de pistes en cours de lecture non pris en charge.");tracks=t;
     var fps=t.video.defaultDuration?Math.round(1000000000/t.video.defaultDuration):30;fps=Math.max(1,Math.min(60,fps));
     status("Initialisation du decodeur materiel H.264 et de la texture GPU...");
     media.videoSetup(1,t.video.width,t.video.height,fps);
     heap.set(t.video.avc.sps,spsPointer);heap.set(t.video.avc.pps,ppsPointer);
     if(t.audio)media.audioSetup(48000,2,1,1,960);
     if(o.onFormat)o.onFormat({width:t.video.width,height:t.video.height,displayWidth:t.video.displayWidth||t.video.width,displayHeight:t.video.displayHeight||t.video.height});
     status("Reception native H.264"+(t.audio?" + Opus stereo":" (sans piste audio)")+"...");
    },onPacket:async function(packet){
     active();var limit=packet.kind==="video"?1048576:65536;
     if(packet.bytes.length<1||packet.bytes.length>limit||!Number.isFinite(packet.ptsMs))throw Error("Paquet media natif hors limites.");
      while(queueBytes+packet.bytes.length>maxBytes||queue.length>=maxPackets||ahead()>=maxAhead){saturated=true;active();if(networkError)throw networkError;await sleep(5);}
      saturated=false;
      active();if(firstPts===null)firstPts=packet.ptsMs;
     // The baseline transcoding request avoids reordered B frames. Sorting also
     // handles small A/V interleave differences without unbounded packet retention.
     var at=queue.length;while(at&&queue[at-1].ptsMs>packet.ptsMs)at--;
      queue.splice(at,0,packet);queueBytes+=packet.bytes.length;
      if(packet.kind==="video")lastVideo=packet.ptsMs;else lastAudio=packet.ptsMs;
    }});
    function feed(audioOnly,budget){
      if(paused||buffering||origin===null||!tracks)return;
     var elapsed=clock()-origin,deadline=clock()+budget,turns=0,videoBlocked=audioOnly;
     while(queue.length&&turns++<12&&clock()<deadline){
      var index=queue.findIndex(function(p){return (!videoBlocked||p.kind==="audio")&&p.ptsMs-firstPts<=elapsed+(p.kind==="video"?80:0);});
      if(index<0)break;var packet=queue[index];
      if(packet.kind==="video"){
       heap.set(packet.bytes,videoPointer);
       var result=media.videoFrame(videoPointer,packet.bytes.length,packet.keyframe?1:2,Math.round(packet.ptsMs*1000),spsPointer,tracks.video.avc.sps.length,ppsPointer,tracks.video.avc.pps.length,heap);
       if(result!==0){videoBlocked=true;continue;} // Busy video must not prevent timely audio.
      }else{heap.set(packet.bytes,audioPointer);media.audioFrame(audioPointer,packet.bytes.length,heap);}
      queue.splice(index,1);queueBytes-=packet.bytes.length;
     }
    }
    networkTask=(async function(){
     try{
      await exchange.stream(o.url,o.headers||{}, {cancel:cancel,idleTimeoutMs:30000,onHeaders:async function(_,headers){
       var type=(headers["content-type"]||"").toLowerCase();
       if(type.indexOf("html")>=0||type.indexOf("json")>=0)throw Error("Le serveur n'a pas renvoye un flux Matroska video.");
       status("Flux HTTP natif ouvert. Analyse des pistes Matroska...");
      },onData:demux.push});
      if(!cancel.cancelled)await demux.finish();
     }catch(e){if(!cancel.cancelled)networkError=e;}
     finally{eof=true;}
    })();
    while(!cancel.cancelled){
     if(networkError)throw networkError;
      if(tracks){
       if(buffering&&!paused&&(ahead()>=(origin===null?2500:3000)||eof||saturated)&&queue.length){
        if(origin===null)origin=clock()+80;else origin+=clock()-bufferAt;
        buffering=false;bufferAt=null;notifyBuffer();
       }
       if(!buffering&&!paused&&!eof&&origin!==null&&clock()>origin&&ahead()<100&&media.stats().audioBufferedMsUpperBound<=40){
        buffering=true;bufferAt=clock();notifyBuffer();
       }
      media.drainVideo();media.finishVideo(mediaDeadline());media.drainAudio();
      feed(false,4);
      media.finishVideo(mediaDeadline());media.drainAudio();
       if(o.onStats&&clock()-lastStats>=1000){lastStats=clock();o.onStats(Object.assign({queuedPackets:queue.length,queuedBytes:queueBytes,seconds:seconds(),paused:paused,buffering:buffering,bufferedSeconds:ahead()/1000},media.stats()));notifyBuffer();}
      if(eof&&!queue.length&&!paused){if(tailAt===null)tailAt=clock();var s=media.stats();if(clock()-tailAt>150&&(s.decoderPending===0&&s.audioBufferedMsUpperBound<20||clock()-tailAt>1500))break;}
     }else if(eof)throw Error("Le flux n'a fourni aucune piste H.264 exploitable.");
      await nextFrame(function(){if(tracks){media.drainAudio();feed(true,1);media.drainAudio();}});
    }
   }catch(e){if(!cancel.cancelled)failed=e;}
   finally{
    cancel.cancelled=true;wakeFrame();
    if(networkTask)await networkTask;
    queue=[];queueBytes=0;
    if(media){
     var releaseDeadline=clock()+1000,released=false;
     for(var tries=0;tries<200;tries++){
      try{media.close();released=true;break;}
      catch(e){if(!/GPU transfer is still pending/.test(e.message)||clock()>=releaseDeadline){failed=e;break;}await sleep(5);}
     }
     if(!released){g.__jellyfinNativeQuarantine={media:media,io:io,heap:heap};failed=Error("Liberation GPU non confirmee : ressources conservees pour securite. Redemarre Civilization VII.");}
    }
    if(!g.__jellyfinNativeQuarantine&&io){try{io.close();}catch(e){failed=e;g.__jellyfinNativeQuarantine={io:io,heap:heap};}}
    if(!g.__jellyfinNativeQuarantine){heap=null;media=null;io=null;}closed=true;
   }
   if(failed){if(o.onError)o.onError(failed.message);return {ok:false,error:failed.message};}
   if(o.onEnded)o.onEnded();return {ok:true};
  })();
  return {finished:finished,stop:function(){cancel.cancelled=true;wakeFrame();return finished;},togglePause:function(){if(closed||cancel.cancelled)return false;if(paused){if(origin!==null&&!buffering)origin+=clock()-pauseAt;paused=false;}else{pauseAt=playClock();paused=true;}notifyBuffer();return paused;},stats:function(){return {seconds:seconds(),queuedBytes:queueBytes,queuedPackets:queue.length,bufferedSeconds:ahead()/1000,buffering:buffering,paused:paused,closed:closed};}};
 }
 g.JellyfinNativePlayer={create:create};
})(typeof window!=="undefined"?window:globalThis);
