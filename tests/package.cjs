"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const root=path.join(__dirname,"..");
const manifest=JSON.parse(fs.readFileSync(path.join(root,"payload.json"),"utf8"));
const pkg=JSON.parse(fs.readFileSync(path.join(root,"dist/jellyfin-civswitch.civapp"),"utf8"));
assert.equal(pkg.metadata.release,"0.0.1");assert.equal(pkg.metadata.author,"SaoriYuki");assert.equal(pkg.id,"jellyfin-civswitch");assert.ok(pkg.icon.startsWith("data:image/png;base64,"));
assert.deepEqual(pkg.scripts.map(s=>s.name),manifest.scripts);
for(const s of pkg.scripts){assert.equal(s.source,fs.readFileSync(path.join(root,s.name),"utf8").replace(/\r\n/g,"\n"));new vm.Script(s.source,{filename:s.name});}
assert.equal(pkg.scripts.at(-1).name,"app.js");
assert.ok(!pkg.scripts.some(s=>/probe-data|video-probe|local-file-probe|moonlight-stream/.test(s.name)),"No probe fixtures or unrelated Sunshine runtime in the package");
assert.ok(pkg.scripts.some(s=>s.name==="native-player.js"));assert.ok(pkg.scripts.some(s=>s.name==="matroska.js"));
assert.ok(pkg.scripts.some(s=>s.name==="vendor/moonlight-native-media-vod.js"));
assert.ok(pkg.scripts.some(s=>s.name==="vod-pacer.js"));
assert.ok(pkg.scripts.some(s=>s.name==="player-layout.js"));
assert.ok(pkg.scripts.some(s=>s.name==="playback-options.js"));
console.log("PASS: rebuilt 0.0.1 package, SaoriYuki, PNG icon, exact sources, fullscreen layout, VOD adapter and final lifetime entry.");
