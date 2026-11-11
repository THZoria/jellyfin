/* Pure media timeline and Jellyfin subtitle selection helpers. */
(function(g){
 "use strict";
 function duration(item,source){var ticks=Number(source&&source.RunTimeTicks)||Number(item&&item.RunTimeTicks);return Number.isFinite(ticks)&&ticks>0?ticks/10000000:null;}
 function clamp(seconds,length){seconds=Number(seconds);if(!Number.isFinite(seconds))seconds=0;return Math.max(0,length?Math.min(seconds,Math.max(0,length-1)):seconds);}
 function subtitles(source){return (source.MediaStreams||[]).filter(function(s){return s.Type==="Subtitle"&&Number.isInteger(s.Index)&&s.Index>=0;}).map(function(s){return {index:s.Index,label:s.DisplayTitle||[s.Title,s.Language,s.Codec,s.IsForced?"Force":""].filter(Boolean).join(" · ")||"Piste "+s.Index};});}
 function time(seconds){seconds=Math.floor(Math.max(0,Number(seconds)||0));var h=Math.floor(seconds/3600),m=Math.floor(seconds/60)%60,s=seconds%60;return (h?h+":"+(m<10?"0":""):"")+m+":"+(s<10?"0":"")+s;}
 function streamOptions(offset,subtitle){return {StartTimeTicks:Math.round(Math.max(0,offset)*10000000),SubtitleStreamIndex:subtitle===null?-1:subtitle,SubtitleMethod:subtitle===null?"Drop":"Encode"};}
 g.JellyfinPlaybackOptions={duration:duration,clamp:clamp,subtitles:subtitles,time:time,streamOptions:streamOptions};
})(typeof window!=="undefined"?window:globalThis);
