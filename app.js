/* Jellyfin 0.0.1 by SaoriYuki. Credentials persist only with explicit consent. */
(async function () {
    "use strict";
    var previous = window.__civswitchApp;
    if (previous && typeof previous.close === "function") await previous.close();
    var id = "jellyfin-civswitch", closed = false, busy = false, editing = false;
    var font = "BodyFont, BodyFont-JP, BodyFont-KR, BodyFont-SC, BodyFont-TC, Arial, sans-serif";
    var server = "", accepted = false, serverName = "", username = "", password = "", token = "", userId = "";
    var settingsPath = "save:/civhomebrew/jellyfin-settings.json", storage = null, storageTask = null, browserEditor = null;
    var rememberCredentials=false, savedCredentials=null;
    var deviceId = "civswitch-" + Date.now().toString(36) + Math.random().toString(36).slice(2);
    var resolveLifetime, lifetime = new Promise(function (resolve) { resolveLifetime = resolve; });
    var selected = 0, controls = [], requests = [], subscriptions = [], frame = null;
    var stack = [], page = null, view = "login", last = {name:"",time:0}, held = "", nextRepeat = 0;
    var owner = {owner:id}, nativeInput = false, padStates = {}, keyboard = null;
    var transport = window.JellyfinNativeHttp && window.JellyfinNativeHttp.available ? "Natif" : "XHR";
    var nativeExchange = null;
    var firstVisible = 0, paging = null;
    var activePlayback = null, cleanupTasks = [];
    var nativePlayer = null, nativeImage = null;
    var fullscreenLayer = null, fullscreenNotice = null, fullscreenState = null, nativeFormat = {width:16,height:9};
    var playbackOptions=window.JellyfinPlaybackOptions, playback=null, playGeneration=0;
    var playerHud=null,playerTime=null,playerProgress=null,hudTimer=null,seekTimer=null,seekTarget=null,subtitleMenu=null,subtitleSelection=0;
    function node(tag, parent, style, text) {
        var n = document.createElement(tag);
        // Gameface does not reliably resolve inherited fonts on form controls.
        Object.assign(n.style, {fontFamily:font,fontWeight:"400",fontStyle:"normal"}, style || {});
        if (text !== undefined) n.textContent = text;
        parent.appendChild(n);
        return n;
    }
    var root = node("div", document.body, {position:"fixed",left:"0",right:"0",top:"0",bottom:"0",backgroundColor:"#090d18",backgroundImage:"linear-gradient(125deg,#19132d,#090d18 65%,#082535)",color:"#fff",zIndex:"2",padding:"32px 64px",boxSizing:"border-box",display:"flex",flexDirection:"column",outline:"none"});
    root.id = id; root.tabIndex = -1;
    var heading = node("div", root, {display:"flex",alignItems:"center",height:"64px",marginBottom:"20px"});
    node("img",heading,{width:"48px",height:"48px",marginRight:"16px"}).src=window.JellyfinBrand.icon;
    node("span",heading,{fontSize:"34px",color:"#fff"},"Jellyfin");
    node("span",heading,{fontSize:"16px",color:"#8796ae",marginLeft:"24px"},"0.0.1  /  SaoriYuki");
    var title = node("div", root, {fontSize:"32px",marginBottom:"12px"});
    var status = node("div", root, {fontSize:"18px",minHeight:"44px",whiteSpace:"pre-wrap",color:"#a4b3ca"});
    status.setAttribute("role", "status");
    var content = node("div", root, {flex:"1",overflow:"hidden",minHeight:"0"});
    var position = node("div", root, {fontSize:"17px",minHeight:"22px",color:"#aaaec4"});
    var footer = node("div", root, {fontSize:"16px",paddingTop:"16px",color:"#8796ae"}, "A  Choisir     B  Retour     ← →  Pages");
    var chrome = [heading,title,status,content,position,footer];
    function fitNativeImage() {
        if (!fullscreenLayer || !nativeImage) return;
        var html = document.documentElement || {};
        var width = Number(window.innerWidth) || Number(html.clientWidth) || Number(root.clientWidth) || 1280;
        var height = Number(window.innerHeight) || Number(html.clientHeight) || Number(root.clientHeight) || 720;
        var dw=Number(nativeFormat.displayWidth||nativeFormat.width),dh=Number(nativeFormat.displayHeight||nativeFormat.height);
        if (!(Number.isFinite(dw)&&Number.isFinite(dh)&&dw>0&&dh>0&&dw<=32768&&dh<=32768)) {dw=Number(nativeFormat.width);dh=Number(nativeFormat.height);}
        var box = window.JellyfinPlayerLayout.fit(width,height,dw,dh);
        Object.assign(nativeImage.style,{left:box.left+"px",top:box.top+"px",width:box.width+"px",height:box.height+"px"});
    }
    function enterFullscreen() {
        fullscreenState = {padding:root.style.padding,background:root.style.backgroundColor,displays:chrome.map(function(n){return n.style.display||"";})};
        chrome.forEach(function(n){n.style.display="none";});root.style.padding="0";root.style.backgroundColor="#000";
        fullscreenLayer = node("div",root,{position:"fixed",left:"0",top:"0",right:"0",bottom:"0",backgroundColor:"#000",overflow:"hidden",zIndex:"10"});
        fullscreenLayer.id = "jellyfin-fullscreen-player";
        fullscreenLayer.setAttribute("role","region");fullscreenLayer.setAttribute("aria-label","Lecteur video plein ecran");
        return fullscreenLayer;
    }
    function leaveFullscreen() {
        clearTimeout(hudTimer);clearTimeout(seekTimer);hudTimer=null;seekTimer=null;seekTarget=null;
        playerHud=null;playerTime=null;playerProgress=null;subtitleMenu=null;
        if (fullscreenLayer && fullscreenLayer.parentNode) fullscreenLayer.parentNode.removeChild(fullscreenLayer);
        fullscreenLayer = null;fullscreenNotice = null;
        if (fullscreenState) {
            chrome.forEach(function(n,i){n.style.display=fullscreenState.displays[i];});
            root.style.padding=fullscreenState.padding;root.style.backgroundColor=fullscreenState.background;fullscreenState=null;
        }
    }
    function toggleNativePause() {
        if (!nativePlayer) return;
        var paused = nativePlayer.togglePause();
        if(playback)playback.paused=paused;
        var loading = activePlayback && !activePlayback.started;
        if (fullscreenNotice) {fullscreenNotice.textContent=paused?"Pause":loading?"Chargement...":"";fullscreenNotice.style.display=paused||loading?"block":"none";}
        showPlayerHud();
    }
    function playbackSeconds(){
        if(!playback)return 0;
        var seconds=playback.offset+(nativePlayer?nativePlayer.stats().seconds:0);
        return playback.duration?Math.min(playback.duration,seconds):seconds;
    }
    function refreshPlayerHud(){
        if(!playback||!playerTime)return;
        var seconds=seekTarget===null?playbackSeconds():seekTarget;
        playerTime.textContent=(seekTarget===null?"":"Aller a  ")+playbackOptions.time(seconds)+" / "+(playback.duration?playbackOptions.time(playback.duration):"--:--");
        playerProgress.style.width=(playback.duration?Math.min(100,seconds/playback.duration*100):0)+"%";
    }
    function showPlayerHud(){
        if(!playerHud)return;clearTimeout(hudTimer);refreshPlayerHud();playerHud.style.display="block";
        hudTimer=setTimeout(function(){if(playerHud&&!subtitleMenu&&seekTarget===null)playerHud.style.display="none";},4000);
    }
    function createPlayerHud(){
        playerHud=node("div",fullscreenLayer,{position:"absolute",left:"5%",right:"5%",bottom:"4%",padding:"18px 24px",backgroundColor:"rgba(9,13,24,0.9)",borderRadius:"12px",pointerEvents:"none"});
        node("div",playerHud,{fontSize:"20px",marginBottom:"10px"},playback.item.Name);
        playerTime=node("div",playerHud,{fontSize:"18px",marginBottom:"10px"});
        var track=node("div",playerHud,{height:"4px",backgroundColor:"#39455b",marginBottom:"12px"});
        playerProgress=node("div",track,{height:"4px",width:"0%",backgroundColor:"#55c6ee"});
        node("div",playerHud,{fontSize:"17px",color:"#c4d6ec"},"← / →  −10 / +10 s     ↑  Sous-titres     A  Pause     B  Retour");
        showPlayerHud();
    }
    function seekPlayback(delta){
        if(!playback||!nativePlayer)return;
        seekTarget=playbackOptions.clamp((seekTarget===null?playbackSeconds():seekTarget)+delta,playback.duration);
        showPlayerHud();clearTimeout(seekTimer);
        seekTimer=setTimeout(function(){
            seekTimer=null;if(closed||!playback||seekTarget===null)return;
            var target=seekTarget,old=playback;seekTarget=null;
            invoke(function(){return playNative(old.item,{offset:target,subtitle:old.subtitle,paused:old.paused,sourceId:old.sourceId});});
        },450);
    }
    function closeSubtitleMenu(){if(subtitleMenu&&subtitleMenu.parentNode)subtitleMenu.parentNode.removeChild(subtitleMenu);subtitleMenu=null;showPlayerHud();}
    function paintSubtitleMenu(){
        if(!subtitleMenu||!playback)return;
        while(subtitleMenu.firstChild)subtitleMenu.removeChild(subtitleMenu.firstChild);
        node("div",subtitleMenu,{fontSize:"26px",marginBottom:"12px"},"Sous-titres");
        node("div",subtitleMenu,{fontSize:"15px",color:"#94aac5",marginBottom:"14px"},playback.subtitles.length?"↑ / ↓  Choisir     A  Appliquer     B  Fermer":"Aucune piste de sous-titres disponible");
        var choices=[{index:null,label:"Desactives"}].concat(playback.subtitles),first=Math.max(0,subtitleSelection-4);
        choices.slice(first,first+5).forEach(function(s,i){
            var index=first+i;
            var row=node("div",subtitleMenu,{padding:"12px 16px",marginBottom:"6px",fontSize:"19px",borderRadius:"8px",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",backgroundColor:index===subtitleSelection?"#243650":"#121c2d",border:"2px solid "+(index===subtitleSelection?"#55c6ee":"#263047")},(s.index===playback.subtitle?"✓  ":"")+s.label);
            row.setAttribute("role","button");row.setAttribute("aria-selected",String(index===subtitleSelection));
            row.addEventListener("click",function(){if(!busy){subtitleSelection=index;invoke(applySubtitle);}});
        });
    }
    function openSubtitleMenu(){
        if(!playback||!nativePlayer)return;
        clearTimeout(seekTimer);seekTimer=null;seekTarget=null;
        subtitleSelection=playback.subtitles.findIndex(function(s){return s.index===playback.subtitle;})+1;
        subtitleMenu=node("div",fullscreenLayer,{position:"absolute",left:"20%",right:"20%",top:"12%",padding:"24px",borderRadius:"14px",backgroundColor:"rgba(9,13,24,0.97)",zIndex:"12"});
        subtitleMenu.id="jellyfin-subtitles";subtitleMenu.setAttribute("role","dialog");subtitleMenu.setAttribute("aria-label","Sous-titres");
        paintSubtitleMenu();showPlayerHud();
    }
    async function applySubtitle(){
        if(!playback)return;
        var old=playback,choice=subtitleSelection===0?null:old.subtitles[subtitleSelection-1].index,seconds=playbackSeconds();
        closeSubtitleMenu();if(choice===old.subtitle)return;
        return playNative(old.item,{offset:seconds,subtitle:choice,paused:old.paused,sourceId:old.sourceId});
    }
    function message(text) { if (!closed) status.textContent = text; }
    function listen(target, name, fn) {
        target.addEventListener(name, fn, true);
        subscriptions.push(function () { target.removeEventListener(name, fn, true); });
    }
    function clearContent(keepPlayer) {
        if(!keepPlayer)stopVideo();
        controls = []; selected = 0; firstVisible = 0; paging = null;
        content.scrollTop = 0;
        content.style.maxWidth=view==="server"||view==="login"?"760px":"100%";
        content.style.width="100%";
        position.textContent = "";
        while (content.firstChild) content.removeChild(content.firstChild);
    }
    function paint() {
        if (fullscreenLayer) return;
        // Gameface may expose scrollIntoView without implementing scrolling.
        // Hide off-screen rows instead, so the selected row is always rendered.
        var height = Number(content.clientHeight) || Math.max(62,(Number(window.innerHeight)||720)-300);
        var rows = Math.max(1,Math.floor(height/86));
        if (selected < firstVisible) firstVisible = selected;
        if (selected >= firstVisible + rows) firstVisible = selected - rows + 1;
        firstVisible = Math.max(0,Math.min(firstVisible,Math.max(0,controls.length-rows)));
        controls.forEach(function (c, i) {
            c.node.style.display = i >= firstVisible && i < firstVisible + rows ? "flex" : "none";
            c.node.style.borderColor = selected === i ? "#55c6ee" : "#263047";
            c.node.style.backgroundColor = selected === i ? "#243650" : "#121c2d";
            c.node.setAttribute("data-selected",String(selected === i));
        });
        position.textContent = controls.length ? "Selection " + (selected+1) + " / " + controls.length : "";
    }
    function button(text, run, subtitle) {
        var index = controls.length;
        var n = node("button", content, {display:"flex",alignItems:"flex-start",justifyContent:"center",flexDirection:"column",width:"100%",boxSizing:"border-box",height:"76px",minHeight:"76px",textAlign:"left",padding:"10px 24px",marginBottom:"10px",border:"2px solid #263047",borderRadius:"14px",backgroundColor:"#121c2d",color:"#fff",fontSize:"21px",lineHeight:"26px",outline:"none"});
        // A plain span with its own font also avoids the game's button label style.
        node("span", n, {display:"block",fontSize:"21px",lineHeight:"26px",color:"#fff",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:"100%"}, text);
        if(subtitle)node("span",n,{display:"block",fontSize:"14px",lineHeight:"20px",color:"#94aac5",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:"100%"},subtitle);
        n.setAttribute("aria-label", text);
        n.type = "button"; n.tabIndex = -1;
        n.addEventListener("click", function () { if (!busy && !editing && !closed) { selected = index; paint(); invoke(run); } });
        controls.push({node:n,run:run});
        return n;
    }
    async function invoke(run) {
        if (closed || busy || editing) return;
        busy = true;
        try { await run(); } catch (_) { message("Erreur inattendue. Reviens en arriere et relance le test."); }
        finally { busy = false; }
    }
    function validateServer(value) {
        value = value.trim().replace(/\/+$/, "");
        if (!/^https?:\/\/[a-z0-9.-]+(?::[0-9]{1,5})?(?:\/[a-z0-9._~!$&'()*+,;=:@%/-]*)?$/i.test(value)) throw Error("Adresse HTTP(S) invalide, sans identifiants ni parametres.");
        return value;
    }
    function query(values) {
        return Object.keys(values).filter(function (k) { return values[k] !== undefined; }).map(function (k) { return encodeURIComponent(k) + "=" + encodeURIComponent(values[k]); }).join("&");
    }
    function authorization(includeToken) {
        var value = 'MediaBrowser Client="Jellyfin CivSwitch", Device="CivSwitch", DeviceId="' + deviceId + '", Version="0.0.1"';
        if (includeToken && token) value += ', Token="' + token + '"';
        return value;
    }
    function nativeRequest() {
        if (!nativeExchange) nativeExchange = window.JellyfinNativeHttp.create();
        var cancel = {cancelled:false}, request = {headers:{}};
        request.open = function (method,url) { request.method = method; request.url = url; };
        request.setRequestHeader = function (key,value) { request.headers[key] = value; };
        request.abort = function () { cancel.cancelled = true; if (request.onabort) request.onabort(); };
        request.send = function (body) {
            request.done = (async function () {
                try {
                    var response = await nativeExchange(request.url,request.method,request.headers,body,{cancel:cancel,deadline:Date.now()+request.timeout});
                    if (cancel.cancelled) return;
                    request.status = response.status; request.responseText = response.body;
                    if (request.onload) request.onload();
                } catch (e) {
                    request.networkError = e.message;
                    if (!cancel.cancelled && request.onerror) request.onerror();
                }
            })();
        };
        return request;
    }
    function api(path, method, data, cleanup) {
        return new Promise(function (resolve, reject) {
            if (closed && !cleanup) { reject(Error("Application fermee.")); return; }
            if (transport === "XHR" && typeof XMLHttpRequest !== "function") { reject(Error("Transport reseau indisponible.")); return; }
            var xhr = transport === "Natif" ? nativeRequest() : new XMLHttpRequest(), ended = false;
            xhr.cleanup = !!cleanup;
            requests.push(xhr);
            function finish(error, value) {
                if (ended) return; ended = true;
                var at = requests.indexOf(xhr); if (at >= 0) requests.splice(at, 1);
                xhr.onload = xhr.onerror = xhr.ontimeout = xhr.onabort = null;
                if (error) reject(error); else resolve(value);
            }
            xhr.onload = function () {
                if (xhr.status < 200 || xhr.status >= 300) {
                    var endpoint = (method || "GET") + " " + path.split("?")[0];
                    finish(Error(endpoint + " : " + (xhr.status === 401 ? "identifiants refuses ou session expiree (401)." : "HTTP " + xhr.status + "."))); return;
                }
                if (xhr.status === 204) { finish(null,null); return; }
                if (xhr.responseText.length > 2097152) { finish(Error("Reponse trop volumineuse.")); return; }
                try { finish(null, JSON.parse(xhr.responseText)); } catch (_) { finish(Error("Le serveur ne renvoie pas de JSON Jellyfin valide.")); }
            };
            xhr.onerror = function () { finish(Error(xhr.networkError || "Reseau bloque : verifier serveur, VPN, CORS et autorisation HTTP du moteur.")); };
            xhr.ontimeout = function () { finish(Error("Serveur sans reponse apres 12 secondes.")); };
            xhr.onabort = function () { finish(Error("Requete annulee.")); };
            xhr.onprogress = function (e) { if (e.loaded > 2097152) { finish(Error("Reponse trop volumineuse.")); xhr.abort(); } };
            try {
                xhr.open(method || "GET", server + path, true); xhr.timeout = 12000;
                xhr.setRequestHeader("Accept", "application/json");
                xhr.setRequestHeader("Authorization", authorization(true));
                if (data !== undefined) xhr.setRequestHeader("Content-Type", "application/json");
                xhr.send(data === undefined ? null : JSON.stringify(data));
            } catch (_) { finish(Error("Le moteur interdit cette requete HTTP ou ses en-tetes.")); }
        });
    }
    async function edit(label, value, secret) {
        if (window.engine&&!keyboard) throw Error("Clavier CivHomebrew indisponible.");
        editing = true;
        try {
            if(window.engine)return await keyboard.edit(value, secret ? 256 : 512, !!secret, label);
            return await new Promise(function(resolve){
                var shade=node("div",root,{position:"fixed",left:"0",top:"0",right:"0",bottom:"0",zIndex:"20",backgroundColor:"rgba(0,0,0,0.85)",display:"flex",alignItems:"center",justifyContent:"center"});
                var panel=node("div",shade,{width:"65%",padding:"32px",borderRadius:"16px",backgroundColor:"#121c2d"});
                node("div",panel,{fontSize:"26px",marginBottom:"20px"},label);
                var input=node("input",panel,{width:"100%",boxSizing:"border-box",fontSize:"26px",padding:"16px",color:"#fff",backgroundColor:"#090d18",border:"2px solid #55c6ee",borderRadius:"8px"});
                input.type=secret?"password":"text";input.value=secret?"":value;input.maxLength=secret?256:512;
                function finish(v){if(browserEditor!==finish)return;browserEditor=null;window.removeEventListener("keydown",onKey,true);if(shade.parentNode)shade.parentNode.removeChild(shade);if(!closed)root.focus();resolve(v);}
                function onKey(e){if(e.key==="Enter"){consume(e);finish(input.value);}else if(e.key==="Escape"){consume(e);finish(null);}}
                browserEditor=finish;window.addEventListener("keydown",onKey,true);input.focus();
            });
        }
        finally { editing = false; held = ""; last = {name:"",time:0}; }
    }
    function showServer() {
        accepted=false;token="";userId="";password="";view="server";stack=[];page=null;
        clearContent();title.textContent="Bienvenue chez vous";
        message("Ajoute ton serveur Jellyfin pour retrouver ta bibliotheque.");
        button("Adresse du serveur  ·  " + (server || "Ajouter une adresse"),async function(){
            var value=await edit("Adresse du serveur",server,false);
            if(value!==null&&!closed){server=value.trim();showServer();selected=0;paint();}
        });
        button("Continuer",acceptServer,"Verifier et memoriser ce serveur");paint();
    }
    async function acceptServer() {
        message("Verification du serveur…");
        try {
            server=validateServer(server);
            var info=await api("/System/Info/Public");if(closed)return;
            if(!info || typeof info.Version!=="string" || (!info.Id&&!info.ServerName))throw Error("Cette adresse ne correspond pas a un serveur Jellyfin.");
            accepted=true;serverName=info.ServerName||"Jellyfin";
            rememberCredentials=!!(savedCredentials&&savedCredentials.server===server);
            if(rememberCredentials){username=savedCredentials.username;password=savedCredentials.password;}
            else{savedCredentials=null;username="";password="";}
            var saved=true;
            try {
                await persistSettings();
            }catch(_){saved=false;}
            if(!closed){showLogin();if(!saved)message("Serveur accepte. Adresse non memorisee : stockage indisponible.");}
        }catch(e){if(!closed){accepted=false;showServer();message(e.message);}}
    }
    async function persistSettings(){
        if(!storage)throw Error("Stockage indisponible");
        var settings={server:server};
        if(rememberCredentials&&savedCredentials&&savedCredentials.server===server){
            settings.rememberCredentials=true;settings.credentials={username:savedCredentials.username,password:savedCredentials.password};
        }
        var bytes=unescape(encodeURIComponent(JSON.stringify(settings)));
        var previous=storageTask;
        storageTask=(async function(){if(previous)await previous.catch(function(){});await storage.write(settingsPath,bytes);await storage.commit();})();
        await storageTask;
    }
    function showLogin() {
        if(!accepted)return showServer();
        var focus=view==="login"?selected:0;
        view="login";stack=[];page=null;clearContent();title.textContent="Se connecter";
        message(serverName+"  ·  "+server);
        button("Utilisateur  ·  "+(username||"Nom du compte"),async function(){
            var v=await edit("Utilisateur",username,false);if(v!==null&&!closed){username=v.trim();showLogin();}
        });
        button("Mot de passe  ·  "+(password?"••••••••":""),async function(){
            var v=await edit("Mot de passe","",true);if(v!==null&&!closed){password=v;showLogin();}
        });
        var rememberBox=button("Memoriser mes identifiants  ·  "+(rememberCredentials?"☑":"☐"),async function(){
            var previousSaved=savedCredentials;
            rememberCredentials=!rememberCredentials;
            if(!rememberCredentials){
                savedCredentials=null;
                try{await persistSettings();}catch(_){rememberCredentials=true;savedCredentials=previousSaved;if(!closed){showLogin();message("Impossible d'effacer les identifiants sauvegardes. Reessaie avant de quitter.");}return;}
            }
            if(!closed)showLogin();
        },"Identifiant et mot de passe stockes sans chiffrement sur la console.");
        rememberBox.setAttribute("role","checkbox");rememberBox.setAttribute("aria-checked",String(rememberCredentials));
        button("Se connecter",async function(){
            if(!accepted)return showServer();
            if(!username){message("Renseigne ton nom d'utilisateur.");return;}
            message("Connexion…");var supplied=password;password="";
            try{
                var result=await api("/Users/AuthenticateByName","POST",{Username:username,Pw:supplied});
                if(closed)return;
                if(!result.AccessToken||!result.User||!result.User.Id)throw Error("Connexion refusee.");
                var saved=true;
                if(rememberCredentials){
                    savedCredentials={server:server,username:username,password:supplied};
                    try{await persistSettings();}catch(_){saved=false;}
                }
                supplied="";if(closed)return;
                token=result.AccessToken;userId=result.User.Id;await loadPage({kind:"views",name:"Vos bibliotheques",start:0});
                if(!saved&&!closed)message("Connecte, mais les identifiants n'ont pas pu etre sauvegardes.");
            }catch(e){supplied="";token="";userId="";if(!closed){showLogin();message(e.message);}}
        });
        button("Changer de serveur",showServer);selected=Math.min(focus,controls.length-1);paint();
    }
    async function loadPage(target, push) {
        message("Chargement...");
        try {
            // Jellyfin 12 removed the legacy /Users/{userId}/Views and Items routes.
            var path = target.kind === "views" ? "/UserViews?" + query({UserId:userId}) :
                "/Items?" + query({UserId:userId,ParentId:target.parent,StartIndex:target.start,Limit:24,SortBy:"SortName",SortOrder:"Ascending",Recursive:false,Fields:"Overview",EnableTotalRecordCount:true});
            var result = await api(path); if (closed) return;
            if (push && page) stack.push(page);
            page = target; view = "catalog"; clearContent();
            var items = result.Items || [];
            var total = Number.isInteger(result.TotalRecordCount) && result.TotalRecordCount >= 0 ? result.TotalRecordCount : null;
            var hasNext = target.kind !== "views" && items.length > 0 && (total !== null ? target.start + items.length < total : items.length === 24);
            var previousPage = target.start > 0 ? Object.assign({},target,{start:Math.max(0,target.start-24),focus:0}) : null;
            var nextPage = hasNext ? Object.assign({},target,{start:target.start+items.length,focus:0}) : null;
            if (target.kind !== "views") {
                paging = {previous:previousPage,next:nextPage};
                var number = Math.floor(target.start/24)+1;
                title.textContent = target.name + " - Page " + number + (total !== null ? " / " + Math.max(1,Math.ceil(total/24)) : "");
                if (previousPage) button("Page precedente (Gauche)",function () { return loadPage(previousPage); });
                if (nextPage) button("Page suivante (Droite)",function () { return loadPage(nextPage); });
            } else title.textContent = target.name;
        message(items.length ? serverName+"  /  "+items.length+" titres" : "Aucun element dans cette rubrique.");
            items.forEach(function (item) {
                button(item.Name, async function () {
                    page.focus = selected;
                    if (item.IsFolder) await loadPage({kind:"items",parent:item.Id,name:item.Name,start:0}, true);
                    else await showItem(item);
                },item.IsFolder?"Bibliotheque / collection":(item.Type==="Episode"?"Episode "+(item.IndexNumber||""):"Video")+(item.ProductionYear?"  ·  "+item.ProductionYear:"")+(item.RunTimeTicks?"  ·  "+Math.round(item.RunTimeTicks/600000000)+" min":""));
            });
            button("Retour", back);
            button("Se deconnecter", function () { token = ""; userId = ""; password = ""; showLogin(); });
            selected = Math.max(0,Math.min(Number(target.focus)||0,controls.length-1)); paint();
        } catch (e) {
            if (closed) return;
            // Authentication can succeed even when the first catalogue request fails.
            // Keep an explicit recovery screen instead of silently leaving the login form.
            if (!page) {
                view = "catalog-error"; clearContent(); title.textContent = "Connecte - catalogue indisponible";
                button("Reessayer le catalogue", function () { return loadPage(target); });
                button("Se deconnecter", function () { token = ""; userId = ""; password = ""; showLogin(); });
                paint();
            }
            message("Chargement du catalogue : " + e.message);
        }
    }
    async function showItem(item) {
        view = "detail"; clearContent(); title.textContent = item.Name;
        message("");
        node("div",content,{fontSize:"16px",color:"#55c6ee",marginBottom:"18px"},"VOTRE PROCHAINE LECTURE");
        node("div",content,{fontSize:"21px",lineHeight:"30px",color:"#bbc8db",maxWidth:"960px",marginBottom:"28px"},(item.Overview||"Pret a lancer la lecture.").slice(0,360));
        button("Lire", function () { return playNative(item); });
        button("Retour au catalogue", function () { return loadPage(page); }); paint();
    }
    async function playNative(item,settings) {
        settings=settings||{};
        stopVideo();var generation=playGeneration;
        try {
            if (!window.JellyfinNativePlayer) throw Error("Composant de lecture natif absent du paquet.");
            if (!window.JellyfinPlayerLayout) throw Error("Composant de plein ecran absent du paquet.");
            if (!playbackOptions) throw Error("Composant de navigation video absent du paquet.");
            clearContent(true);view="player";title.textContent=item.Name;
            playback={item:item,offset:playbackOptions.clamp(settings.offset,playbackOptions.duration(item)),duration:playbackOptions.duration(item),subtitle:settings.subtitle===undefined?null:settings.subtitle,subtitles:[],paused:!!settings.paused,sourceId:settings.sourceId};
            var layer=enterFullscreen();nativeFormat={width:16,height:9};
            fullscreenNotice=node("div",layer,{position:"absolute",left:"0",right:"0",top:"45%",textAlign:"center",fontSize:"24px",color:"#fff",pointerEvents:"none"},"Chargement...");
            createPlayerHud();
            await Promise.all(cleanupTasks.slice()); if (closed||generation!==playGeneration) return;
            if (window.__jellyfinNativeQuarantine) throw Error("Une ressource native n'a pas pu etre liberee. Redemarre Civilization VII.");
            var info = await api("/Items/" + encodeURIComponent(item.Id) + "/PlaybackInfo?" + query({UserId:userId}));
            if (closed||generation!==playGeneration) return;
            var source = (info.MediaSources || []).filter(function(s){return s.SupportsTranscoding !== false && s.IsInfiniteStream !== true&&(!settings.sourceId||s.Id===settings.sourceId);})[0];
            if (!source) throw Error("Aucune source autorisant le transcodage H.264/Opus pour cet utilisateur.");
            playback.duration=playbackOptions.duration(item,source);playback.offset=playbackOptions.clamp(settings.offset,playback.duration);
            playback.subtitles=playbackOptions.subtitles(source);playback.sourceId=source.Id;
            if(playback.subtitle!==null&&!playback.subtitles.some(function(s){return s.index===playback.subtitle;}))throw Error("Cette piste de sous-titres n'est plus disponible.");
            var current=playback;
            var session = {ItemId:item.Id,MediaSourceId:source.Id,PlaySessionId:Array.from({length:32},function(){return Math.floor(Math.random()*16).toString(16);}).join(""),started:false,transcode:true,offset:current.offset,duration:current.duration,subtitle:current.subtitle};
            activePlayback = session;
            var image = node("img",layer,{position:"absolute",display:"none",objectFit:"fill",backgroundColor:"#000"});
            image.style.zIndex="0";playerHud.style.zIndex="2";fullscreenNotice.style.zIndex="2";
            image.alt = "Lecture native Jellyfin"; nativeImage = image;
            fitNativeImage();
            var controller = window.JellyfinNativePlayer.create({
                url:server + "/Videos/" + encodeURIComponent(item.Id) + "/stream.mkv?" + query(Object.assign({
                    Static:false,MediaSourceId:source.Id,DeviceId:deviceId,PlaySessionId:session.PlaySessionId,
                    VideoCodec:"h264",AudioCodec:"opus",Profile:"baseline",Level:"4.1",AllowVideoStreamCopy:false,AllowAudioStreamCopy:false,
                    MaxWidth:1280,MaxHeight:720,MaxFramerate:30,VideoBitRate:3000000,AudioBitRate:128000,AudioSampleRate:48000,
                    AudioChannels:2,MaxAudioChannels:2,TranscodingMaxAudioChannels:2
                },playbackOptions.streamOptions(current.offset,current.subtitle))),
                headers:{Authorization:authorization(true),Accept:"video/x-matroska"},
                onBuffer:function(s){if(!closed&&nativePlayer===controller&&fullscreenNotice){
                    fullscreenNotice.textContent=s.paused?"Pause":s.buffering?"Mise en tampon…  "+Math.floor(s.bufferedSeconds)+" s":"";
                    fullscreenNotice.style.display=s.paused||s.buffering?"block":"none";
                }},
                onFormat:function(format){if (!closed && nativePlayer === controller) {nativeFormat=format;fitNativeImage();}},
                onStatus:function(text){if (!closed && nativePlayer === controller) message(text);},
                onImage:function(url){
                    if (closed || nativePlayer !== controller) return;
                    if (image.src !== url) image.src = url;
                    image.style.display = "block";
                    if (!session.started) {
                        if (fullscreenNotice) fullscreenNotice.style.display=current.paused?"block":"none";
                        session.started = true; message("Lecture native H.264/Opus. A : pause/reprise ; B : retour.");
                        api("/Sessions/Playing","POST",{ItemId:session.ItemId,MediaSourceId:session.MediaSourceId,PlaySessionId:session.PlaySessionId,PositionTicks:Math.round(session.offset*10000000),SubtitleStreamIndex:session.subtitle===null?-1:session.subtitle,IsPaused:current.paused,CanSeek:true,PlayMethod:"Transcode"}).catch(function(){});
                    }
                },
                onStats:function(){if (!closed && nativePlayer === controller)refreshPlayerHud();},
                onError:function(text){if (!closed && nativePlayer === controller) {stopVideo(true);message("Lecteur natif : " + text);}},
                onEnded:function(){if (!closed && nativePlayer === controller) {stopVideo();message("Fin de lecture. B pour revenir au catalogue.");}}
            });
            nativePlayer = controller;
            if(current.paused)controller.togglePause();
            showPlayerHud();
        } catch(e) {if (!closed&&generation===playGeneration) {stopVideo(true);await showItem(item);message("Lecteur natif : " + e.message);}}
    }
    function stopVideo(failed) {
        playGeneration++;
        var session = activePlayback, seconds = (session?session.offset:0)+(nativePlayer ? nativePlayer.stats().seconds : 0);
        if(session&&session.duration)seconds=Math.min(seconds,session.duration);
        var ticks = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds*10000000) : 0;
        activePlayback = null;
        playback=null;
        if (nativeImage) {nativeImage.removeAttribute("src");nativeImage = null;}
        leaveFullscreen();
        if (nativePlayer) {
            var controller = nativePlayer;nativePlayer = null;
            var mediaTask = controller.stop().catch(function(){});cleanupTasks.push(mediaTask);
            mediaTask.then(function(){var i=cleanupTasks.indexOf(mediaTask);if(i>=0)cleanupTasks.splice(i,1);});
        }
        if (session) {
            // Official stop report; no server-wide kill or unrelated session stop.
            var task = api("/Sessions/Playing/Stopped","POST",{ItemId:session.ItemId,MediaSourceId:session.MediaSourceId,PlaySessionId:session.PlaySessionId,PositionTicks:ticks,Failed:!!failed},true).catch(function () {});
            cleanupTasks.push(task);
            task.then(function () { var i=cleanupTasks.indexOf(task); if(i>=0)cleanupTasks.splice(i,1); });
        }
    }
    async function back() {
        if (view === "catalog-error") { token = ""; userId = ""; return showLogin(); }
        if (view === "player" || view === "detail") {if (view === "player") stopVideo();return loadPage(page);}
        if (view === "catalog") { if (stack.length) return loadPage(stack.pop()); token = ""; userId = ""; return showLogin(); }
        return close();
    }
    async function close() {
        if (closed) return lifetime;
        closed = true;
        if (frame !== null) cancelAnimationFrame(frame);
        if (keyboard) keyboard.cancel();
        if (browserEditor) browserEditor(null);
        var closing = requests.slice();
        closing.forEach(function (xhr) { if (!xhr.cleanup) xhr.abort(); });
        stopVideo(); subscriptions.forEach(function (off) { off(); });
        if (nativeInput && window.engine && typeof window.engine.off === "function") window.engine.off("InputAction", onNative, owner);
        token = ""; password = ""; userId = ""; username = "";
        savedCredentials=null;rememberCredentials=false;
        if (root.parentNode) root.parentNode.removeChild(root);
        if (window.__civswitchApp === instance) delete window.__civswitchApp;
        // Do not return control to the launcher until native sockets/buffers are freed.
        await Promise.all(closing.map(function (xhr) { return xhr.done || Promise.resolve(); }).concat(cleanupTasks.slice()));
        if(storageTask)await storageTask.catch(function(){});
        resolveLifetime(); return lifetime;
    }
    function action(name, phase, x, y) {
        if (closed || editing) return;
        if (name === "keyboard-escape") name = "cancel";
        phase = Number(phase);
        if(busy){
            if(view==="player"&&phase===0&&name==="cancel"){
                requests.slice().forEach(function(r){if(!r.cleanup)r.abort();});
                back().catch(function(e){if(!closed)message(e.message);});
            }
            return;
        }
        if (name === "nav-move") {
            if (Math.abs(Number(x)) > Math.abs(Number(y)) && Math.abs(Number(x)) > .5) name = Number(x) > 0 ? "nav-right" : "nav-left";
            else if (Math.abs(Number(y)) > .5) name = Number(y) > 0 ? "nav-up" : "nav-down";
            else if (phase !== 0 && phase !== 3 && held) name = held; else return;
        }
        if (["nav-up","nav-down","nav-left","nav-right","accept","cancel"].indexOf(name) < 0) return;
        if (phase !== 0 && phase !== 3) { if (held === name) held = ""; return; }
        var now = Date.now(); if (last.name === name && now-last.time < 35) return;
        if (view === "player" && fullscreenLayer) {
            if(subtitleMenu){
                if((name==="nav-up"||name==="nav-down")&&(phase===0||held===name&&now>=nextRepeat)){
                    held=name;nextRepeat=now+(phase===0?350:150);
                    subtitleSelection=(subtitleSelection+(name==="nav-up"?-1:1)+playback.subtitles.length+1)%(playback.subtitles.length+1);paintSubtitleMenu();
                }else if(phase===0&&name==="accept")invoke(applySubtitle);
                else if(phase===0&&name==="cancel")closeSubtitleMenu();
            }else if(name==="nav-left"||name==="nav-right"){
                if(phase===0||held===name&&now>=nextRepeat){held=name;nextRepeat=now+(phase===0?400:250);seekPlayback(name==="nav-left"?-10:10);}
            }else if(phase===0&&name==="nav-up")openSubtitleMenu();
            else if(phase===0&&name==="nav-down")showPlayerHud();
            else if(phase===0&&name==="accept")invoke(toggleNativePause);
            else if(phase===0&&name==="cancel")invoke(back);
            last={name:name,time:now};
            return;
        }
        if (name === "nav-left" || name === "nav-right") {
            if (phase === 0 && view === "catalog" && paging) {
                var destination = name === "nav-left" ? paging.previous : paging.next;
                if (destination) invoke(function () { return loadPage(destination); });
            }
        } else if (name.indexOf("nav-") === 0) {
            if (!controls.length || phase === 3 && (held !== name || now < nextRepeat)) return;
            held = name; nextRepeat = now + (phase === 0 ? 350 : 150);
            selected = (selected + (name === "nav-up" ? -1 : 1) + controls.length) % controls.length; paint();
        } else if (phase === 0) { if (name === "cancel") invoke(back); else if (controls[selected]) invoke(controls[selected].run); }
        last = {name:name,time:now};
    }
    function onNative(name, phase, x, y) { action(name, phase, x, y); }
    function consume(e) { e.preventDefault(); e.stopImmediatePropagation(); }
    ["navigate-input","engine-input"].forEach(function (name) {
        listen(window,name,function (e) {
            if (editing) return;
            var d = e.detail || {};
            if (["nav-up","nav-down","nav-left","nav-right","nav-move","accept","cancel","keyboard-escape"].indexOf(d.name) < 0) return;
            action(d.name,d.status,d.x,d.y); consume(e);
        });
    });
    listen(window,"keydown",function (e) {
        if (e.key === "F8") { close(); consume(e); return; }
        if (editing) return;
        var name = {ArrowUp:"nav-up",ArrowDown:"nav-down",ArrowLeft:"nav-left",ArrowRight:"nav-right",PageUp:"nav-left",PageDown:"nav-right",Enter:"accept",Escape:"cancel"}[e.key];
        if (name) { action(name,e.repeat ? 3 : 0); consume(e); }
    });
    listen(window,"keyup",function (e) {
        if (editing) return;
        var name = {ArrowUp:"nav-up",ArrowDown:"nav-down",ArrowLeft:"nav-left",ArrowRight:"nav-right"}[e.key]; if (name) action(name,1);
    });
    listen(window,"resize",function () { if (!closed) {if (fullscreenLayer) fitNativeImage();else paint();} });
    if (window.CivKeyboard && typeof window.CivKeyboard.create === "function") {
        keyboard = window.CivKeyboard.create({root:root,native:function () { return !!window.engine; },focus:function () { if (!closed) root.focus(); },error:message});
    }
    if (window.engine && typeof window.engine.on === "function") {
        try {
            var sub = window.engine.on("InputAction",onNative,owner); nativeInput = true;
            if (sub && typeof sub.clear === "function") {
                subscriptions.push(function () { sub.clear(); });
                // clear() owns unsubscription when available; no second engine.off.
                subscriptions.push(function () { nativeInput = false; });
            }
        } catch (_) {}
    }
    function poll() {
        if (closed) return;
        if (!nativeInput && navigator.getGamepads) {
            var pads; try { pads = navigator.getGamepads(); } catch (_) { pads = []; }
            var mapping = [[12,"nav-up"],[13,"nav-down"],[14,"nav-left"],[15,"nav-right"],[0,"accept"],[1,"cancel"]];
            for (var p=0;p<pads.length;p++) if (pads[p]) mapping.forEach(function (m) {
                var k = p+":"+m[0], down = !!(pads[p].buttons[m[0]] && pads[p].buttons[m[0]].pressed);
                if (down) action(m[1],padStates[k] ? 3 : 0); else if (padStates[k]) action(m[1],1);
                padStates[k] = down;
            });
        }
        frame = requestAnimationFrame(poll);
    }
    var instance = {id:id,close:close,lifetime:lifetime};
    window.__civswitchApp = instance;
    showServer(); root.focus(); frame = requestAnimationFrame(poll);
    try {
        if (window.PayloadNative) storage = window.PayloadNative.create().files;
        storageTask=storage?storage.read(settingsPath,16384,false):Promise.resolve(null);
        var stored = await storageTask;
        if (stored && !closed) {
            var settings = JSON.parse(stored);
            if(settings.rememberCredentials===true&&settings.credentials&&typeof settings.credentials.username==="string"&&settings.credentials.username.length<=512&&typeof settings.credentials.password==="string"&&settings.credentials.password.length<=256){
                savedCredentials={server:validateServer(settings.server),username:settings.credentials.username,password:settings.credentials.password};
            }
            server = validateServer(settings.server);showServer();
            await invoke(acceptServer);
        }
    } catch (_) { if (!closed) {server="";showServer();message("Ajoute ton serveur Jellyfin pour commencer.");} }
    await lifetime;
})();
