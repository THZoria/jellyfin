/* Shared native media boundary, not a GPU/firmware qualification. */
"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
async function run(){
 for(const shared of [false,true])for(const cancelDuringPrepare of shared?[false,true]:[false]){
  let prepared,releaseClose,closeStarted=false,closed=false,ioClosed=false,network=false,options,player;
  const g={setTimeout,clearTimeout,performance,Date,Uint8Array,console};g.window=g;
   g.CivNanoVGSession={current:shared?{renderer:{owner:{}}}:null};
  g.JellyfinNativeHttp={available:true,bridge:()=>({resolve(){}}),create:()=>({stream:async(url,headers,o)=>{network=true;await o.onData("fixture");}})};
  g.MoonlightStreamIO={create:()=>({close(){assert.ok(closed,"media teardown must finish before IO release");ioClosed=true;}})};
  g.JellyfinVodPacer={create:o=>({vod:true,options:o})};
   const mediaStub=()=>({
    videoSetup(format,w,h){assert.equal(format,1);assert.equal(w,1280);assert.equal(h,720);},audioSetup(){},
    drainVideo(){},finishVideo(){},drainAudio(){},stats:()=>({audioBufferedMsUpperBound:0}),
    async close(){closeStarted=true;await new Promise(r=>releaseClose=r);closed=true;}
   });
   g.MoonlightStreamMedia={create(io,core,o){
    assert.ok(!shared,"Native mode must not use the legacy presenter");options=o;assert.equal(o.synchronousGpu,true);
    o.onImage("live:/legacy-frame");return mediaStub();
   }};
   g.MoonlightNativeTexture={};
   g.MoonlightNativeVideo={createMedia:async(io,core,o)=>{
    assert.ok(shared,"Classic mode must not initialize a Vulkan display");
    options=o;if(cancelDuringPrepare)await new Promise(r=>prepared=r);
    return mediaStub();
  }};
  g.JellyfinMatroska={create:o=>({push:async()=>o.onTracks({video:{width:1280,height:720,avc:{sps:new Uint8Array([1]),pps:new Uint8Array([1])}}}),finish:async()=>{}})};
   for(const file of ["runtime-mode.js","native-player.js"])vm.runInNewContext(fs.readFileSync(path.join(__dirname,"..",file),"utf8"),g);
   let image;
   player=g.JellyfinNativePlayer.create({url:"http://test/video",onImage(url){image=url;},onFormat(){player.stop();}});
  await new Promise(r=>setImmediate(r));
  if(cancelDuringPrepare){player.stop();prepared();}
  while(!closeStarted)await new Promise(r=>setImmediate(r));
   assert.equal(ioClosed,false);if(shared)assert.equal(options.mode.codec,"h264");else assert.equal(image,"live:/legacy-frame");
   assert.equal(options.videoPacer.vod,true);
  assert.equal(options.canPresent(),false,"paused/buffering/cancelled startup must not publish");
  releaseClose();await player.finished;assert.ok(closed&&ioClosed);
  assert.equal(network,!cancelDuringPrepare,"cancellation during native preparation cannot open the video socket");
 }
 console.log("PASS: classic synchronous GPU/shared Vulkan selection, VOD hooks, cancelled async preparation and awaited media/IO teardown (host mocks).");
}
run().catch(e=>{console.error(e);process.exitCode=1;});
