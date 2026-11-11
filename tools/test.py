"""Run all maintained host tests after tools/build.py. Node.js and FFmpeg required."""
import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

if __name__ == "__main__":
    for tool in ("node", "ffmpeg"):
        if not shutil.which(tool):
            raise SystemExit("Missing prerequisite: " + tool)
    for test in sorted((ROOT / "tests").glob("*.cjs")):
        print("Testing " + test.name, flush=True)
        subprocess.run(["node", str(test)], cwd=ROOT, check=True, timeout=120)
    print("All host tests passed. This is not console validation.")
