from __future__ import annotations

import argparse
import json
import shutil
import sys
from pathlib import Path
from urllib.parse import quote

import build_study_data


ROOT = Path(__file__).resolve().parent
STUDY_APP_DIR = ROOT / "study_app"
LOCAL_DATA_PATH = STUDY_APP_DIR / "course-data.json"
DEFAULT_PUBLISH_DIR = ROOT / "netlify_publish"
STATIC_APP_FILES = ("index.html", "styles.css", "app.js")


def latest_course_source_mtime() -> float:
    watched = [ROOT / "build_study_data.py"]
    watched.extend(sorted((ROOT / "PY208").rglob("question-*.png")))
    return max(path.stat().st_mtime for path in watched)


def ensure_local_course_data(force_rebuild: bool) -> dict:
    should_rebuild = (
        force_rebuild
        or not LOCAL_DATA_PATH.exists()
        or LOCAL_DATA_PATH.stat().st_mtime < latest_course_source_mtime()
    )
    if should_rebuild:
        print("Building OCR-backed course data for export...")
        build_study_data.write_course_data(LOCAL_DATA_PATH)

    return json.loads(LOCAL_DATA_PATH.read_text(encoding="utf-8"))


def quoted_publish_url(relative_path: Path) -> str:
    return "./" + "/".join(quote(part) for part in relative_path.parts)


def copy_static_app_files(publish_dir: Path) -> None:
    for filename in STATIC_APP_FILES:
        shutil.copy2(STUDY_APP_DIR / filename, publish_dir / filename)


def export_assets_and_rewrite_payload(payload: dict, publish_dir: Path) -> dict:
    for assignment in payload["assignments"]:
        for question in assignment["questions"]:
            relative_path = Path(question["relativePath"])
            source = ROOT / relative_path
            destination = publish_dir / relative_path
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, destination)
            question["assetUrl"] = quoted_publish_url(relative_path)

        assignment["coverImage"] = assignment["questions"][0]["assetUrl"] if assignment["questions"] else ""

    return payload


def write_publish_bundle(publish_dir: Path, force_rebuild: bool) -> Path:
    payload = ensure_local_course_data(force_rebuild=force_rebuild)
    if publish_dir.exists():
        shutil.rmtree(publish_dir)
    publish_dir.mkdir(parents=True, exist_ok=True)

    copy_static_app_files(publish_dir)
    rewritten_payload = export_assets_and_rewrite_payload(payload, publish_dir)
    (publish_dir / "course-data.json").write_text(
        json.dumps(rewritten_payload, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    return publish_dir


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build a self-contained Netlify publish folder.")
    parser.add_argument(
        "--publish-dir",
        default=str(DEFAULT_PUBLISH_DIR),
        help="Destination folder for the Netlify-ready static site.",
    )
    parser.add_argument(
        "--rebuild-data",
        action="store_true",
        help="Force rebuilding the OCR-backed course-data.json before export.",
    )
    return parser.parse_args()


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8")
    args = parse_args()
    publish_dir = Path(args.publish_dir).resolve()
    write_publish_bundle(publish_dir=publish_dir, force_rebuild=args.rebuild_data)
    print(f"Netlify publish folder written to {publish_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
