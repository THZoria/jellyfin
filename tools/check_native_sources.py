"""Check unchanged Moonlight native adapters before building a local package."""
import hashlib
import json
from pathlib import Path
from build_media_adapter import transformed, OUTPUT
from fetch_dependencies import BASE, FILES

ROOT = Path(__file__).resolve().parents[1]

def main():
    manifest = json.loads((ROOT / "payload.json").read_text(encoding="utf8"))
    for name in ("native-io.js", "native-texture.js"):
        relative = ".deps/moonlight/app/src/streaming/" + name
        if relative not in manifest["scripts"]:
            raise SystemExit("Native adapter missing from manifest: " + relative)
    if "vendor/moonlight-native-media-vod.js" not in manifest["scripts"] or OUTPUT.read_text(encoding="utf8") != transformed():
        raise SystemExit("VOD adapter missing or stale; run tools/build_media_adapter.py")
    for relative, expected in FILES.items():
        if hashlib.sha256((BASE / relative).read_bytes()).hexdigest() != expected:
            raise SystemExit("Dependency changed: " + relative)
    if manifest["scripts"][-1] != "app.js":
        raise SystemExit("App lifetime entry must be last")
    for source in manifest["scripts"]:
        if not (ROOT / source).is_file():
            raise SystemExit("Missing source: " + source)
    print("PASS: unchanged upstream sources, exact three-hook VOD derivative, manifest files and app lifetime order.")

if __name__ == "__main__":
    main()
