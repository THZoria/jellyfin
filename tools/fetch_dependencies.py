"""Fetch only the four pinned Moonlight files used by this project.

These unmodified dependency files and the generated derivative are intentionally
ignored by Git. See THIRD_PARTY.md before redistributing a compiled package.
"""
import hashlib
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
COMMIT = "64cdae7f4a3f19202c7f8eaa0e5ac12ce3330d72"
BASE = ROOT / ".deps/moonlight"
FILES = {
    "app/src/streaming/native-io.js": "14536ccb86df58454a02ce90ee35a24ab83c4268accf929c76038d54a8f52ecf",
    "app/src/streaming/native-texture.js": "4f5b5200256a4494c9d87504065ff8bd672d716b5a1a3ea9b2b4a23a2e434263",
    "app/src/streaming/native-media.js": "a95666afa3b88bb868dca23fce761bf8f366cdad3afab929db950656ccea7ce2",
    "tests/test-media-queues.cjs": "c82007dc1ff12a1393a636b791ac409304f57535293606b71b307fa3ad54e8f8",
}

def fetch():
    for relative, expected in FILES.items():
        target = BASE / relative
        if target.is_file() and hashlib.sha256(target.read_bytes()).hexdigest() == expected:
            continue
        url = f"https://raw.githubusercontent.com/XITRIX/Moonlight-CivSwitch/{COMMIT}/{relative}"
        with urllib.request.urlopen(url, timeout=30) as response:
            data = response.read(2 * 1024 * 1024)
        if hashlib.sha256(data).hexdigest() != expected:
            raise ValueError("Dependency hash mismatch: " + relative)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
    print("Verified four Moonlight dependencies at " + COMMIT)

if __name__ == "__main__":
    fetch()
