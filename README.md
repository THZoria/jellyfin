# Jellyfin pour CivHomebrew

**Client non officiel pour Switch 2 · Version 0.0.1 · THZoria / SaoriYuki**

Parcourez vos bibliothèques Jellyfin et regardez vos vidéos en plein écran avec une manette. Le serveur transcode le média ; la console décode la vidéo H.264 et le son Opus par le lecteur natif.

> Ce projet nécessite un environnement **CivHomebrew déjà fonctionnel**. Il ne s'installe pas depuis le Nintendo eShop et ne contient ni jeu, ni fichier système, ni méthode d'installation de l'environnement console.

## Ce que propose le client

- Validation du serveur avant d'accéder au formulaire de connexion.
- Adresse du serveur mémorisée ; identifiant et mot de passe mémorisés uniquement si vous cochez l'option.
- Bibliothèques, dossiers, épisodes et navigation par pages.
- Lecture plein écran avec proportions conservées, pause et sauts de 10 secondes.
- Choix des sous-titres disponibles, incrustés par Jellyfin pendant le transcodage.
- Récupération jusqu'à 20 secondes d'avance, avec mémoire limitée et remplissage automatique du tampon.

## 1. Installer et préparer le serveur Jellyfin

Si vous avez déjà un serveur Jellyfin accessible depuis votre réseau, passez à l'étape 2.

1. Téléchargez Jellyfin pour votre PC, NAS ou serveur depuis [jellyfin.org/downloads](https://jellyfin.org/downloads/), ou suivez la [documentation d'installation](https://jellyfin.org/docs/general/installation/).
2. Démarrez le serveur, puis ouvrez `http://localhost:8096` sur la machine qui l'héberge.
3. Suivez l'assistant : langue, compte administrateur et création des bibliothèques. Ajoutez vos dossiers de films et séries et laissez l'analyse se terminer.
4. Dans le tableau de bord Jellyfin, créez si possible un **compte dédié à la lecture**, sans droits administrateur.
5. Autorisez ce compte à accéder aux bibliothèques souhaitées, ainsi qu'au **transcodage vidéo et audio**. Ce client en a besoin, même lorsque le fichier d'origine est déjà en H.264.
6. Vérifiez qu'une vidéo se lit avec ce compte depuis un navigateur.

### Exemple Docker (facultatif)

Sur un serveur Linux avec Docker, en adaptant le chemin des médias :

```sh
docker run -d --name jellyfin --restart unless-stopped \
  -p 8096:8096 \
  -v jellyfin-config:/config \
  -v jellyfin-cache:/cache \
  -v /chemin/vers/medias:/media:ro \
  jellyfin/jellyfin
```

Ajoutez ensuite les dossiers situés sous `/media` dans l'assistant Jellyfin. Les volumes nommés conservent la configuration et le cache. Voir la documentation officielle pour les permissions, les mises à jour et l'accélération matérielle.

### Transcodage et sous-titres

Le client demande du **H.264 baseline, jusqu'à 720p / 30 images/s**, avec audio **Opus stéréo 48 kHz**. Le débit vidéo cible est de 3 Mbit/s. Un serveur capable de transcoder plus vite que la lecture pourra constituer une avance réseau durable.

L'accélération matérielle peut réduire la charge du serveur ; configurez-la uniquement si votre matériel et votre installation Jellyfin la prennent en charge. Les sous-titres ASS/SSA, SRT ou graphiques comme PGS sont incrustés par le serveur selon ses capacités. Cette incrustation peut augmenter la charge de transcodage.

## 2. Rendre le serveur accessible à la console

1. Placez la console et le serveur sur le même réseau local, ou sur un VPN déjà fonctionnel.
2. Relevez l'adresse locale du serveur. Par exemple, pour l'adresse **d'exemple** `192.168.1.50`, saisissez dans le client :

   ```text
   http://192.168.1.50:8096
   ```

3. Autorisez le port TCP 8096 dans le pare-feu du serveur si nécessaire.
4. Vérifiez depuis un autre appareil du même réseau que cette adresse ouvre Jellyfin.

**N'utilisez pas `localhost` ou `127.0.0.1` dans la console** : ils désignent la console, pas votre serveur.

> **Le transport natif actuel accepte HTTP uniquement, pas HTTPS.** Utilisez un réseau de confiance ou un VPN. Les identifiants et le contenu ne sont pas protégés par TLS. Ne désactivez pas HTTPS sur un serveur public et n'exposez pas le port HTTP sur Internet pour contourner cette limite.

## 3. Construire l'application

Le dépôt contient les sources du client et les **quatre fichiers Moonlight nécessaires**, conservés sans modification avec leur notice amont. Il ne contient pas de paquet `.civapp` précompilé. Voir les [mentions et crédits XITRIX / Gezine](THIRD_PARTY.md).

### Prérequis PC

- Git.
- Python **3.10 ou supérieur**, sans paquet Python externe.
- Pour exécuter les tests : Node.js **22 ou supérieur** et FFmpeg accessibles dans le `PATH`.

```sh
git clone https://github.com/THZoria/jellyfin.git
cd jellyfin
python tools/build.py
```

Sur certains systèmes, utilisez `python3` à la place de `python`.

Le build vérifie les sources Moonlight et leur notice à une révision précise, génère le logo et le dérivé média, puis assemble :

```text
dist/jellyfin-civswitch.civapp
```

Aucun dépôt voisin, téléchargement de dépendances, checkout Moonlight complet, compilateur C ou serveur Sunshine n'est nécessaire. Après le clonage et l'installation de Python, la construction fonctionne hors ligne.

## 4. Installer dans CivHomebrew

1. Ouvrez CivHomebrew sur la console et activez son serveur FTP.
2. Depuis un client FTP sur le PC, connectez-vous à l'adresse affichée par CivHomebrew — port par défaut **5000**.
3. Ouvrez le dossier virtuel **`Install civapp`**.
4. Envoyez `dist/jellyfin-civswitch.civapp` et attendez la fin de l'installation.
5. Revenez au sélecteur d'applications, puis lancez **Jellyfin**.

Pour mettre à jour le client, réinstallez le nouveau paquet avec le même identifiant d'application. Ne copiez pas manuellement les scripts dans les sauvegardes du jeu.

## 5. Première connexion

1. Choisissez **Adresse du serveur** et saisissez son adresse complète, avec `http://` et le port si nécessaire.
2. Choisissez **Continuer**. Le client vérifie l'API publique Jellyfin avant d'afficher le compte.
3. Saisissez votre identifiant et votre mot de passe.
4. Facultatif : cochez **Mémoriser mes identifiants**.
5. Choisissez **Se connecter**, ouvrez une bibliothèque, puis une vidéo et **Lire**.

L'adresse validée est mémorisée et revérifiée aux lancements suivants. Si les identifiants ont été mémorisés après une connexion réussie, le formulaire est prérempli : **la connexion n'est pas automatique**.

### Confidentialité et identifiants mémorisés

- La case est **décochée par défaut**.
- Si elle est cochée, le compte et le mot de passe sont stockés **sans chiffrement** dans `save:/civhomebrew/jellyfin-settings.json`.
- Ne partagez pas ce fichier ni une copie de sauvegarde qui le contient. Une personne ayant accès aux fichiers peut lire le mot de passe.
- Décochez la case pour retirer les identifiants enregistrés. Un échec d'effacement est signalé : réessayez avant de quitter.
- Un changement d'adresse validée retire les identifiants de l'ancien serveur.
- Le jeton de session reste en mémoire et n'est jamais enregistré.

## Commandes

| Contexte | Commande | Action |
| --- | --- | --- |
| Menus | ↑ / ↓ | Choisir un élément |
| Catalogue | ← / → | Changer de page |
| Menus | A / B | Valider / revenir |
| Vidéo | A | Pause / reprise |
| Vidéo | ← / → | Reculer / avancer de 10 secondes ; maintenir pour cumuler |
| Vidéo | ↑ | Ouvrir les sous-titres |
| Vidéo | ↓ | Afficher les commandes et la position |
| Sous-titres | ↑ / ↓ puis A | Choisir une piste ou **Désactivés** |
| Sous-titres | B | Fermer le menu sans quitter la vidéo |
| Vidéo, hors menu | B | Quitter la vidéo et revenir au catalogue |

Un saut ou un changement de sous-titres relance le flux à la position choisie et nécessite un **court rechargement du tampon**. La pause et la piste choisie sont conservées après un saut. Le bandeau de commandes disparaît automatiquement.

## Dépannage

| Problème | Vérifications |
| --- | --- |
| Serveur refusé ou inaccessible | Adresse complète, IP du serveur et non `localhost`, port 8096, réseau/VPN, pare-feu. HTTPS n'est pas pris en charge par ce client. |
| Identifiants refusés / 401 | Testez le compte dans le navigateur ; vérifiez le nom et le mot de passe. |
| Aucune source de lecture | Vérifiez les droits de transcodage vidéo et audio du compte et la disponibilité du média. |
| Chargement long ou rechargements fréquents | Vérifiez le débit réseau et la vitesse de transcodage dans le tableau de bord Jellyfin. Le tampon ne compense pas un serveur constamment trop lent. |
| Aucun sous-titre proposé | Vérifiez dans Jellyfin que le média possède une piste ou un fichier de sous-titres reconnu. Le client ne recherche pas de sous-titres sur Internet. |
| Sous-titres lents à activer | Leur incrustation relance le transcodage ; vérifiez les capacités du serveur et ses journaux FFmpeg. |
| Adresse ou compte non mémorisé | Vérifiez le message d'erreur de stockage et l'option de mémorisation. Les identifiants sont enregistrés seulement après une authentification réussie. |
| Ressource native impossible à libérer | Redémarrez Civilization VII avant de relancer le client ; les ressources incertaines sont conservées par sécurité. |

## Développement et tests

Après le build :

```sh
python tools/test.py
```

Les tests couvrent le formulaire, le consentement et le stockage, les annulations, les sauts, les paramètres de sous-titres, le cadrage, le transport HTTP, le démultiplexage Matroska, le tampon et la durée de vie des ressources. Les mires synthétiques sont décodées par FFmpeg sur PC.

**Les tests PC ne valident pas le rendu GPU, l'audio ou la synchronisation réelle sur console.** La lecture native et son lissage ont été confirmés par l'utilisateur pendant le développement ; les évolutions ultérieures demandent leurs propres essais sur appareil.

### Organisation

```text
app.js                 Interface, connexion, catalogue et sessions de lecture
native-http.js         API et flux HTTP natifs
http-stream.js         Découpage HTTP incrémental
matroska.js            Démultiplexage H.264 / Opus
native-player.js       Horloge, tampon, décodage et nettoyage
vod-pacer.js            Ordonnancement des images
player-layout.js       Dimensions plein écran sans déformation
playback-options.js    Positions et sélection des sous-titres
payload.json           Métadonnées et ordre des scripts .civapp
tools/                 Build, packaging et vérification des dépendances
tests/                 Tests hôte et médias synthétiques
vendor/moonlight/      Quatre sources XITRIX/Gezine et notice amont, inchangées
```

Les prototypes, sondes de jeu, anciennes investigations et dépendances complètes ne font pas partie du dépôt. Les sorties de build, caches et fichiers de paramètres locaux sont ignorés par Git.

## Crédits et statut

Client développé par **THZoria / SaoriYuki**. Un grand merci à **[XITRIX](https://github.com/XITRIX)** pour Moonlight-CivSwitch et à **[Gezine](https://github.com/Gezine)** pour CivSwitch et les fondations du portage : le lecteur natif repose sur leur travail et celui des contributeurs amont. Les quatre fichiers repris conservent leurs sources intactes et leur attribution.

Logo : contributeurs Jellyfin, **CC BY-SA 4.0**, voir [BRANDING.md](BRANDING.md). Notices et portée des licences : [THIRD_PARTY.md](THIRD_PARTY.md) et [notice amont conservée](vendor/moonlight/app/civapp-notices.js).

Projet indépendant, non affilié à Jellyfin, Nintendo ou aux éditeurs du jeu. Cette version ne gère pas le direct TV, le téléchargement hors ligne, la sélection audio, ni la reprise automatique d'un épisode depuis la position enregistrée par le serveur.
