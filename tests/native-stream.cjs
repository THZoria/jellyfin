"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),crypto=require("node:crypto"),cp=require("node:child_process");
const root=path.join(__dirname,"..");
const context={Uint8Array,DataView,ArrayBuffer,setTimeout,clearTimeout,performance};context.window=context;
for(const file of ["http-stream.js","matroska.js","vod-pacer.js","native-player.js"])vm.runInNewContext(fs.readFileSync(path.join(root,file),"utf8"),context);
const bytes=fs.readFileSync(path.join(__dirname,"fixtures/native-av.mkv"));
async function demuxFragments(stride,input=bytes){
 const packets=[];let tracks;
 const parser=context.JellyfinMatroska.create({onTracks:async t=>{tracks=t;},onPacket:async p=>{packets.push(p);}});
 for(let at=0;at<input.length;at+=stride)await parser.push(input.subarray(at,Math.min(at+stride,input.length)));
 await parser.finish();return {tracks,packets,stats:parser.stats()};
}
async function run(){
 const baseline=await demuxFragments(16384),tiny=await demuxFragments(17);
 assert.equal(baseline.tracks.video.width,256);assert.equal(baseline.tracks.video.height,144);
 assert.equal(baseline.tracks.audio.channels,2);assert.equal(baseline.tracks.audio.rate,48000);
 assert.equal(baseline.packets.filter(p=>p.kind==="video").length,60);
 assert.ok(baseline.packets.filter(p=>p.kind==="audio").length>=100);
 assert.equal(baseline.stats.bufferBytes,0);
 function element(id,payload){const n=payload.length,size=n<127?Buffer.from([128|n]):Buffer.from([64|(n>>8),n&255]);return Buffer.concat([Buffer.from(id,"hex"),size,payload]);}
 const dimensions=element("e0",Buffer.concat([element("b0",Buffer.from([1,0])),element("ba",Buffer.from([144])),element("54b0",Buffer.from([4])),element("54ba",Buffer.from([3]))]));
 const entry=element("ae",Buffer.concat([element("d7",Buffer.from([1])),element("83",Buffer.from([1])),element("86",Buffer.from("V_MPEG4/ISO/AVC")),element("63a2",Buffer.from(baseline.tracks.video.private)),dimensions]));
 const displayFile=element("18538067",element("1654ae6b",entry));let displayTrack;
 const displayParser=context.JellyfinMatroska.create({onTracks:async t=>{displayTrack=t.video;},onPacket:async()=>{throw Error("Unexpected packet");}});
 for(let at=0;at<displayFile.length;at+=7)await displayParser.push(displayFile.subarray(at,at+7));await displayParser.finish();
 assert.equal(displayTrack.width,256);assert.equal(displayTrack.displayWidth,4);assert.equal(displayTrack.displayHeight,3,"Container display ratio is retained separately from decoded pixel dimensions");
 const digest=p=>crypto.createHash("sha256").update(Buffer.from(p.bytes)).digest("hex");
 assert.deepEqual(tiny.packets.map(p=>[p.kind,p.ptsMs,digest(p)]),baseline.packets.map(p=>[p.kind,p.ptsMs,digest(p)]),"Same packets across arbitrary network fragmentation");
 const live=fs.readFileSync(path.join(__dirname,"fixtures/native-av-live.mkv"));
 const liveResult=await demuxFragments(101,live);assert.equal(liveResult.packets.filter(p=>p.kind==="video").length,60,"Non-seekable FFmpeg output has an unknown-size Segment");
 const unknownCluster=Buffer.from(live),cluster=unknownCluster.indexOf(Buffer.from([0x1f,0x43,0xb6,0x75]));assert.ok(cluster>=0);
 let mask=128,length=1;while(!(unknownCluster[cluster+4]&mask)){mask>>=1;length++;}
 unknownCluster[cluster+4]=mask*2-1;unknownCluster.fill(255,cluster+5,cluster+4+length);
 assert.equal((await demuxFragments(43,unknownCluster)).packets.filter(p=>p.kind==="video").length,60,"Unknown-size Cluster also closes correctly");
 const split=context.JellyfinMatroska.splitBlock;
 assert.deepEqual(Array.from(split(Uint8Array.from([0x81,0,0,0x82,1,3,1,2,3,4,5,6,7])).packets,p=>p.length),[3,4]);
 assert.deepEqual(Array.from(split(Uint8Array.from([0x81,0,0,0x84,2,1,2,3,4,5,6])).packets,p=>p.length),[2,2,2]);
 assert.deepEqual(Array.from(split(Uint8Array.from([0x81,0,0,0x86,2,0x82,0xbf,1,2,3,4,5,6])).packets,p=>p.length),[2,2,2]);
 // Validate the reconstructed Annex-B stream with an actual decoder on the host.
 const video=Buffer.concat([Buffer.from([0,0,0,1]),Buffer.from(baseline.tracks.video.avc.sps),Buffer.from([0,0,0,1]),Buffer.from(baseline.tracks.video.avc.pps),...baseline.packets.filter(p=>p.kind==="video").map(p=>Buffer.from(p.bytes))]);
 const decoded=cp.spawnSync("ffmpeg",["-hide_banner","-loglevel","error","-f","h264","-i","pipe:0","-f","null","-"],{input:video,encoding:"utf8",timeout:20000});
 if(decoded.error)throw decoded.error;assert.equal(decoded.status,0,decoded.stderr);
 let delivered=[];const framing=context.JellyfinHttpStream.create({onData:async b=>{delivered.push(Buffer.from(b));}});
 const chunks=[];for(let i=0;i<bytes.length;i+=7919){const b=bytes.subarray(i,i+7919);chunks.push(Buffer.from(b.length.toString(16)+"\r\n"),b,Buffer.from("\r\n"));}
 const wire=Buffer.concat([Buffer.from("HTTP/1.1 200 OK\r\nContent-Type: video/x-matroska\r\nTransfer-Encoding: chunked\r\n\r\n"),...chunks,Buffer.from("0\r\n\r\n")]);
 for(let i=0;i<wire.length;i+=31)await framing.push(wire.subarray(i,i+31).toString("latin1"));
 assert.equal(framing.end().bytes,bytes.length);assert.deepEqual(Buffer.concat(delivered),bytes);
 const rejected=context.JellyfinHttpStream.create({onData:async()=>{throw Error("Must not deliver");}});
 await assert.rejects(rejected.push("HTTP/1.1 401 Unauthorized\r\nContent-Length: 0\r\n\r\n"),/HTTP 401/);
 const conflicting=context.JellyfinHttpStream.create({onData:async()=>{}});
 await assert.rejects(conflicting.push("HTTP/1.1 200 OK\r\nContent-Length: 1\r\nTransfer-Encoding: chunked\r\n\r\n"),/incompatible/);
 const truncated=context.JellyfinMatroska.create({onTracks:async()=>{},onPacket:async()=>{}});for(let at=0;at<bytes.length-17;at+=16384)await truncated.push(bytes.subarray(at,Math.min(at+16384,bytes.length-17)));await assert.rejects(truncated.finish(),/incomplete/);
 // Run actual HTTP framing + actual demux + actual timed controller together.
 // Only hardware decoding/presentation and socket reads are replaced.
 let videoCount=0,audioCount=0,closed=false,ioClosed=false,tracksReady=false;
 const fakeMedia={videoSetup:()=>{tracksReady=true;},audioSetup:()=>{},videoFrame:(p,n,kind,pts,sps,sn,pps,pn,heap)=>{assert.ok(tracksReady&&n>0&&sn>0&&pn>0);assert.deepEqual([...heap.subarray(p,p+4)],[0,0,0,1]);videoCount++;return 0;},audioFrame:()=>{audioCount++;},drainVideo:()=>{},finishVideo:()=>false,drainAudio:()=>{},close:()=>{closed=true;},stats:()=>({decoded:videoCount,presented:videoCount,decoderPending:0,audioBufferedMsUpperBound:0})};
 let mono=0,ended=false,retryOnce=true,reportedFormat=null;
 const submit=fakeMedia.videoFrame;fakeMedia.videoFrame=(...args)=>{if(retryOnce){retryOnce=false;return -1;}return submit(...args);};
 const exchange={stream:async(_,headers,o)=>{
  assert.equal(headers.Authorization,"TEST-HEADER");const f=context.JellyfinHttpStream.create(o);
  for(let at=0;at<wire.length;at+=16384){if(o.cancel.cancelled)throw Error("Cancelled");await f.push(wire.subarray(at,at+16384).toString("latin1"));}return f.end();
 }};
 const player=context.JellyfinNativePlayer.create({url:"http://test.invalid/video",headers:{Authorization:"TEST-HEADER"},dependencies:{exchange,io:{close:()=>{ioClosed=true;}},media:fakeMedia,clock:()=>mono+=2},onFormat:f=>{reportedFormat=f;},onEnded:()=>{ended=true;}});
 const result=await player.finished;assert.equal(result.ok,true,result.error);assert.equal(videoCount,60);assert.ok(audioCount>=100);assert.ok(closed&&ioClosed&&ended);
 assert.equal(reportedFormat.width,256);assert.equal(reportedFormat.height,144);assert.ok(reportedFormat.displayWidth>0&&reportedFormat.displayHeight>0,"Decoded/display geometry is exposed to the fullscreen UI");
 assert.ok(player.stats().closed);
 // Socket backpressure / cancellation must not outlive native resources.
 let cancelled=false,freed=false;
 const idle=context.JellyfinNativePlayer.create({dependencies:{exchange:{stream:async(_,__,o)=>{while(!o.cancel.cancelled)await new Promise(r=>setTimeout(r,1));cancelled=true;throw Error("Cancelled");}},io:{close:()=>{freed=true;}},media:Object.assign({},fakeMedia,{close:()=>{assert.ok(cancelled);}})}});
 await new Promise(r=>setTimeout(r,5));await idle.stop();assert.ok(cancelled&&freed);
 let rafCancelled=0,rafCalls=0;
 context.requestAnimationFrame=()=>{rafCalls++;return 10;};context.cancelAnimationFrame=()=>{rafCancelled++;};
 const stalled=context.JellyfinNativePlayer.create({dependencies:{exchange:{stream:async(_,__,o)=>{while(!o.cancel.cancelled)await new Promise(r=>setTimeout(r,1));}},io:{close:()=>{}},media:fakeMedia}});
 await new Promise(r=>setTimeout(r,5));assert.ok(rafCalls>0);await stalled.stop();assert.ok(rafCancelled>0,"Stop cancels and wakes a stalled render callback");
 delete context.requestAnimationFrame;delete context.cancelAnimationFrame;
 let unsafeFreed=false;
 const unsafe=context.JellyfinNativePlayer.create({dependencies:{exchange:{stream:async()=>{throw Error("transport failed");}},io:{close:()=>{unsafeFreed=true;}},media:Object.assign({},fakeMedia,{close:()=>{throw Error("uncertain GPU release");}})}});
 const unsafeResult=await unsafe.finished;assert.equal(unsafeResult.ok,false);assert.ok(context.__jellyfinNativeQuarantine);assert.equal(unsafeFreed,false,"Do not free resources while native ownership is uncertain");
 delete context.__jellyfinNativeQuarantine;
 console.log("PASS: real H.264/Opus Matroska fixture, fragmented/chunked HTTP, Annex-B decoded by host FFmpeg, timed native-controller mocks and teardown. Console GPU/audio not tested.");
}
run().catch(e=>{console.error(e);process.exitCode=1;});
