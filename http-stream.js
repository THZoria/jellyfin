/* Incremental binary HTTP/1.1 framing with awaited backpressure. No whole-film buffer. */
(function(g){
 "use strict";
 function create(o){
  var pending="",headers=null,status=0,total=0,expected=null,chunked=false,remaining=null,state="head",done=false,trailerBytes=0;
  function fail(s){throw Error("Flux HTTP : "+s);}
  async function deliver(s){if(!s.length)return;total+=s.length;if(total>(o.maxTotalBytes||17179869184))fail("limite de duree/taille depassee.");var bytes=new Uint8Array(s.length);for(var i=0;i<s.length;i++)bytes[i]=s.charCodeAt(i);await o.onData(bytes);}
  async function push(s){
   if(typeof s!=="string"||s.length>65536||/[^\x00-\xff]/.test(s))fail("bloc binaire invalide.");
   if(done&&s.length)fail("donnees apres la fin.");pending+=s;
   for(;;){
    if(state==="head"){
     var at=pending.indexOf("\r\n\r\n");if(at<0){if(pending.length>32768)fail("en-tetes trop grands.");return;}if(at>32768)fail("en-tetes trop grands.");
     var lines=pending.slice(0,at).split("\r\n"),m=/^HTTP\/1\.[01] ([2-5]\d\d)(?: [\x20-\x7e]*)?$/.exec(lines.shift());if(!m)fail("statut invalide.");status=Number(m[1]);headers={};
     lines.forEach(function(line){var p=/^([!#$%&'*+.^_`|~0-9A-Za-z-]+):[ \t]*([^\x00-\x08\x0a-\x1f\x7f]*)$/.exec(line);if(!p)fail("en-tete invalide.");var key=p[1].toLowerCase();if(headers[key]!==undefined&&["content-length","transfer-encoding","content-encoding","location"].indexOf(key)>=0)fail("en-tete duplique.");headers[key]=p[2].trim();});
     if(status!==200)fail("HTTP "+status+" pour la demande video.");
     if(headers["content-encoding"]&&headers["content-encoding"].toLowerCase()!=="identity")fail("compression HTTP non prise en charge.");
     if(headers["transfer-encoding"]!==undefined){if(headers["content-length"]!==undefined||headers["transfer-encoding"].toLowerCase()!=="chunked")fail("encadrement incompatible.");chunked=true;}
     if(headers["content-length"]!==undefined){if(!/^\d+$/.test(headers["content-length"]))fail("longueur invalide.");expected=Number(headers["content-length"]);if(!Number.isSafeInteger(expected)||expected>(o.maxTotalBytes||17179869184))fail("longueur excessive.");}
     pending=pending.slice(at+4);state=chunked?"size":"plain";if(o.onHeaders)await o.onHeaders(status,headers);
    }else if(state==="plain"){
     if(expected!==null&&total+pending.length>expected)fail("corps plus grand que declare.");var piece=pending;pending="";await deliver(piece);if(expected!==null&&total===expected)done=true;return;
    }else if(state==="size"){
     var e=pending.indexOf("\r\n");if(e<0){if(pending.length>1024)fail("taille de chunk invalide.");return;}
     var line=pending.slice(0,e);if(!/^[0-9a-f]{1,8}(?:;[\x20-\x7e]*)?$/i.test(line))fail("taille de chunk invalide.");remaining=parseInt(line,16);pending=pending.slice(e+2);state=remaining?"chunk":"trailers";
    }else if(state==="chunk"){
     if(!pending.length)return;var n=Math.min(remaining,pending.length),part=pending.slice(0,n);pending=pending.slice(n);remaining-=n;await deliver(part);if(!remaining)state="crlf";
    }else if(state==="crlf"){
     if(pending.length<2)return;if(pending.slice(0,2)!=="\r\n")fail("terminaison chunk invalide.");pending=pending.slice(2);state="size";
    }else if(state==="trailers"){
     var end=pending.indexOf("\r\n");if(end<0){if(pending.length>32768)fail("trailers excessifs.");return;}
     trailerBytes+=end+2;if(trailerBytes>32768)fail("trailers excessifs.");var trailer=pending.slice(0,end);pending=pending.slice(end+2);if(!trailer){done=true;state="done";if(pending.length)fail("donnees apres la fin.");return;}
     if(!/^[A-Za-z0-9-]+:[\x20-\x7e\t]*$/.test(trailer)||/^(content-length|transfer-encoding|location):/i.test(trailer))fail("trailer invalide.");
    }else return;
   }
  }
  return {push:push,done:function(){return done;},end:function(){if(!headers||pending.length||chunked&&!done||expected!==null&&total!==expected)fail("flux incomplet.");done=true;return {status:status,headers:headers,bytes:total};}};
 }
 g.JellyfinHttpStream={create:create};
})(typeof window!=="undefined"?window:globalThis);
