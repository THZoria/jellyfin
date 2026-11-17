/* Exercise the real upstream H.264 wrapper without native pointers/hardware. */
"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
async function run(){
 let baseOptions,published=0,finished=0,retired=0,closed=0,presented=0;
 const g={Date,CivNanoVGSession:{current:{}},MoonlightNativeModules:{},
  MoonlightNativeDisplay:{prepare:async()=>({context:{rawCall(){}},size:{width:1920,height:1080},present:{timings:{}}}),
   videoBuffer:(n,a)=>{assert.equal(n,1382400);assert.equal(a,4096);return 4096n;},
   publish:(p,w,h,stride,rows)=>{assert.equal(p,4096n);assert.equal(w,1280);assert.equal(h,720);assert.equal(stride,1280);assert.equal(rows,720);published++;},
   finish(){finished++;},async retire(){retired++;}},
  MoonlightStreamMedia:{create(io,core,o){baseOptions=o;return {videoSetup(){},videoFrame(){},drainVideo(){},finishVideo(){},stats:()=>({}),close(){closed++;}};}}};g.window=g;
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,"../vendor/moonlight/app/src/streaming/native-video.js"),"utf8"),g);
 const media=await g.MoonlightNativeVideo.createMedia({}, {}, {mode:{codec:"h264",width:1280,height:720,fps:30},onPresented(){presented++;}});
 assert.equal(baseOptions.renderer,"native-nv12");assert.equal(typeof baseOptions.videoSink,"function","NV12 sink disables legacy Gameface texture and GPU sync pointer resolution");
 const fields={width:1280,height:720,yStride:1280,uvStride:1280,yOffset:0,uvOffset:921600};
 assert.equal(baseOptions.videoOutput(1382400,4096,fields),4096n);
 baseOptions.videoSink(4096n,1382400,fields);assert.equal(published,1);assert.equal(presented,1);
 assert.throws(()=>baseOptions.videoSink(4096n,10,fields),/bounds rejected/);
 await media.close();await media.close();assert.equal(closed,1);assert.equal(finished,1);assert.equal(retired,1);
 console.log("PASS: real upstream H.264 wrapper selects NV12 shared display, validates planes and retires streaming resources exactly once (host mocks).");
}
run().catch(e=>{console.error(e);process.exitCode=1;});
