/* Simulates the bridge boundary; does NOT validate SDK symbol lookup or real hardware. */
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const context = {setTimeout:(fn) => setImmediate(fn)};
context.window = context;
for (const file of ["runtime/http.js", "runtime/dns.js", "../http-stream.js", "../native-http.js"]) {
    vm.runInNewContext(fs.readFileSync(path.join(__dirname,file),"utf8"),context);
}
function mock(response, options = {}) {
    const allocations = new Map(), sockets = new Map(), sent = [], connections = [];
    let next = 1024n, fd = 10, cleanup = 0, errno = 11;
    function region(p,n) {
        for (const [start,bytes] of allocations) if (p>=start && p+BigInt(n)<=start+BigInt(bytes.length)) return {bytes,off:Number(p-start)};
        throw Error("Out-of-bounds mock pointer");
    }
    const b = {
        alloc(n) { const p=next; next+=BigInt(n+16); allocations.set(p,Buffer.alloc(n)); return p; },
        free(p) { assert.ok(allocations.delete(p),"No double free"); },
        put(p,s) { const {bytes,off}=region(p,s.length); Buffer.from(s,"latin1").copy(bytes,off); },
        get(p,n) { const {bytes,off}=region(p,n); return bytes.subarray(off,off+n).toString("latin1"); },
        call(name,...args) {
            if (name.includes("GetCurrentIpConfigInfo")) { b.put(args[3],"\x01\x01\x01\x01"); return 0n; }
            if (name.includes("GenerateCryptographicallyRandomBytes")) { b.put(args[0],"\x12\x34"); return 0n; }
            name=name.replace("_ZN2nn6socket","");
            if (name==="6SocketEiii") { const number=fd++; sockets.set(number,{type:args[1],wire:"",reads:0,connects:0}); return BigInt(number); }
            if (name==="5CloseEi") { assert.ok(sockets.delete(args[0]),"Socket closed once"); cleanup++; return 0n; }
            if (name==="5FcntlEiiz") return 0n;
            if (name==="12GetLastErrnoEv") return BigInt(errno);
            const socket=sockets.get(args[0]); assert.ok(socket,"Valid descriptor");
            if (name==="7ConnectEiPK8sockaddrj") {
                connections.push(b.get(args[1],16));
                if (socket.type===1 && socket.connects++===0) { errno=115; return -1n; }
                return 0n;
            }
            if (name==="4SendEiPKvmi") {
                const count=socket.type===2 ? args[2] : Math.min(37,args[2]);
                socket.wire+=b.get(args[1],count); sent.push(socket); return BigInt(count);
            }
            if (name==="4RecvEiPvmi") {
                if (socket.type===2) {
                    const question=socket.wire.slice(12);
                    const reply="\x12\x34\x81\x80\x00\x01\x00\x01\x00\x00\x00\x00"+question+
                        "\xc0\x0c\x00\x01\x00\x01\x00\x00\x00\x3c\x00\x04\xc0\xa8\x01\x0a";
                    b.put(args[1],reply); return BigInt(reply.length);
                }
                if (options.cancel) { options.cancel.cancelled=true; errno=11; return -1n; }
                if (socket.reads++===0) { errno=11; return -1n; }
                socket.offset=socket.offset||0;
                const part=response.slice(socket.offset,socket.offset+53); socket.offset+=part.length;
                b.put(args[1],part); return BigInt(part.length);
            }
            throw Error("Unexpected SDK call "+name);
        }
    };
    return {b,allocations,sockets,sent,connections,get cleanup(){return cleanup;}};
}
function response(status,body) {
    const bytes=Buffer.from(body,"utf8").toString("latin1");
    return "HTTP/1.1 "+status+" Result\r\nContent-Type: application/json\r\nContent-Length: "+bytes.length+"\r\n\r\n"+bytes;
}
function options() { return {cancel:{cancelled:false},deadline:Date.now()+5000}; }
function released(m) { assert.equal(m.sockets.size,0); assert.equal(m.allocations.size,0); }
async function run() {
    const http=context.JellyfinNativeHttp;
    assert.equal(http.available,false);
    assert.throws(()=>http.create(),/Pont natif/);
    assert.throws(()=>http.target("https://example.com"),/HTTP uniquement/);
    assert.throws(()=>http.target("http://example.com:99999"),/Port HTTP/);
    assert.throws(()=>http.target("http://example.com/path\r\nHeader: injected"));
    const m=mock(response(200,'{"Version":"12.0.0","Name":"été 🍿"}'));
    const exchange=http.create(m.b);
    const result=await exchange("http://vpn.example.com:8096/System/Info/Public","GET",{Accept:"application/json"},null,options());
    assert.equal(result.status,200);
    assert.equal(JSON.parse(result.body).Name,"été 🍿");
    assert.equal(m.cleanup,2,"UDP DNS and TCP cleaned up");
    const tcp=m.sent.find(s=>s.type===1);
    assert.match(tcp.wire,/^GET \/System\/Info\/Public HTTP\/1.1\r\nHost: vpn.example.com:8096\r\n/);
    assert.ok(m.connections.some(s=>s.charCodeAt(2)===31 && s.charCodeAt(3)===160),"Port 8096 encoded in network byte order");
    released(m);
    const post=mock(response(400,"{}"));
    const body=JSON.stringify({Username:"élise",Pw:"秘密"});
    await http.create(post.b)("http://192.168.1.10:8096/Users/AuthenticateByName","POST",{"Content-Type":"application/json"},body,options());
    const wire=post.sent[0].wire;
    assert.match(wire,/^POST \/Users\/AuthenticateByName HTTP\/1.1/);
    assert.equal(Number(/Content-Length: (\d+)/.exec(wire)[1]),Buffer.byteLength(body));
    assert.equal(Buffer.from(wire.split("\r\n\r\n")[1],"latin1").toString("utf8"),body);
    assert.equal(post.cleanup,1,"IPv4 skips DNS"); released(post);
    const chunk=mock("HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\n\r\n2\r\n{}\r\n0\r\n\r\n");
    assert.equal((await http.create(chunk.b)("http://127.0.0.1/","GET",{},null,options())).body,"{}"); released(chunk);
    const big=mock("HTTP/1.1 200 OK\r\nContent-Length: 2097153\r\n\r\n");
    await assert.rejects(http.create(big.b)("http://127.0.0.1/","GET",{},null,options()),/size limit/); released(big);
    const cancelled={cancelled:false},cancel=mock("",{cancel:cancelled});
    await assert.rejects(http.create(cancel.b)("http://127.0.0.1/","GET",{},null,{cancel:cancelled,deadline:Date.now()+5000}),/annulee/); released(cancel);
    const expired=mock("");
    await assert.rejects(http.create(expired.b)("http://127.0.0.1/","GET",{},null,{cancel:{cancelled:false},deadline:0}),/Delai/); released(expired);
    const binary="\x1a\x45\xdf\xa3\xff\x00\x80",streamed=mock("HTTP/1.1 200 OK\r\nContent-Type: video/x-matroska\r\nContent-Length: 7\r\n\r\n"+binary),chunks=[];
    const summary=await http.create(streamed.b).stream("http://127.0.0.1:8096/video",{Authorization:"TEST-HEADER"},{cancel:{cancelled:false},onData:async b=>{chunks.push(Buffer.from(b));}});
    assert.equal(summary.bytes,7);assert.equal(Buffer.concat(chunks).toString("latin1"),binary,"Binary video is not UTF-8/JSON decoded");released(streamed);
    console.log("PASS: native HTTP boundary mocks (DNS, GET, UTF-8 POST, partial I/O, chunked, limits, cancellation, cleanup). SDK/hardware not validated.");
}
run().catch(e=>{console.error(e);process.exitCode=1;});
