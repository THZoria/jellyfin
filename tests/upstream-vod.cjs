/* Run the upstream media regression suite against our generated derivative.
 * Only this isolated test process redirects the single source-file read.
 * The upstream checkout and its tests are never edited.
 */
"use strict";
const fs=require("node:fs"),path=require("node:path");
const base=path.join(__dirname,"../.deps/moonlight");
const upstream=path.resolve(base,"app/src/streaming/native-media.js");
const derived=path.resolve(__dirname,"../vendor/moonlight-native-media-vod.js");
const original=fs.readFileSync;
fs.readFileSync=function(file,...args){const match=typeof file==="string"&&(path.resolve(file)===upstream||file.replace(/\\/g,"/")==="app/src/streaming/native-media.js");return original.call(this,match?derived:file,...args);};
require(path.join(base,"tests/test-media-queues.cjs"));
