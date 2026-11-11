/* HTTP socket adapter, using the SDK ABI already used by CivHomebrew's
 * app/src/platform/{native,https-native}.js. No hard-coded symbol addresses.
 * HTTP only: HTTPS is explicitly rejected, never downgraded.
 */
(function (g) {
    "use strict";
    var prefix = "_ZN2nn6socket";
    function bridge() {
        if (typeof sdk_base === "undefined" || typeof call_rop !== "function" ||
            typeof malloc !== "function" || typeof free !== "function" ||
            typeof read_buffer !== "function" || typeof write_buffer !== "function") throw Error("Pont natif CivSwitch indisponible.");
        var cache = {}, mod = sdk_base + read32(sdk_base + 4n);
        if (read32(mod) !== 0x30444f4dn) throw Error("Module SDK non reconnu.");
        var dyn = mod + BigInt.asIntN(32,read32(mod + 4n)), tags = {};
        for (var i=0;i<128;i++) {
            var tag = Number(read64(dyn + BigInt(i*16))); if (!tag) break;
            var value = read64(dyn + BigInt(i*16+8)); tags[tag] = value < sdk_base ? sdk_base + value : value;
        }
        if (!tags[4] || !tags[5] || !tags[6]) throw Error("Table SDK absente.");
        var buckets = Number(read32(tags[4])), count = Number(read32(tags[4]+4n));
        if (buckets<1 || buckets>1000000 || count<1 || count>1000000) throw Error("Bornes SDK invalides.");
        function resolve(name) {
            if (cache[name]) return cache[name];
            var hash=0;
            for(var i=0;i<name.length;i++){hash=((hash<<4)+name.charCodeAt(i))>>>0;var hi=hash&0xf0000000;if(hi)hash^=hi>>>24;hash=(hash&~hi)>>>0;}
            var index=Number(read32(tags[4]+8n+BigInt(hash%buckets*4)));
            for(var step=0;index&&step<count;step++) {
                if(index>=count)throw Error("Chaine SDK invalide.");
                var entry=tags[6]+BigInt(index*24),p=tags[5]+read32(entry),s="";
                for(var j=0;j<512;j++){var c=Number(read8(p+BigInt(j)));if(!c)break;s+=String.fromCharCode(c);}
                if(s===name){var off=read64(entry+8n);if(off)return cache[name]=sdk_base+off;break;}
                index=Number(read32(tags[4]+8n+BigInt((buckets+index)*4)));
            }
            throw Error("Export SDK absent : "+name);
        }
        // Resolve everything before opening sockets or allocating request buffers.
        ["6SocketEiii","5CloseEi","5FcntlEiiz","7ConnectEiPK8sockaddrj","4SendEiPKvmi","4RecvEiPvmi","12GetLastErrnoEv"].forEach(function(n){resolve(prefix+n);});
        resolve("_ZN2nn4nifm22GetCurrentIpConfigInfoEPNS_6socket6InAddrES3_S3_S3_S3_");
        resolve("_ZN2nn6crypto36GenerateCryptographicallyRandomBytesEPvm");
        var transfer=null;
        if(g.PayloadNativeBuffer&&typeof addrof_compressed==="function"&&typeof read64_compressed==="function"&&typeof read32_compressed==="function"&&typeof memcpy_addr==="bigint")
            transfer=g.PayloadNativeBuffer.create({addrof:addrof_compressed,read64:read64_compressed,read32:read32_compressed,read8:read8,call:call_rop,memcpy:memcpy_addr});
        return {
            resolve:resolve,
            call:function(name){return call_rop.apply(null,[resolve(name)].concat(Array.prototype.slice.call(arguments,1).map(BigInt)));},
            alloc:malloc,free:free,
            put:function(p,s){if(transfer)return transfer.write(p,s);var a=new Uint8Array(s.length);for(var i=0;i<s.length;i++)a[i]=s.charCodeAt(i);write_buffer(p,a);},
            get:function(p,n){if(transfer)return transfer.read(p,n);var a=read_buffer(p,n),s="";for(var i=0;i<n;i++)s+=String.fromCharCode(Number(a[i]));return s;}
        };
    }
    function target(url) {
        var m=/^http:\/\/([a-z0-9.-]+)(?::([0-9]{1,5}))?(\/[^\s#]*)?$/i.exec(url);
        if(!m)throw Error("Mode natif : adresse HTTP uniquement, sans identifiants ni fragment.");
        var port=Number(m[2]||80);if(port<1||port>65535)throw Error("Port HTTP invalide.");
        return {host:m[1].toLowerCase(),port:port,path:m[3]||"/",authority:m[1]+(m[2]?":"+m[2]:"")};
    }
    function encode(s){return encodeURIComponent(s).replace(/%([0-9a-f]{2})/gi,function(_,h){return String.fromCharCode(parseInt(h,16));});}
    function decode(s){return decodeURIComponent(s.replace(/[%\x80-\xff]/g,function(c){return "%"+c.charCodeAt(0).toString(16).padStart(2,"0");}));}
    function create(injected) {
        if(!g.CivHttp||!g.CivDns)throw Error("Modules HTTP/DNS de CivHomebrew absents.");
        var b=injected||bridge(),addresses={};
        function call(){return b.call.apply(null,arguments);}
        function sock(name){return Number(BigInt.asIntN(32,call.apply(null,[prefix+name].concat(Array.prototype.slice.call(arguments,1)))));}
        function retry(){return [11,35,4].indexOf(sock("12GetLastErrnoEv"))>=0;}
        function checked(){var r=Number(call.apply(null,arguments)&0x3fffffn);if(r)throw Error("Erreur SDK 0x"+r.toString(16));}
        function active(o){if(o.cancel.cancelled)throw Error("Requete annulee.");if(Date.now()>=o.deadline)throw Error("Delai reseau natif depasse.");}
        function pause(){return new Promise(function(r){setTimeout(r,10);});}
        function take(list,n){var p=b.alloc(n);if(!p)throw Error("Allocation native impossible.");list.push(p);return p;}
        function nonblock(fd){var flags=sock("5FcntlEiiz",fd,3,0);if(flags<0||sock("5FcntlEiiz",fd,4,flags|0x800)<0)throw Error("Mode non bloquant impossible.");}
        function ip(value){var a=value.split(".").map(Number);return a.length===4&&a.every(function(n){return Number.isInteger(n)&&n>=0&&n<=255;});}
        function address(p,value,port){if(!ip(value))throw Error("IPv4 invalide.");b.put(p,String.fromCharCode.apply(null,[16,2,port>>>8,port&255].concat(value.split(".").map(Number),[0,0,0,0,0,0,0,0])));}
        async function dns(host,o,depth) {
            active(o);if(ip(host))return host;
            if(addresses[host]&&addresses[host].expires>Date.now())return addresses[host].ip;
            if(depth>5)throw Error("Limite alias DNS.");
            var list=[],fd=-1;
            try {
                var config=take(list,40);b.put(config,"\0".repeat(40));
                checked("_ZN2nn4nifm22GetCurrentIpConfigInfoEPNS_6socket6InAddrES3_S3_S3_S3_",config,config+8n,config+16n,config+24n,config+32n);
                var servers=[b.get(config+24n,4),b.get(config+32n,4)].map(function(s){return s.split("").map(function(c){return c.charCodeAt(0);}).join(".");}).filter(function(s,i,a){return s!=="0.0.0.0"&&a.indexOf(s)===i;});
                if(!servers.length)throw Error("Aucun serveur DNS configure.");
                var seed=take(list,2);call("_ZN2nn6crypto36GenerateCryptographicallyRandomBytesEPvm",seed,2);
                var bytes=b.get(seed,2),id=bytes.charCodeAt(0)*256+bytes.charCodeAt(1),packet=g.CivDns.query(host,id);
                var wire=take(list,packet.length),buffer=take(list,4096),peer=take(list,16);b.put(wire,packet);
                for(var i=0;i<servers.length;i++) {
                    fd=sock("6SocketEiii",2,2,0);if(fd<0)throw Error("Socket DNS impossible.");
                    nonblock(fd);address(peer,servers[i],53);if(sock("7ConnectEiPK8sockaddrj",fd,peer,16)<0)throw Error("Connexion DNS impossible.");
                    var expires=Math.min(o.deadline,Date.now()+4000),sent=false;
                    while(Date.now()<expires) {
                        active(o);
                        if(!sent){var n=sock("4SendEiPKvmi",fd,wire,packet.length,0x80);if(n===packet.length)sent=true;else if(n>=0||!retry())throw Error("Envoi DNS impossible.");}
                        var n=sock("4RecvEiPvmi",fd,buffer,4096,0x80);
                        if(n>0){var reply=g.CivDns.parse(b.get(buffer,n),host,id);sock("5CloseEi",fd);fd=-1;var value=reply.address||await dns(reply.alias,o,depth+1);addresses[host]={ip:value,expires:Date.now()+60000};return value;}
                        if(n<0&&!retry())throw Error("Reception DNS impossible.");await pause();
                    }
                    sock("5CloseEi",fd);fd=-1;
                }
                throw Error("Resolution DNS sans reponse.");
            } finally {try{if(fd>=0)sock("5CloseEi",fd);}finally{list.reverse().forEach(b.free);}}
        }
        async function exchange(url,method,headers,body,o) {
            var t=target(url),resolved=await dns(t.host,o,0),list=[],fd=-1;
            try {
                active(o);var peer=take(list,16),buffer=take(list,16384);address(peer,resolved,t.port);
                fd=sock("6SocketEiii",2,1,0);if(fd<0)throw Error("Socket HTTP impossible.");nonblock(fd);
                for(;;){active(o);var result=sock("7ConnectEiPK8sockaddrj",fd,peer,16);if(result===0)break;var errno=sock("12GetLastErrnoEv");if(errno===106||errno===56)break;if([115,114,36,37,11,35,4].indexOf(errno)<0)throw Error("Connexion HTTP impossible (errno "+errno+").");await pause();}
                if(method!=="GET"&&method!=="POST")throw Error("Methode HTTP non prise en charge.");
                var payload=body===null?"":encode(body),wire=method+" "+t.path+" HTTP/1.1\r\nHost: "+t.authority+"\r\nConnection: close\r\nAccept-Encoding: identity\r\n";
                Object.keys(headers).forEach(function(k){if(!/^[A-Za-z-]+$/.test(k)||/[^\x20-\x7e]/.test(headers[k]))throw Error("En-tete invalide.");wire+=k+": "+headers[k]+"\r\n";});
                if(body!==null)wire+="Content-Length: "+payload.length+"\r\n";
                wire+="\r\n"+payload;
                for(var offset=0;offset<wire.length;){active(o);var part=wire.slice(offset,offset+16384);b.put(buffer,part);var n=sock("4SendEiPKvmi",fd,buffer,part.length,0x80);if(n>part.length)throw Error("Bornes envoi invalides.");if(n>0)offset+=n;else if(n===0||!retry())throw Error("Envoi HTTP interrompu.");await pause();}
                var reader=g.CivHttp.reader(2097152),batch=0;
                while(!reader.done()) {
                    active(o);var n=sock("4RecvEiPvmi",fd,buffer,16384,0x80);
                    if(n>16384)throw Error("Bornes reception invalides.");
                    if(n>0){reader.push(b.get(buffer,n));batch+=n;if(batch>=65536){batch=0;await pause();}}
                    else if(n===0)break;else {if(!retry())throw Error("Reception HTTP interrompue.");await pause();}
                }
                var response=reader.end();response.body=decode(response.body);return response;
            } finally {try{if(fd>=0)sock("5CloseEi",fd);}finally{list.reverse().forEach(b.free);}}
        }
        exchange.stream=async function(url,headers,o){
            if(!g.JellyfinHttpStream||typeof o.onData!=="function")throw Error("Adaptateur de flux absent.");
            var idle=o.idleTimeoutMs||30000;if(!Number.isInteger(idle)||idle<1000||idle>120000)throw Error("Delai de flux invalide.");
            o.deadline=Date.now()+idle;var t=target(url),resolved=await dns(t.host,o,0),list=[],fd=-1;
            try{
                active(o);var peer=take(list,16),buffer=take(list,65536);address(peer,resolved,t.port);
                fd=sock("6SocketEiii",2,1,0);if(fd<0)throw Error("Socket video impossible.");nonblock(fd);
                for(;;){active(o);var result=sock("7ConnectEiPK8sockaddrj",fd,peer,16);if(result===0)break;var errno=sock("12GetLastErrnoEv");if(errno===106||errno===56)break;if([115,114,36,37,11,35,4].indexOf(errno)<0)throw Error("Connexion video impossible (errno "+errno+").");await pause();}
                var wire="GET "+t.path+" HTTP/1.1\r\nHost: "+t.authority+"\r\nConnection: close\r\nAccept-Encoding: identity\r\n";
                Object.keys(headers).forEach(function(k){if(!/^[A-Za-z-]+$/.test(k)||/[\x00-\x1f\x7f-\uffff]/.test(headers[k])||/^(host|connection|content-length|transfer-encoding|accept-encoding)$/i.test(k))throw Error("En-tete de flux invalide.");wire+=k+": "+headers[k]+"\r\n";});wire+="\r\n";
                if(wire.length>65536)throw Error("Requete video trop grande.");b.put(buffer,wire);
                for(var offset=0;offset<wire.length;){active(o);var n=sock("4SendEiPKvmi",fd,buffer+BigInt(offset),wire.length-offset,0x80);if(n>wire.length-offset)throw Error("Bornes envoi video.");if(n>0)offset+=n;else if(n===0||!retry())throw Error("Envoi video interrompu.");await pause();}
                var framing=g.JellyfinHttpStream.create(o),batch=0;
                while(!framing.done()){
                    active(o);var n=sock("4RecvEiPvmi",fd,buffer,65536,0x80);if(n>65536)throw Error("Bornes reception video.");
                    if(n>0){await framing.push(b.get(buffer,n));o.deadline=Date.now()+idle;batch+=n;if(batch>=65536){batch=0;await new Promise(function(r){setTimeout(r,0);});}}
                    else if(n===0)break;else{if(!retry())throw Error("Reception video interrompue.");await pause();}
                }
                active(o);return framing.end();
            }finally{try{if(fd>=0)sock("5CloseEi",fd);}finally{list.reverse().forEach(b.free);}}
        };
        return exchange;
    }
    g.JellyfinNativeHttp={available:typeof sdk_base!=="undefined"&&typeof call_rop==="function",create:create,bridge:bridge,target:target};
})(typeof window!=="undefined"?window:globalThis);
