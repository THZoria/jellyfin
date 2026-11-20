"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
async function run(){
 const subscriptions=[],components=[];let overlays=0,releases=0;
 const engine={on(name,fn,owner){const s={name,fn,owner};subscriptions.push(s);return {clear(){const i=subscriptions.indexOf(s);if(i>=0)subscriptions.splice(i,1);}};},off(name,fn,owner){const i=subscriptions.findIndex(s=>s.name===name&&s.fn===fn&&s.owner===owner);if(i>=0)subscriptions.splice(i,1);}};
 class Node{
  constructor(){this.children=[];this.style={};this.value="";}
  appendChild(n){this.children.push(n);n.parentNode=this;}removeChild(n){this.children.splice(this.children.indexOf(n),1);n.parentNode=null;}
  setAttribute(k,v){this[k]=v;}focus(){}blur(){}
 }
 const root=new Node(),session={renderer:{owner:{}},active:{root,lease:{}}};
 const g={setTimeout,clearTimeout,engine,addEventListener(){},removeEventListener(){},CivNanoVGSession:{current:session},
  CivSDKKeyboard:{open(o){assert.equal(o.root,root);assert.equal(o.session,session);overlays++;return {close(){releases++;}};}},
  document:{createElement(tag){const n=new Node();if(tag==="fxs-textbox"){
   const c={textInput:new Node(),onActivate(){assert.equal(this.textInput.value,"");engine.on("IMEValidated",this.onVirtualKeyboardTextEntered,this);},
    onVirtualKeyboardTextEntered(){this.clearVirtualKeyboardCallbacks();},clearVirtualKeyboardCallbacks(){engine.off("IMEValidated",this.onVirtualKeyboardTextEntered,this);}};
   n.maybeComponent=c;components.push(c);
  }return n;}}};g.window=g;
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,"../vendor/civhomebrew/keyboard.js"),"utf8"),g);
 const keyboard=g.CivKeyboard.create({root,native:()=>true,loadTextbox:async()=>({}),focus(){},error(e){throw Error(e);}});
 for(const field of [{text:"alic.z@jellyfin.test",max:512,secret:false},{text:"Ab@*#%123456789!",max:256,secret:true},{text:' @*#%é秘密"\\ ',max:256,secret:true}]){
  const result=keyboard.edit("old text",field.max,field.secret,"Account");await new Promise(r=>setImmediate(r));
  const c=components.at(-1);assert.equal(c.textInput.maxLength,field.max);assert.equal(c.textInput.readOnly,false);
  c.textInput.value="stale DOM text";
  for(const s of subscriptions.slice())if(s.name==="IMEValidated")s.fn.call(s.owner,{data:field.text});
  assert.equal(await result,field.text,"IME confirmation is preserved exactly, not truncated, appended or escaped");
  assert.equal(subscriptions.length,0);assert.equal(root.children.length,0);
 }
 const cancelled=keyboard.edit("saved secret",256,true,"Password");await new Promise(r=>setImmediate(r));keyboard.cancel();assert.equal(await cancelled,null);
 assert.equal(subscriptions.length,0);assert.equal(overlays,4);assert.equal(releases,4);
 g.CivNanoVGSession.current=null;
 const classic=keyboard.edit("",256,true,"Password");await new Promise(r=>setImmediate(r));
 for(const s of subscriptions.slice())if(s.name==="IMEValidated")s.fn.call(s.owner,{data:"Ab@*#%123456789!"});
 assert.equal(await classic,"Ab@*#%123456789!");assert.equal(overlays,4,"Classic keyboard must not acquire a native display overlay");
 assert.equal(subscriptions.length,0);assert.equal(root.children.length,0);
 console.log("PASS: classic/native keyboard preserves 20/16-character credentials and special/Unicode characters; cancellation releases callbacks and overlay.");
}
run().catch(e=>{console.error(e);process.exitCode=1;});
