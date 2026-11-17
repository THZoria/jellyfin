"""Provenance and byte-exact hashes of the vendored Moonlight sources/notices."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
COMMIT = "eccedd503aa111b56b0f062ee2dea414d295a8a2"
BASE = ROOT / "vendor/moonlight"
FILES = {
    "app/src/streaming/native-io.js": "ecca158e5f21f29bbcadbd68928d87a8cbebde35a3055c2f08e15a4a4f23fadc",
    "app/src/streaming/native-media.js": "1e5feec2da7362959349fa716a26a456114680263773a8c02f5fd2e87a440f5f",
    "app/src/streaming/native-buffer.js": "d2ad7e08f001676d04edebfe9da1c591fa6b65f4ebe079d7046a352b1a4af327",
    "app/src/streaming/native-context.js": "62fd8c67054ba3c1b286f61fdff1e4ae60eccc9f230712c5d1bd8120fd6dc9ce",
    "app/src/streaming/native-cleanup.js": "29c57548ba589385f8290943d7f45a6393549ab99cf9838cfefb32f43490af68",
    "app/src/streaming/native-display.js": "76bb544673d942a793cffb8f0c6e1c5b9578a107f52b5cf954040b7a8710757b",
    "app/src/streaming/native-video.js": "743411906d4d3aca5e025ba1d5d43ce78c30e51eee28de68b98ead7f4cb94413",
    "app/vendor/moonlight-nx2-runtime.js": "6220fe0b183e5b5ea90c25041e19244156b29d50066006903b4419dc6bba192d",
    "tests/test-media-queues.cjs": "95023c5c4905026519ab5a09741b396eab20359723d271a883aee82acdc021cb",
    "tests/fixtures/movie-buffer-accessors.json": "9be3c9e39fd76541ee4f4279bb2ec0301f054bef2ee5f91c95dc0d54907f5c51",
    "app/civapp-notices.js": "f8de16324a4e9d3aead6f61e4a65e001c3bfe15276533078a32f9c5eedb3a868",
}
CIVHOMEBREW_COMMIT = "e6627ce1573950a54efc2fe59fe5ad93b2877bf3"
CIVHOMEBREW_FILES = {
    "native-ui-runtime.js": "38b8a3417b920ee202ef8e66b7e247652168f7de8b93a643780159d8babee1d9",
    "keyboard.js": "7bc6b0c417b2dac755d39bb784e2465d80cf66097b73f6f3e9ad31a676b42fc6",
}
