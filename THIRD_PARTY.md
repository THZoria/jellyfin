# Composants et crédits

## Moonlight-CivSwitch

- Projet : https://github.com/XITRIX/Moonlight-CivSwitch
- Révision : `64cdae7f4a3f19202c7f8eaa0e5ac12ce3330d72`
- Crédits : XITRIX, Gezine/CivSwitch et contributeurs amont.
- Fichiers requis : `native-io.js`, `native-texture.js`, `native-media.js` et `tests/test-media-queues.cjs`.

`tools/fetch_dependencies.py` récupère ces quatre fichiers dans `.deps/moonlight/` et vérifie leurs SHA-256. Aucun checkout complet ni sous-module n'est nécessaire. `tools/build_media_adapter.py` produit localement `vendor/moonlight-native-media-vod.js` avec trois points d'extension de timing VOD ; les sources téléchargées restent inchangées.

**L'amont ne fournit pas de licence globale du projet à cette révision.** Ce dépôt ne prétend donc pas accorder de droits sur ce code. Les sources téléchargées, leur dérivé généré et le paquet compilé sont exclus des commits. Vérifier les droits auprès des auteurs avant de redistribuer ces composants ou un `.civapp` qui les contient. Les crédits ne remplacent pas une autorisation de redistribution.

## Jellyfin

Le logo appartient aux contributeurs Jellyfin et est sous **CC BY-SA 4.0**. Sa version PNG adaptée, son générateur et son attribution sont décrits dans [BRANDING.md](BRANDING.md). Le client est indépendant et n'est pas approuvé par Jellyfin.

## CivHomebrew

`tools/package_payload.py` provient de l'outil autonome de packaging CivHomebrew présent dans le projet de développement de THZoria. Il est conservé autonome et inchangé afin de préserver le format `.civapp` v1. Deux copies des parseurs HTTP/DNS sont conservées dans `tests/runtime/` exclusivement pour les tests hôte ; elles ne sont pas incluses dans l'application. Le clavier, le stockage, le pont SDK et les services runtime utilisés sur la console sont fournis par CivHomebrew.

## Fichiers de test

Les deux fichiers Matroska de `tests/fixtures/` sont des mires synthétiques FFmpeg, sans contenu de films, données de compte ou fichiers du jeu. Ils servent uniquement aux tests PC et ne sont pas inclus dans l'application.

Le code original du client est crédité à **THZoria / SaoriYuki**. Aucune licence globale supplémentaire n'est appliquée ici aux composants tiers.
