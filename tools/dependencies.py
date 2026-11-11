"""Provenance and byte-exact hashes of the vendored Moonlight sources/notices."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
COMMIT = "64cdae7f4a3f19202c7f8eaa0e5ac12ce3330d72"
BASE = ROOT / "vendor/moonlight"
FILES = {
    "app/src/streaming/native-io.js": "14536ccb86df58454a02ce90ee35a24ab83c4268accf929c76038d54a8f52ecf",
    "app/src/streaming/native-texture.js": "4f5b5200256a4494c9d87504065ff8bd672d716b5a1a3ea9b2b4a23a2e434263",
    "app/src/streaming/native-media.js": "a95666afa3b88bb868dca23fce761bf8f366cdad3afab929db950656ccea7ce2",
    "tests/test-media-queues.cjs": "c82007dc1ff12a1393a636b791ac409304f57535293606b71b307fa3ad54e8f8",
    "app/civapp-notices.js": "334c716e22ba9b3ec1f19f8ed89551f27845bed41e1ff0497b02b3ee9cf7e8a5",
}
