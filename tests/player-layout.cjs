"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const context={};context.window=context;vm.runInNewContext(fs.readFileSync(path.join(__dirname,"../player-layout.js"),"utf8"),context);
const fit=(...args)=>JSON.parse(JSON.stringify(context.JellyfinPlayerLayout.fit(...args)));
assert.deepEqual(fit(1920,1080,1280,720),{left:0,top:0,width:1920,height:1080});
assert.deepEqual(fit(1280,720,1920,1080),{left:0,top:0,width:1280,height:720});
assert.deepEqual(fit(1920,1080,4,3),{left:240,top:0,width:1440,height:1080});
assert.deepEqual(fit(1280,720,4,3),{left:160,top:0,width:960,height:720});
assert.deepEqual(fit(1920,1080,1920,800),{left:0,top:140,width:1920,height:800});
assert.deepEqual(fit(1080,1920,1920,1080),{left:0,top:656,width:1080,height:607});
for(const [w,h]of [[1920,1080],[1280,720],[3840,2160],[1365,767],[800,1280]])for(const [vw,vh]of [[16,9],[4,3],[21,9],[9,16],[256,144],[1280,536]]){
 const b=fit(w,h,vw,vh);assert.ok(b.left>=0&&b.top>=0&&b.width>0&&b.height>0&&b.left+b.width<=w&&b.top+b.height<=h);
 assert.ok(Math.abs(b.width-b.height*vw/vh)<=Math.max(1,vw/vh),"Aspect ratio preserved within pixel rounding");
 assert.ok(Math.abs((w-b.width)-b.left*2)<=1&&Math.abs((h-b.height)-b.top*2)<=1,"Black bars are centered");
}
assert.deepEqual(fit(0,NaN,0,Infinity),{left:0,top:0,width:1280,height:720});
console.log("PASS: Switch 2 1080p/720p, 4:3, widescreen/portrait, centered black bars and safe fallbacks; no cropping or arbitrary zoom.");
