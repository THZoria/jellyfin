/* Presentation-time output queue. Retain bounded decoded frames rather than
 * Moonlight's live-stream policy of always selecting the newest available one.
 */
(function(g){
 "use strict";
 function create(o){
  var queue=[],last=null,closed=false;
  function releaseAll(){var failure=null;while(queue.length){var f=queue.shift();try{last.release(f);}catch(e){if(!failure)failure=e;}}if(failure)throw failure;}
  return {pending:function(){return queue.length;},close:function(){if(closed)return;closed=true;releaseAll();},drain:function(options){
   if(closed)throw Error("File de presentation fermee.");last=options;
   try{
    for(var i=0;i<8&&queue.length<4;i++){
     var f=options.acquire();if(!f)break;
     if(queue.some(function(x){return x.index===f.index;}))throw Error("Slot video acquis deux fois.");
     queue.push(f);options.decoded(f);
     if(!f.displayable){queue.pop();options.release(f);}
    }
    queue.sort(function(a,b){return a.timestamp-b.timestamp;});
    if(!queue.length||o.paused())return;
    var now=o.clock();
    // Keep reference decoding intact; skip only already-decoded display frames
    // after a real stall, never as the normal steady-state VOD policy.
    while(queue.length>1&&o.targetAt(queue[1].timestamp)<now-125){options.release(queue.shift());options.superseded("late");}
    var target=o.targetAt(queue[0].timestamp);
    if(!Number.isFinite(target)||target-now>60000)throw Error("Horodatage video natif incoherent.");
    if(target>now+8)return;
    var frame=queue.shift(),owned=true;
    try{options.present(frame,function(){owned=false;});}finally{if(owned)options.release(frame);}
   }catch(e){try{releaseAll();}catch(_){}throw e;}
  }};
 }
 g.JellyfinVodPacer={create:create};
})(typeof window!=="undefined"?window:globalThis);
