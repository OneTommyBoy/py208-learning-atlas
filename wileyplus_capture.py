from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Optional
from urllib.parse import urljoin

from playwright.sync_api import (
    Error as PlaywrightError,
    Frame,
    Page,
    Playwright,
    TimeoutError as PlaywrightTimeoutError,
    sync_playwright,
)


ROOT = Path(__file__).resolve().parent
CONFIG_PATH = ROOT / "wileyplus_config.json"


@dataclass(frozen=True)
class ClickTarget:
    label: str
    selector: str
    index: int
    href: Optional[str] = None


def load_config(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def sanitize_name(value: str, fallback: str) -> str:
    compact = " ".join(value.split()).strip()
    compact = re.sub(r'[<>:"/\\|?*]+', "", compact)
    compact = compact.rstrip(". ")
    return compact[:120] or fallback


def slugify(value: str, fallback: str) -> str:
    safe = sanitize_name(value, fallback).lower()
    slug = re.sub(r"[^a-z0-9]+", "-", safe).strip("-")
    return slug or fallback


def normalized_text(locator) -> str:
    try:
        text = locator.inner_text(timeout=2000)
    except PlaywrightError:
        text = locator.text_content(timeout=2000) or ""
    return " ".join(text.split())


def wait_for_page_ready(page: Page) -> None:
    page.wait_for_load_state("domcontentloaded")
    page.wait_for_timeout(1500)
    page.locator("body").wait_for(timeout=15000)


def assignment_context_text(page: Page, target: ClickTarget) -> str:
    locator = page.locator(target.selector).nth(target.index)
    try:
        context_text = locator.evaluate(
            r"""
            (el) => {
              const row = el.closest('li.assignment, .ig-row, .ig-row__layout');
              const text = row ? row.innerText : el.innerText;
              return (text || '').replace(/\s+/g, ' ').trim();
            }
            """
        )
    except PlaywrightError:
        return target.label

    return " ".join((context_text or "").split())


def assignment_sort_key(label: str) -> tuple[int, int, str]:
    match = re.search(r"\bCH(\d+)\s+HW(\d+)\b", label, flags=re.IGNORECASE)
    if not match:
        return (10**9, 10**9, label.casefold())
    return (int(match.group(1)), int(match.group(2)), label.casefold())


def collect_targets(
    page: Page,
    selectors: list[str],
    include_patterns: list[str],
    exclude_patterns: list[str],
    fallback_prefix: str,
) -> list[ClickTarget]:
    found: list[ClickTarget] = []
    seen: set[str] = set()

    for selector in selectors:
        locator = page.locator(selector)
        try:
            count = locator.count()
        except PlaywrightError:
            continue

        for index in range(count):
            item = locator.nth(index)
            try:
                label = normalized_text(item) or f"{fallback_prefix}-{index + 1:02d}"
                href = item.get_attribute("href")
            except PlaywrightError:
                continue

            lowered = label.lower()
            if include_patterns and not any(pattern in lowered for pattern in include_patterns):
                continue
            if exclude_patterns and any(pattern in lowered for pattern in exclude_patterns):
                continue

            href = href.strip() if href else None
            if href and not href.startswith(("http://", "https://")):
                href = urljoin(page.url, href)
            if href and href.startswith("javascript:"):
                href = None

            dedupe_key = href or f"{selector}::{index}::{label}"
            if dedupe_key in seen:
                continue

            seen.add(dedupe_key)
            found.append(ClickTarget(label=label, selector=selector, index=index, href=href))

    return found


def click_first_visible(target: Page | Frame, selectors: list[str], timeout_ms: int = 1200) -> Optional[str]:
    for selector in selectors:
        locator = target.locator(selector)
        try:
            count = locator.count()
        except PlaywrightError:
            continue

        for index in range(count):
            candidate = locator.nth(index)
            try:
                if not candidate.is_visible(timeout=timeout_ms):
                    continue
                candidate.scroll_into_view_if_needed(timeout=5000)
                candidate.click(timeout=5000)
                return selector
            except PlaywrightError:
                continue

    return None


def collect_homework_targets(page: Page, config: dict) -> list[ClickTarget]:
    candidates = collect_targets(
        page=page,
        selectors=config["homework_link_selectors"],
        include_patterns=[pattern.lower() for pattern in config["homework_include_patterns"]],
        exclude_patterns=[],
        fallback_prefix="homework",
    )

    exclude_patterns = [pattern.lower() for pattern in config["homework_exclude_patterns"]]
    required_patterns = [pattern.lower() for pattern in config.get("homework_context_required_patterns", [])]
    filtered: list[ClickTarget] = []

    for target in candidates:
        context_text = assignment_context_text(page, target).lower()
        if exclude_patterns and any(pattern in context_text for pattern in exclude_patterns):
            continue
        if required_patterns and not any(pattern in context_text for pattern in required_patterns):
            continue
        filtered.append(target)

    filtered.sort(key=lambda item: assignment_sort_key(item.label))

    start_name = config.get("start_assignment_name", "").strip()
    if start_name:
        start_index = next(
            (index for index, target in enumerate(filtered) if target.label.casefold() == start_name.casefold()),
            None,
        )
        if start_index is None:
            raise RuntimeError(f"Could not find the requested starting assignment: {start_name}")
        filtered = filtered[start_index:]

    return filtered


def print_homework_targets(page: Page, config: dict) -> list[ClickTarget]:
    print(f"Current URL: {page.url}")
    targets = collect_homework_targets(page, config)
    print(f"Found {len(targets)} homework candidates on the page.")
    for index, target in enumerate(targets, start=1):
        print(f"  {index:02d}. {target.label} -> {target.href or '[click-through]'}")
    return targets


def open_target(page: Page, target: ClickTarget, return_url: str, settle_timeout_ms: int) -> None:
    if target.href:
        page.goto(target.href, wait_until="domcontentloaded")
    else:
        page.goto(return_url, wait_until="domcontentloaded")
        locator = page.locator(target.selector).nth(target.index)
        locator.scroll_into_view_if_needed(timeout=5000)
        locator.click(timeout=5000)

    page.wait_for_timeout(settle_timeout_ms)


def prompt(message: str) -> None:
    input(f"{message}\nPress Enter to continue...")


def ensure_directory(path: Path) -> Path:
    path.mkdir(parents=True, exist_ok=True)
    return path


def clear_existing_screenshots(homework_dir: Path) -> int:
    removed = 0
    for path in homework_dir.glob("*.png"):
        path.unlink()
        removed += 1
    return removed


def find_launch_frame(page: Page, config: dict) -> Frame:
    for frame in page.frames:
        if frame == page.main_frame:
            continue
        for selector in config["launch_button_selectors"]:
            try:
                locator = frame.locator(selector)
                if locator.count() and locator.first.is_visible(timeout=1500):
                    return frame
            except PlaywrightError:
                continue
    raise RuntimeError("Could not find the Wiley launch frame with an OPEN ASSIGNMENT button.")


def open_assignment_player(page: Page, config: dict) -> Page:
    if "assessment-player" in page.url:
        return page

    frame = find_launch_frame(page, config)
    with page.context.expect_page(timeout=15000) as next_page_info:
        clicked = click_first_visible(frame, config["launch_button_selectors"], timeout_ms=2000)
        if not clicked:
            raise RuntimeError("Could not click the OPEN ASSIGNMENT button.")

    player = next_page_info.value
    player.wait_for_load_state("domcontentloaded")
    player.wait_for_timeout(config["settle_timeout_ms"])
    return player


def ensure_question_view(player: Page, config: dict) -> None:
    if "#/question/" in player.url:
        return

    click_first_visible(player, config["player_entry_button_selectors"], timeout_ms=1800)
    player.wait_for_timeout(config["settle_timeout_ms"])
    if "#/question/" in player.url:
        return

    click_first_visible(player, config["player_tab_selectors"], timeout_ms=1800)
    player.wait_for_timeout(config["settle_timeout_ms"])
    if "#/question/" in player.url:
        return

    body_text = player.locator("body").inner_text(timeout=5000)
    if re.search(r"Question\s+\d+\s+of\s+\d+", body_text, flags=re.IGNORECASE):
        return

    raise RuntimeError("Could not enter the Wiley question view.")


def extract_question_count(player: Page) -> int:
    body_text = player.locator("body").inner_text(timeout=5000)

    for pattern in (r"Question\s+\d+\s+of\s+(\d+)", r"(\d+)\s+questions"):
        match = re.search(pattern, body_text, flags=re.IGNORECASE)
        if match:
            return int(match.group(1))

    title = player.title()
    match = re.search(r"Question\s+\d+\s+of\s+(\d+)", title, flags=re.IGNORECASE)
    if match:
        return int(match.group(1))

    raise RuntimeError("Could not determine the number of questions in the Wiley player.")


def wait_for_question(player: Page, question_number: int) -> None:
    pattern = re.compile(rf"Question\s+{question_number}\s+of\s+\d+", flags=re.IGNORECASE)

    for _ in range(15):
        try:
            body_text = player.locator("body").inner_text(timeout=2500)
        except PlaywrightError:
            player.wait_for_timeout(1000)
            continue

        if pattern.search(body_text):
            player.wait_for_timeout(1000)
            return

        player.wait_for_timeout(1000)

    raise RuntimeError(f"Timed out waiting for Question {question_number}.")


def signature_for_state(page: Page) -> str:
    try:
        text = normalized_text(page.locator("body"))
    except PlaywrightError:
        text = ""
    return f"{page.url}|{text[:300]}"


def click_next_part(page: Page, selectors: list[str], settle_timeout_ms: int, current_signature: str) -> bool:
    for selector in selectors:
        locator = page.locator(selector)
        try:
            count = locator.count()
        except PlaywrightError:
            continue

        for index in range(count):
            button = locator.nth(index)
            try:
                if not button.is_visible(timeout=1000) or not button.is_enabled(timeout=1000):
                    continue
                button.scroll_into_view_if_needed(timeout=5000)
                button.click(timeout=5000)
                page.wait_for_timeout(settle_timeout_ms)
                if signature_for_state(page) != current_signature:
                    return True
            except PlaywrightError:
                continue
    return False


def expand_visible_sections(page: Page, settle_timeout_ms: int) -> int:
    sections = page.locator("section[data-selenium-id='qti-item']:visible")
    expanded = 0

    try:
        count = sections.count()
    except PlaywrightError:
        return 0

    for index in range(count):
        section = sections.nth(index)
        panel = section.locator(".js-item-collapsible").first
        control = section.locator("a.was-item-collapse-control").first

        try:
            if not panel.count() or not control.count():
                continue
            classes = (panel.get_attribute("class") or "").split()
            if "collapse" not in classes or "in" in classes:
                continue

            control.scroll_into_view_if_needed(timeout=5000)
            control.click(timeout=5000)
            page.wait_for_timeout(settle_timeout_ms)
            expanded += 1
        except PlaywrightError:
            continue

    return expanded


def capture_question(player: Page, question_number: int, output_dir: Path, config: dict, base_url: str) -> int:
    player.goto(f"{base_url}#/question/{question_number - 1}", wait_until="domcontentloaded")
    wait_for_question(player, question_number)
    expand_visible_sections(player, config["settle_timeout_ms"])

    captures = 0
    seen_signatures: set[str] = set()
    base_name = f"question-{question_number:02d}"

    while True:
        signature = signature_for_state(player)
        if signature in seen_signatures:
            break

        seen_signatures.add(signature)
        suffix = "" if captures == 0 else f"_part-{captures + 1:02d}"
        output_path = output_dir / f"{base_name}{suffix}.png"
        player.screenshot(path=str(output_path), full_page=True)
        captures += 1

        if not click_next_part(player, config["next_part_selectors"], config["settle_timeout_ms"], signature):
            break

    return captures


def capture_assignment(page: Page, config: dict, homework_dir: Path) -> None:
    player = open_assignment_player(page, config)
    try:
        ensure_question_view(player, config)
        base_url = player.url.split("#", 1)[0]
        question_count = extract_question_count(player)
        print(f"  Found {question_count} questions in the Wiley player.")

        for question_number in range(1, question_count + 1):
            captures = capture_question(player, question_number, homework_dir, config, base_url)
            print(f"  Captured question {question_number:02d} with {captures} screenshot(s).")
    finally:
        if player is not page:
            player.close()


def run(playwright: Playwright, config: dict, inspect_only: bool) -> int:
    output_dir = ensure_directory((ROOT / config["output_dir"]).resolve())
    profile_dir = ensure_directory((ROOT / config["profile_dir"]).resolve())

    context = playwright.chromium.launch_persistent_context(
        user_data_dir=str(profile_dir),
        headless=config["headless"],
        viewport={"width": 1440, "height": 1200},
    )

    try:
        page = context.pages[0] if context.pages else context.new_page()
        page.goto(config["start_url"], wait_until="domcontentloaded")
        prompt("Sign in to WileyPLUS if needed. The script will open the full course assignments page next.")

        assignments_url = config.get("assignments_url", page.url)
        page.goto(assignments_url, wait_until="domcontentloaded")
        wait_for_page_ready(page)
        homework_targets = print_homework_targets(page, config)
        if inspect_only:
            print("\nInspection complete.")
            return 0

        if not homework_targets:
            print("No homework assignments were found on the current dashboard page.")
            return 1

        for homework_number, homework_target in enumerate(homework_targets, start=1):
            homework_name = sanitize_name(homework_target.label, f"Homework {homework_number:02d}")
            homework_dir = ensure_directory(output_dir / homework_name)
            print(f"\n[{homework_number}/{len(homework_targets)}] Opening homework: {homework_name}")

            try:
                removed = clear_existing_screenshots(homework_dir)
                if removed:
                    print(f"  Removed {removed} existing screenshot(s) from the homework folder.")
                open_target(page, homework_target, assignments_url, config["settle_timeout_ms"])
                capture_assignment(page, config, homework_dir)
            except Exception as exc:  # noqa: BLE001
                print(f"  Failed to capture {homework_name}: {exc}")
            finally:
                page.goto(assignments_url, wait_until="domcontentloaded")
                page.wait_for_timeout(config["settle_timeout_ms"])

        print(f"\nCapture complete. Files are in: {output_dir}")
        return 0
    finally:
        context.close()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Capture WileyPLUS homework questions into PY208 folders.")
    parser.add_argument("--config", default=str(CONFIG_PATH), help="Path to the JSON config file.")
    parser.add_argument(
        "--inspect",
        action="store_true",
        help="Open the dashboard and print the homework links the script will capture.",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    config = load_config(Path(args.config))

    try:
        with sync_playwright() as playwright:
            raise SystemExit(run(playwright, config, inspect_only=args.inspect))
    except PlaywrightTimeoutError as exc:
        print(f"Timed out while interacting with the page: {exc}", file=sys.stderr)
        raise SystemExit(1) from exc
    except KeyboardInterrupt:
        print("Cancelled by user.", file=sys.stderr)
        raise SystemExit(130) from None
