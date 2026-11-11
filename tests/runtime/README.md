# CivHomebrew runtime contracts

`http.js` and `dns.js` are unchanged copies of the CivHomebrew parsers used by `CivHttp` and `CivDns` on the console. They let the `native-http.cjs` boundary tests run without a neighboring repository, using the real parsers and simulated sockets.

These two fixtures are not included in the `.civapp`. The console uses the services provided by its own CivHomebrew runtime. The tests do not establish that every installed runtime matches these copies, and they do not validate the SDK or hardware.
