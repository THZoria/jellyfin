"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const root=path.join(__dirname,".."),source=fs.readFileSync(path.join(root,"runtime-mode.js"),"utf8");
function context(extra={}){const g={...extra};g.window=g;vm.createContext(g);vm.runInContext(source,g);return g;}
async function run(){
 // Execute the packaged bootstrap on a classic Launcher with no resident SDK.
 // SDK definitions alone must never cause a native display to start.
 const g=context({engine:{}}),pkg=JSON.parse(fs.readFileSync(path.join(root,"dist/jellyfin-civswitch.civapp"),"utf8"));
 for(const script of pkg.scripts)if(script.name!=="app.js")vm.runInContext(script.source,g,{filename:script.name});
 assert.ok(g.CivHomebrewSDK);assert.equal(g.CivNanoVGSession.current,null);assert.equal(g.JellyfinRuntime.sharedSession(),null);
 g.CivHomebrewSDK.app.mount=()=>{throw Error("Must not start a second display");};
 assert.equal(await g.JellyfinRuntime.mount({}),null);
 const classic=context();assert.equal(await classic.JellyfinRuntime.mount({}),null);
 let mounted=0,starts=0;
 const session={renderer:{owner:{}}},view={},registry={current:session,start(){starts++;}};
 const native=context({engine:{},CivAppsNativeUI:{sessions:registry},CivHomebrewSDK:{app:{mount:async node=>{mounted++;assert.equal(node.native,"1");return view;}}}});
 const node={setAttribute(k,v){assert.equal(k,"data-civ-native-ui");this.native=v;}};
 assert.equal(await native.JellyfinRuntime.mount(node),view);assert.equal(native.JellyfinRuntime.sharedSession(),session);assert.equal(mounted,1);assert.equal(starts,0);
 // Wait for a Launcher handoff instead of racing it into classic mode.
 const pendingRegistry={current:null};pendingRegistry.pending=Promise.resolve().then(()=>{pendingRegistry.current=session;});
 native.CivAppsNativeUI.sessions=pendingRegistry;assert.equal(await native.JellyfinRuntime.mount(node),view);
 native.CivHomebrewSDK.app.mount=async()=>{throw Error("Native owner failed");};
 await assert.rejects(native.JellyfinRuntime.mount(node),/Native owner failed/);
 native.CivAppsNativeUI.sessions={current:{renderer:{}}};
 await assert.rejects(native.JellyfinRuntime.mount(node),/Affichage natif indisponible/);
 native.CivAppsNativeUI.sessions={pending:Promise.reject(Error("Launcher handoff failed"))};
 await assert.rejects(native.JellyfinRuntime.mount(node),/Launcher handoff failed/);
 console.log("PASS: actual bundled bootstrap on classic Launcher, shared owner detection, pending handoff and no fallback on native failures.");
}
run().catch(e=>{console.error(e);process.exitCode=1;});
