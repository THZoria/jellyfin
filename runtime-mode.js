/* A bundled SDK is not evidence that Launcher owns a native display.
 * Classic CivHomebrew keeps Gameface; never start a second native owner.
 */
(function(g){
    "use strict";
    function sessions(){
        return g.CivAppsNativeUI&&g.CivAppsNativeUI.sessions||g.CivNanoVGSession;
    }
    function sharedSession(){
        var registry=sessions(),session=registry&&registry.current;
        return session&&session.renderer&&session.renderer.owner?session:null;
    }
    async function mount(root){
        var registry=sessions();
        if(registry&&registry.pending)await registry.pending;
        if(!sharedSession()){
            if(registry&&registry.current&&g.engine)throw Error("Affichage natif indisponible. Redemarre Civilization VII.");
            return null;
        }
        if(!g.CivHomebrewSDK||!g.CivHomebrewSDK.app)throw Error("SDK natif CivHomebrew indisponible.");
        root.setAttribute("data-civ-native-ui","1");
        // A native mount failure must not fall back to a competing Gameface
        // renderer while Launcher still owns the native display.
        return g.CivHomebrewSDK.app.mount(root);
    }
    g.JellyfinRuntime={sharedSession:sharedSession,mount:mount};
})(typeof window!=="undefined"?window:globalThis);
