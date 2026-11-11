"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function run(){
 let now=0,release,phase=0,stopped=false,decoded=0;
 const states=[];
 const media={videoSetup(){},audioSetup(){},videoFrame(){decoded++;return 0;},audioFrame(){},drainVideo(){},drainAudio(){},finishVideo(){},close(){stopped=true;},stats:()=>({decoderPending:0,audioBufferedMsUpperBound:0})};
 const tracks={video:{width:256,height:144,avc:{sps:new Uint8Array([1]),pps:new Uint8Array([2])}},audio:{}};
 const context={setTimeout,clearTimeout,Uint8Array,JellyfinMatroska:{create:o=>({push:async range=>{
  if(!phase++)await o.onTracks(tracks);
  for(let pts=range[0];pts<range[1];pts+=100)for(const kind of ["video","audio"])await o.onPacket({kind,ptsMs:pts,keyframe:true,bytes:new Uint8Array(100)});
 },finish:async()=>{}})}};
 context.window=context;vm.runInNewContext(fs.readFileSync(path.join(__dirname,"../native-player.js"),"utf8"),context);
 const exchange={stream:async(_,__,o)=>{
  await o.onData([0,1000]);await new Promise(r=>{release=r;});
  await o.onData([1000,5000]);while(!o.cancel.cancelled&&phase<3)await sleep(1);
  if(!o.cancel.cancelled)await o.onData([5000,60000]);
 }};
 const p=context.JellyfinNativePlayer.create({dependencies:{clock:()=>now,exchange,media,io:{close(){}}},onBuffer:s=>states.push(s)});
 await sleep(25);assert.equal(p.stats().buffering,true);assert.equal(decoded,0,"Wait for time-based startup preload");
 release();await sleep(25);assert.equal(p.stats().buffering,false);
 for(let i=0;i<52;i++){now+=100;await sleep(10);}
 assert.equal(p.stats().buffering,true,"Network starvation enters refill rather than racing the media clock");
 const frozen=p.stats().seconds;now+=1500;await sleep(20);assert.equal(p.stats().seconds,frozen);
 assert.equal(p.togglePause(),true);now+=500;assert.equal(p.stats().seconds,frozen);assert.equal(p.togglePause(),false);
 phase=3;await sleep(40);assert.equal(p.stats().buffering,false,"New packets resume without waiting for EOF");
 assert.ok(p.stats().seconds<=frozen+.1,"Resume shifts the clock, no catch-up burst");
 assert.ok(p.stats().bufferedSeconds<=20.1,"Forward fetch stops at its time watermark");
 assert.ok(p.stats().queuedBytes<=16777216&&p.stats().queuedPackets<=4096);
 await p.stop();assert.ok(stopped,"Cancellation wakes a backpressured download and releases media");
 assert.ok(states.some(s=>s.buffering)&&states.some(s=>!s.buffering));
 console.log("PASS: timed startup, starvation/refill, frozen A/V clock, pause during refill, bounded forward download and cancellation (host mocks).");
}
run().catch(e=>{console.error(e);process.exitCode=1;});
