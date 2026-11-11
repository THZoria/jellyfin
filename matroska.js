/* Bounded incremental Matroska demux: AVC/Annex-B access units + stereo Opus.
 * No video/audio decoding in JS, no whole-file buffering, no remote code eval.
 */
(function(g){
 "use strict";
 var masters={0x18538067:0,0x1549a966:1,0x1654ae6b:1,0xae:2,0xe0:3,0xe1:3,0x1f43b675:1,0xa0:2};
 var leaves={0x2ad7b1:1,0xd7:1,0x83:1,0x86:1,0x63a2:1,0x23e383:1,0xb0:1,0xba:1,0x54b0:1,0x54ba:1,0xb5:1,0x78b5:1,0x9f:1,0xe7:1,0xa3:1,0xa1:1,0xfb:1,0x6d80:1};
 function vint(bytes,at,id){
  if(at>=bytes.length)return null;var first=bytes[at],mask=128,length=1;while(mask&&!(first&mask)){mask>>=1;length++;}
  if(!mask||length>(id?4:8))throw Error("Matroska : entier EBML invalide.");if(at+length>bytes.length)return null;
  var value=id?first:first&(mask-1),unknown=!id&&(first&(mask-1))===mask-1;
  for(var i=1;i<length;i++){value=value*256+bytes[at+i];unknown=unknown&&bytes[at+i]===255;}
  if(!unknown&&!Number.isSafeInteger(value))throw Error("Matroska : taille EBML excessive.");return {value:value,length:length,unknown:unknown};
 }
 function uint(a){if(!a.length||a.length>8)throw Error("Matroska : entier invalide.");var n=0;for(var b of a)n=n*256+b;if(!Number.isSafeInteger(n))throw Error("Matroska : entier trop grand.");return n;}
 function ascii(a){if(a.length>128)throw Error("Matroska : identifiant codec trop long.");var s="";for(var b of a){if(b<32||b>126)throw Error("Matroska : codec invalide.");s+=String.fromCharCode(b);}return s;}
 function avc(a){
  if(a.length<7||a[0]!==1)throw Error("Matroska : configuration H.264 AVC absente.");
  var lengthSize=(a[4]&3)+1,at=6,sps=null,pps=null,count=a[5]&31;
  function nal(){if(at+2>a.length)throw Error("AVC : configuration incomplete.");var n=a[at]*256+a[at+1];at+=2;if(!n||at+n>a.length||n>65536)throw Error("AVC : NAL de configuration invalide.");var b=a.slice(at,at+n);at+=n;return b;}
  for(var i=0;i<count;i++){var b=nal();if(!sps)sps=b;}
  if(at>=a.length)throw Error("AVC : PPS absent.");count=a[at++];for(var i=0;i<count;i++){var b=nal();if(!pps)pps=b;}
  if(!sps||!pps||sps.length<4||(sps[0]&31)!==7||(pps[0]&31)!==8)throw Error("AVC : SPS/PPS invalides.");
  return {lengthSize:lengthSize,sps:sps,pps:pps};
 }
 function annex(a,size){var at=0,total=0,nals=[];while(at<a.length){if(at+size>a.length)throw Error("AVC : taille NAL incomplete.");var n=0;for(var i=0;i<size;i++)n=n*256+a[at++];if(n<1||at+n>a.length)throw Error("AVC : NAL tronquee.");nals.push(a.subarray(at,at+n));at+=n;total+=n+4;if(total>1048576||nals.length>1024)throw Error("AVC : image trop grande.");}var out=new Uint8Array(total),p=0;for(var b of nals){out[p+3]=1;p+=4;out.set(b,p);p+=b.length;}return out;}
 function opusDuration(a){if(!a.length)throw Error("Opus : paquet vide.");var config=a[0]>>3,code=a[0]&3,n=code===0?1:code===3?(a.length>1?a[1]&63:0):2;
  var per=config>=16?2.5*Math.pow(2,config&3):config>=12?10*Math.pow(2,config&1):[10,20,40,60][config&3];
  if(!n||n*per>120)throw Error("Opus : duree invalide.");return n*per;
 }
 function splitBlock(a){
  var t=vint(a,0,false);if(!t||t.unknown||t.value<1||t.value>255||t.length+3>a.length)throw Error("Matroska : bloc invalide.");
  var at=t.length,time=(a[at]<<8)|a[at+1];if(time&32768)time-=65536;var flags=a[at+2];at+=3;var lace=(flags>>1)&3,count=1,sizes=[];
  if(lace){if(at>=a.length)throw Error("Matroska : lacing incomplet.");count=a[at++]+1;
   if(lace===1){for(var i=0;i<count-1;i++){var n=0,b;do{if(at>=a.length)throw Error("Matroska : lacing Xiph tronque.");b=a[at++];n+=b;}while(b===255);sizes.push(n);}}
   else if(lace===2){if((a.length-at)%count)throw Error("Matroska : lacing fixe invalide.");for(var i=0;i<count-1;i++)sizes.push((a.length-at)/count);}
   else if(count>1){var v=vint(a,at,false);if(!v||v.unknown)throw Error("Matroska : lacing EBML invalide.");at+=v.length;sizes.push(v.value);for(var i=1;i<count-1;i++){var d=vint(a,at,false);if(!d||d.unknown)throw Error("Matroska : delta EBML invalide.");at+=d.length;sizes.push(sizes[i-1]+d.value-(Math.pow(2,7*d.length-1)-1));}}
  }
  var used=sizes.reduce(function(s,n){return s+n;},0);sizes.push(a.length-at-used);var packets=[];
  for(var n of sizes){if(!Number.isInteger(n)||n<1||n>1048576||at+n>a.length)throw Error("Matroska : bornes de trame invalides.");packets.push(a.subarray(at,at+n));at+=n;}
  if(at!==a.length)throw Error("Matroska : taille de bloc incoherente.");return {track:t.value,time:time,key:!!(flags&128),packets:packets};
 }
 function create(o){
  var buffer=new Uint8Array(0),pos=0,stack=[],skip=0,timeScale=1000000,clusterTime=0,current=null,tracks=[],selected=null,group=null,finished=false;
  function ensureActive(){if(o.cancel&&o.cancel.cancelled)throw Error("Lecture annulee.");}
  async function emitBlock(a,key){
   if(!selected)throw Error("Matroska : pistes absentes avant les images.");var b=splitBlock(a),track=selected.video.number===b.track?selected.video:selected.audio&&selected.audio.number===b.track?selected.audio:null;if(!track)return;
   var pts=(clusterTime+b.time)*timeScale/1000000;
   for(var part of b.packets){ensureActive();var duration=track.type===2?opusDuration(part):track.defaultDuration?track.defaultDuration/1000000:1000/30;
    var bytes=track.type===1?annex(part,track.avc.lengthSize):part.slice();
    await o.onPacket({kind:track.type===1?"video":"audio",ptsMs:pts,durationMs:duration,keyframe:key===undefined?b.key:key,bytes:bytes});pts+=duration;
   }
  }
  async function closeTop(){
   var entry=stack.pop();
   if(entry.id===0xae){if(current){if(tracks.length>=16||!Number.isInteger(current.number)||current.number<1||current.number>255||tracks.some(function(t){return t.number===current.number;}))throw Error("Matroska : numero/nombre de pistes invalide.");tracks.push(current);current=null;}}
   else if(entry.id===0x1654ae6b){
    var video=tracks.find(function(t){return t.type===1&&t.codec==="V_MPEG4/ISO/AVC";}),audio=tracks.find(function(t){return t.type===2&&t.codec==="A_OPUS";});
    if(!video||!Number.isInteger(video.number)||video.number<1||video.number>255||video.width<64||video.height<64||video.width>1920||video.height>1080)throw Error("Matroska : piste H.264/dimensions non prises en charge.");
    video.avc=avc(video.private||new Uint8Array(0));
    if(audio&&(audio.channels!==2||audio.rate!==48000||!audio.private||audio.private.length<19||ascii(audio.private.subarray(0,8))!=="OpusHead"||audio.private[9]!==2||audio.private[18]!==0))throw Error("Matroska : seul Opus stereo 48 kHz sans mapping est accepte.");
    if(tracks.some(function(t){return t.type===2;})&&!audio)throw Error("Matroska : audio non Opus. Verifie le transcodage serveur.");
    selected={video:video,audio:audio||null};await o.onTracks(selected);
   }else if(entry.id===0xa0){var b=group;group=null;if(b&&b.block)await emitBlock(b.block,!b.reference);}
  }
  async function leaf(id,a){
   if(id===0x2ad7b1){timeScale=uint(a);if(timeScale<1||timeScale>1000000000)throw Error("Matroska : echelle de temps invalide.");}
   else if(id===0xe7)clusterTime=uint(a);
   else if(id===0xa3)await emitBlock(a);
   else if(id===0xa1){if(!group)throw Error("Matroska : Block hors groupe.");if(group.block)throw Error("Matroska : plusieurs Block dans un groupe.");group.block=a.slice();}
   else if(id===0xfb){if(group)group.reference=true;}
   else if(current){
    if(id===0xd7)current.number=uint(a);else if(id===0x83)current.type=uint(a);else if(id===0x86)current.codec=ascii(a);else if(id===0x63a2){if(a.length>131072)throw Error("Matroska : configuration excessive.");current.private=a.slice();}
    else if(id===0xb0)current.width=uint(a);else if(id===0xba)current.height=uint(a);else if(id===0x54b0)current.displayWidth=uint(a);else if(id===0x54ba)current.displayHeight=uint(a);else if(id===0x9f)current.channels=uint(a);else if(id===0x23e383)current.defaultDuration=uint(a);
    else if(id===0xb5||id===0x78b5){if(a.length!==4&&a.length!==8)throw Error("Matroska : frequence audio invalide.");var dv=new DataView(a.buffer,a.byteOffset,a.byteLength);current.rate=a.length===4?dv.getFloat32(0,false):dv.getFloat64(0,false);}
    else if(id===0x6d80)throw Error("Matroska : pistes compressees/chiffrees non prises en charge.");
   }
  }
  async function push(bytes){
   ensureActive();if(finished||!(bytes instanceof Uint8Array)||bytes.length>65536)throw Error("Matroska : bloc d'entree invalide.");
   if(buffer.length+bytes.length>2162688)throw Error("Matroska : tampon d'entree depasse.");var joined=new Uint8Array(buffer.length+bytes.length);joined.set(buffer);joined.set(bytes,buffer.length);buffer=joined;
   var offset=0;
   for(;;){
    ensureActive();while(stack.length&&stack[stack.length-1].end!==null&&pos===stack[stack.length-1].end)await closeTop();
    if(skip){var n=Math.min(skip,buffer.length-offset);offset+=n;pos+=n;skip-=n;if(skip)break;continue;}
    var id=vint(buffer,offset,true);if(!id)break;var size=vint(buffer,offset+id.length,false);if(!size)break;
    var header=id.length+size.length,master=Object.prototype.hasOwnProperty.call(masters,id.value);
    if(master){var level=masters[id.value];while(stack.length&&stack[stack.length-1].end===null&&stack[stack.length-1].level>=level)await closeTop();}
    if(size.unknown&&id.value!==0x18538067&&id.value!==0x1f43b675)throw Error("Matroska : taille inconnue non prise en charge.");
    var end=size.unknown?null:pos+header+size.value;
    if(end!==null&&stack.some(function(s){return s.end!==null&&end>s.end;}))throw Error("Matroska : element 0x"+id.value.toString(16)+" hors parent a "+pos+".");
    if(master){
     if(stack.length>=12)throw Error("Matroska : imbrication excessive.");stack.push({id:id.value,end:end,level:masters[id.value]});offset+=header;pos+=header;
     if(id.value===0xae){if(current)throw Error("Matroska : piste imbriquee.");current={number:0,type:0,width:0,height:0,channels:0,rate:48000};}
     if(id.value===0x1f43b675)clusterTime=0;
     if(id.value===0xa0){if(group)throw Error("Matroska : groupe imbrique.");group={block:null,reference:false};}
    }else if(!leaves[id.value]){if(size.unknown)throw Error("Matroska : element inconnu non borne.");offset+=header;pos+=header;skip=size.value;}
    else{
     if(size.value>2097152)throw Error("Matroska : element media excessif.");if(offset+header+size.value>buffer.length)break;
     await leaf(id.value,buffer.subarray(offset+header,offset+header+size.value));offset+=header+size.value;pos+=header+size.value;
    }
   }
   buffer=buffer.slice(offset);
  }
  return {push:push,finish:async function(){await push(new Uint8Array(0));if(buffer.length||skip||stack.some(function(s){return s.end!==null&&s.end!==pos;}))throw Error("Matroska : fin de flux incomplete.");while(stack.length)await closeTop();if(!selected)throw Error("Matroska : aucune piste lisible.");finished=true;},stats:function(){return {bufferBytes:buffer.length,position:pos,tracks:tracks.length};}};
 }
 g.JellyfinMatroska={create:create,avc:avc,annex:annex,opusDuration:opusDuration,splitBlock:splitBlock};
})(typeof window!=="undefined"?window:globalThis);
