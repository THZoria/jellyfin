"""Reproducible standalone build: python tools/build.py."""
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def run(*args):
    subprocess.run([sys.executable, *args], cwd=ROOT, check=True)

if __name__ == "__main__":
    run("tools/build_brand.py")
    run("tools/build_media_adapter.py")
    run("tools/check_native_sources.py")
    run("tools/package_payload.py", "--directory", ".", "--non-interactive",
        "--no-save-metadata", "-o", "dist/jellyfin-civswitch.civapp")
    run("tools/package_payload.py", "--inspect", "dist/jellyfin-civswitch.civapp")
