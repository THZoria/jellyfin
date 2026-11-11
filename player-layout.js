/* Pure letterbox/pillarbox geometry in the current Gameface viewport's CSS pixels.
 * Use display dimensions (when supplied) to honour pixel aspect ratio as well.
 */
(function(g){
 "use strict";
 function positive(n){return Number.isFinite(n)&&n>0&&n<=32768;}
 function fit(viewWidth,viewHeight,videoWidth,videoHeight){
  var w=positive(viewWidth)?Math.max(1,Math.floor(viewWidth)):1280;
  var h=positive(viewHeight)?Math.max(1,Math.floor(viewHeight)):720;
  var valid=positive(videoWidth)&&positive(videoHeight),vw=valid?videoWidth:16,vh=valid?videoHeight:9;
  var scale=Math.min(w/vw,h/vh);
  var width=Math.max(1,Math.min(w,Math.floor(vw*scale))),height=Math.max(1,Math.min(h,Math.floor(vh*scale)));
  return {left:Math.floor((w-width)/2),top:Math.floor((h-height)/2),width:width,height:height};
 }
 g.JellyfinPlayerLayout={fit:fit};
})(typeof window!=="undefined"?window:globalThis);
