# PY208 Capture + Study App

This workspace now has two connected parts:

- a Playwright capture helper that builds the `PY208/` screenshot folder from WileyPLUS
- a local study application that teaches the full folder in the same assignment/question order

## Main Files

- `wileyplus_capture.py`: main capture automation
- `wileyplus_config.json`: runtime settings and selectors
- `PY208/`: captured homework screenshots
- `build_study_data.py`: OCR builder that turns the screenshots into structured study data
- `build_netlify_publish.py`: exporter that creates a self-contained Netlify-ready site
- `run_study_app.py`: local launcher for the study application
- `study_app/`: static app files plus generated `course-data.json`
- `netlify_publish/`: generated folder you can upload or commit for Netlify

## Setup

The Python virtual environment and Playwright browser are already installed in this workspace. If you need to rebuild later:

```powershell
python -m venv .venv
.\.venv\Scripts\python -m pip install -r requirements.txt
.\.venv\Scripts\python -m playwright install chromium
```

## Capture Screenshots

```powershell
.\.venv\Scripts\python .\wileyplus_capture.py --inspect
```

That opens the full course assignments page and prints the homework links the script will use.

When that looks right, run:

```powershell
.\.venv\Scripts\python .\wileyplus_capture.py
```

## Run The Study App

After the `PY208/` folder exists, launch the study app with:

```powershell
.\.venv\Scripts\python .\run_study_app.py
```

That will:

1. rebuild `study_app/course-data.json` if the screenshots changed
2. OCR every question image so the app becomes searchable
3. start a local web server
4. open the study app in your browser

If you want to force a fresh rebuild:

```powershell
.\.venv\Scripts\python .\run_study_app.py --rebuild
```

If you only want to regenerate the data without starting the server:

```powershell
.\.venv\Scripts\python .\build_study_data.py
```

## Build For Netlify

Create a self-contained publish folder with:

```powershell
.\.venv\Scripts\python .\build_netlify_publish.py
```

That creates `netlify_publish/` containing:

- the app files at the publish root
- `course-data.json`
- a copied `PY208/` image tree so Netlify has all screenshots it needs

If you want to force a fresh OCR rebuild before packaging:

```powershell
.\.venv\Scripts\python .\build_netlify_publish.py --rebuild-data
```

### Netlify Deploy Options

1. Drag-and-drop deploy:
   Upload the `netlify_publish/` folder directly in Netlify.
2. Git-based deploy:
   Commit this project to GitHub, connect the repo to Netlify, and let Netlify build the publish folder automatically.

`netlify.toml` is already configured to:

- install the Netlify-only build dependencies from `requirements-netlify.txt`
- run `build_netlify_publish.py --rebuild-data`
- publish the generated `netlify_publish/` folder
- use Python `3.12` during the build

Important:
- The source `PY208/` folder needs to be committed for Git-based Netlify deploys, because Netlify rebuilds the publish folder from those screenshots.
- `netlify_publish/` is generated output and is ignored locally.
- For Git-based Netlify deploys, edits made here will go live on Netlify after you commit and push them to the connected GitHub branch.

## Capture Workflow

1. The script opens Chromium and signs you into WileyPLUS if needed.
2. Sign in manually if WileyPLUS asks you to.
3. Return to the terminal and press Enter.
4. The script opens the full course assignments page, starts at `CH1 HW1 Vector Review`, and works upward by chapter/homework number.
5. Before recapturing an assignment, it deletes existing `.png` screenshots already in that homework folder so old runs do not leave duplicates behind.
6. The script launches each Wiley assignment player and saves question screenshots into `PY208/<homework name>/`.

## Study App Features

- mirrors the real `PY208` folder layout in the sidebar
- keeps every homework and question in the same order as the folder
- shows the original screenshots as the main study material
- adds chapter guides, formulas, pitfalls, and diagrams
- indexes OCR text from the screenshots so you can search across the course

## Notes

- The browser profile is stored in `.playwright-profile/` so you do not have to sign in every run.
- Screenshots are taken from the Wiley assignment player itself, not from the Canvas wrapper page.
- Each question is captured as a full-page screenshot, which keeps figures, prompts, and visible multi-part content together.
- Before each screenshot, the script expands visible collapsed `Part 2`, `Part 3`, and similar Wiley question panels inside the active question.
- Homework links are filtered by their surrounding row text so quiz rows are skipped even when the quiz title contains `HW`.
- If a question has a dedicated `Next Part` control inside the player, the script will try to capture each visible part separately.
- The first OCR-backed build can take several minutes because it processes every screenshot in `PY208/`.
