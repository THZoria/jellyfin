# Third-party components and credits

## Moonlight-CivSwitch

- Project: https://github.com/XITRIX/Moonlight-CivSwitch
- Revision: `eccedd503aa111b56b0f062ee2dea414d295a8a2`
- Credits: **XITRIX** (Moonlight-CivSwitch), **Gezine** (CivSwitch and the port's foundations), and upstream contributors. Their code remains attributed to its original authors, not THZoria.
- Required files: `native-io.js`, `native-buffer.js`, `native-context.js`, `native-cleanup.js`, `native-display.js`, `native-video.js`, `native-media.js`, `moonlight-nx2-runtime.js`, and the upstream media tests/accessor fixture.

The required files are included **without modifications** under `vendor/moonlight/`, preserving their upstream paths. `tools/dependencies.py` pins their revision and SHA-256 hashes, checked by `tools/check_native_sources.py`. No download, full checkout, or submodule is needed to build. `tools/build_media_adapter.py` generates `vendor/moonlight-native-media-vod.js` with three VOD timing hooks (including the NV12 sink path). The derivative is ignored by Git and reproducible from the included source/generator. The historical `native-texture.js` from revision `64cdae7f` is retained for reference only and is not packaged or used by 0.0.2.

The [upstream notices](https://github.com/XITRIX/Moonlight-CivSwitch/blob/master/app/civapp-notices.js) are preserved in full in [`vendor/moonlight/app/civapp-notices.js`](vendor/moonlight/app/civapp-notices.js), from the same pinned revision. Their SHA-256 hash is also verified. They include licenses for Forge, Moonlight-Switch, Emscripten, ENet, mbedTLS, and moonlight-common-c. These complete components are not bundled with this client.

**Licensing scope:** preserve each component's original attribution and license. The bundled native decoder/display runtime contains GPL-licensed components and embedded redistribution notices; these obligations are not replaced by the client's credits. No new project-wide license is asserted here. Review applicable source/distribution requirements and permissions before public redistribution. The compiled package remains a local build output and is not published.

## Jellyfin

The logo belongs to the Jellyfin contributors and is licensed under **CC BY-SA 4.0**. Its adapted PNG version, generator, and attribution are documented in [BRANDING.md](BRANDING.md). This client is independent and is not endorsed by Jellyfin.

## CivHomebrew

`tools/package_payload.py` comes from the standalone CivHomebrew packaging tool in THZoria's development project. It is kept standalone and unchanged to preserve the `.civapp` v1 format. Copies of the HTTP and DNS parsers are retained in `tests/runtime/` exclusively for host tests.

`vendor/civhomebrew/native-ui-runtime.js` and `keyboard.js` are byte-exact copies of `app/vendor/native-ui-runtime.js` and `app/src/keyboard.js` from [XITRIX/CivHomebrew](https://github.com/XITRIX/CivHomebrew), revision `e6627ce1573950a54efc2fe59fe5ad93b2877bf3`. Their SHA-256 hashes are verified during builds. The SDK/native UI runtime is version **1.3.6**, with embedded GPL-3.0-or-later and dependency notices preserved. It reuses a compatible resident SDK rather than replacing the running renderer. Storage, HTTP/DNS helpers and resident services are still provided by CivHomebrew.

## Test fixtures

The two Matroska files in `tests/fixtures/` are synthetic FFmpeg test patterns. They contain no movie content, account data, or game files. They are used only for PC tests and are not included in the application.

The original client code is credited to **THZoria / SaoriYuki**. No additional project-wide license is applied here to third-party components.
