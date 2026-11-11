# Composants et crédits

## Moonlight-CivSwitch

- Projet : https://github.com/XITRIX/Moonlight-CivSwitch
- Révision : `64cdae7f4a3f19202c7f8eaa0e5ac12ce3330d72`
- Crédits : **XITRIX** (Moonlight-CivSwitch), **Gezine** (CivSwitch et fondations du portage) et contributeurs amont. Leur code reste attribué à ses auteurs, pas à THZoria.
- Fichiers requis : `native-io.js`, `native-texture.js`, `native-media.js` et `tests/test-media-queues.cjs`.

Les quatre fichiers sources sont inclus **sans modification** dans `vendor/moonlight/`, avec leurs chemins amont. `tools/dependencies.py` épingle leur révision et leurs SHA-256 ; `tools/check_native_sources.py` les vérifie. Aucun téléchargement, checkout complet ou sous-module n'est nécessaire pour construire le projet. `tools/build_media_adapter.py` produit localement `vendor/moonlight-native-media-vod.js` avec trois points d'extension de timing VOD ; ce dérivé généré est ignoré par Git, mais toutes ses sources et son générateur sont fournis.

La [notice amont indiquée par l'utilisateur](https://github.com/XITRIX/Moonlight-CivSwitch/blob/master/app/civapp-notices.js) est conservée intégralement dans [`vendor/moonlight/app/civapp-notices.js`](vendor/moonlight/app/civapp-notices.js), depuis la même révision épinglée. Son SHA-256 est également vérifié. Elle regroupe notamment les licences de Forge, Moonlight-Switch, Emscripten, ENet, mbedTLS et moonlight-common-c. Ces composants complets ne sont pas embarqués dans ce client.

**Portée des licences :** cette notice présente les licences des composants qu'elle nomme ; elle ne déclare pas explicitement une licence globale pour les quatre fichiers JavaScript repris ici. Leur inclusion dans ce dépôt privé à la demande de THZoria ne les relicencie pas et ne permet pas d'affirmer que la licence Forge ou une GPL s'applique automatiquement à tous les adaptateurs. Conserver les crédits et les notices ; confirmer la portée de l'autorisation auprès de XITRIX/Gezine avant une redistribution publique. Le paquet compilé reste une sortie de build locale, non publiée.

## Jellyfin

Le logo appartient aux contributeurs Jellyfin et est sous **CC BY-SA 4.0**. Sa version PNG adaptée, son générateur et son attribution sont décrits dans [BRANDING.md](BRANDING.md). Le client est indépendant et n'est pas approuvé par Jellyfin.

## CivHomebrew

`tools/package_payload.py` provient de l'outil autonome de packaging CivHomebrew présent dans le projet de développement de THZoria. Il est conservé autonome et inchangé afin de préserver le format `.civapp` v1. Deux copies des parseurs HTTP/DNS sont conservées dans `tests/runtime/` exclusivement pour les tests hôte ; elles ne sont pas incluses dans l'application. Le clavier, le stockage, le pont SDK et les services runtime utilisés sur la console sont fournis par CivHomebrew.

## Fichiers de test

Les deux fichiers Matroska de `tests/fixtures/` sont des mires synthétiques FFmpeg, sans contenu de films, données de compte ou fichiers du jeu. Ils servent uniquement aux tests PC et ne sont pas inclus dans l'application.

Le code original du client est crédité à **THZoria / SaoriYuki**. Aucune licence globale supplémentaire n'est appliquée ici aux composants tiers.
