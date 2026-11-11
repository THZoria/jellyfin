# Contrats runtime CivHomebrew

`http.js` et `dns.js` sont des copies inchangées des parseurs CivHomebrew utilisés par `CivHttp` et `CivDns` sur console. Ils permettent aux tests de frontière `native-http.cjs` de fonctionner sans dépôt voisin, avec les vrais parseurs et des sockets simulés.

Ces deux fixtures ne sont pas incluses dans le `.civapp`. La console utilise les services de son runtime CivHomebrew. Les tests ne prouvent pas que tous les runtimes installés sont identiques à ces copies et ne valident pas le SDK ou le matériel.
