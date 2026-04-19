from __future__ import annotations

import argparse
import sys
import webbrowser
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import build_study_data


ROOT = Path(__file__).resolve().parent
DATA_PATH = ROOT / "study_app" / "course-data.json"


def latest_source_mtime() -> float:
    watched = [ROOT / "build_study_data.py"]
    watched.extend(sorted((ROOT / "PY208").rglob("question-*.png")))
    return max(path.stat().st_mtime for path in watched)


def ensure_data(force: bool) -> None:
    if force or not DATA_PATH.exists() or DATA_PATH.stat().st_mtime < latest_source_mtime():
        print("Building OCR-backed study data...")
        build_study_data.write_course_data(DATA_PATH)


def serve(port: int, open_browser: bool) -> None:
    handler = partial(SimpleHTTPRequestHandler, directory=str(ROOT))
    server = ThreadingHTTPServer(("127.0.0.1", port), handler)
    url = f"http://127.0.0.1:{port}/study_app/"
    print(f"PY208 study app running at {url}")
    print("Press Ctrl+C to stop the server.")
    if open_browser:
        webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server.")
    finally:
        server.server_close()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run the PY208 Learning Atlas locally.")
    parser.add_argument("--port", type=int, default=8765, help="Local HTTP port.")
    parser.add_argument("--no-browser", action="store_true", help="Do not open the browser automatically.")
    parser.add_argument("--rebuild", action="store_true", help="Force rebuilding the study data first.")
    return parser.parse_args()


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8")
    args = parse_args()
    ensure_data(force=args.rebuild)
    serve(port=args.port, open_browser=not args.no_browser)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
