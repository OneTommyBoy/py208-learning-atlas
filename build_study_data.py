from __future__ import annotations

import json
import re
import sys
from collections import defaultdict
from datetime import UTC, datetime
from pathlib import Path
from urllib.parse import quote

from PIL import Image
from rapidocr_onnxruntime import RapidOCR


ROOT = Path(__file__).resolve().parent
COURSE_DIR = ROOT / "PY208"
OUTPUT_PATH = ROOT / "study_app" / "course-data.json"


CHAPTER_GUIDES = {
    1: {
        "title": "Vector Review",
        "summary": "Build fluency with vector magnitude, direction, equality, and components.",
        "diagramType": "vectors",
        "objectives": [
            "Compare vectors by magnitude and direction.",
            "Read component signs from a diagram.",
            "Tell equal vectors from opposite vectors.",
        ],
        "formulas": [
            ("Magnitude", "|v| = sqrt(vx^2 + vy^2)"),
            ("Equality", "same magnitude + same direction"),
            ("Opposite", "u = -v"),
        ],
        "pitfalls": [
            "Same length does not always mean same vector.",
            "Position on the page does not define equality.",
        ],
    },
    3: {
        "title": "Coulomb's Law Review",
        "summary": "Review charge interactions, source-target vectors, and inverse-square force logic.",
        "diagramType": "charges",
        "objectives": [
            "Write displacement vectors between charges.",
            "Predict attraction versus repulsion.",
            "Use Coulomb's law with clean sign reasoning.",
        ],
        "formulas": [
            ("Force magnitude", "F = k |q1 q2| / r^2"),
            ("Field relation", "E = F / q_test"),
            ("Vector idea", "pick r_hat from source to target"),
        ],
        "pitfalls": [
            "Using the wrong displacement direction.",
            "Forgetting that electrons flip force direction relative to E.",
        ],
    },
    13: {
        "title": "Electric Field Reasoning",
        "summary": "Translate electric-field arrows into force, source-charge, and symmetry reasoning.",
        "diagramType": "field-lines",
        "objectives": [
            "Interpret E at a point.",
            "Relate E to force on positive and negative charges.",
            "Use symmetry to infer likely source locations.",
        ],
        "formulas": [
            ("Force from field", "F = q E"),
            ("Point-charge field", "E = k |q| / r^2"),
            ("Superposition", "E_net = sum(E_i)"),
        ],
        "pitfalls": [
            "Confusing the field with the force.",
            "Forgetting electrons accelerate opposite the field direction.",
        ],
    },
    14: {
        "title": "Charge and Conductors",
        "summary": "Track transferred charge and explain conductor equilibrium and polarization.",
        "diagramType": "conductor",
        "objectives": [
            "Use charge conservation.",
            "State the equilibrium rule inside a conductor.",
            "Explain induced surface charge patterns.",
        ],
        "formulas": [
            ("Conservation", "Q_initial = Q_final"),
            ("Equilibrium", "E_net = 0 inside a conductor"),
            ("Quantization", "Q = n e"),
        ],
        "pitfalls": [
            "Mixing the net field with one field contribution.",
            "Forgetting that polarization redistributes surface charge.",
        ],
    },
    15: {
        "title": "Fields from Distributed Charge",
        "summary": "Move from point charges to rods, disks, and other continuous charge distributions.",
        "diagramType": "continuous-charge",
        "objectives": [
            "Break a charged object into small elements.",
            "Use symmetry to remove canceled components.",
            "Choose between exact and approximate formulas.",
        ],
        "formulas": [
            ("Charge element", "dq = lambda dx, sigma dA, or rho dV"),
            ("Field element", "dE = k dq / r^2"),
            ("Build the answer", "E = integral(dE)"),
        ],
        "pitfalls": [
            "Keeping components that symmetry should cancel.",
            "Using far-field approximations too close to the object.",
        ],
    },
    16: {
        "title": "Electric Potential and Energy",
        "summary": "Connect fields to potential, potential energy, and motion through voltage differences.",
        "diagramType": "potential",
        "objectives": [
            "Use Delta U = q Delta V correctly.",
            "Relate electric energy changes to kinetic energy changes.",
            "Determine the sign of Delta V in plate problems.",
        ],
        "formulas": [
            ("Potential energy", "Delta U = q Delta V"),
            ("Energy conservation", "Delta K = -Delta U"),
            ("Uniform field", "Delta V = -E d cos(theta)"),
        ],
        "pitfalls": [
            "Confusing potential with potential energy.",
            "Using proton intuition for electrons without flipping signs.",
        ],
    },
    17: {
        "title": "Current and Magnetic Fields from Current",
        "summary": "Connect charge flow rates to current and to the magnetic fields made by wires.",
        "diagramType": "wire-field",
        "objectives": [
            "Convert particle flow to current.",
            "Separate electron flow from conventional current.",
            "Use the right-hand rule around a wire.",
        ],
        "formulas": [
            ("Current", "I = Delta Q / Delta t"),
            ("Charge counting", "Q = N e"),
            ("Straight wire field", "B = mu0 I / (2 pi r)"),
        ],
        "pitfalls": [
            "Dropping the electron charge in conversions.",
            "Applying the right-hand rule to electron flow instead of conventional current.",
        ],
    },
    18: {
        "title": "Steady-State Wires and Resistance",
        "summary": "Study the microscopic picture of current, internal electric fields, and resistance in wires.",
        "diagramType": "resistance",
        "objectives": [
            "Describe a metal wire in steady state.",
            "Relate field, current density, and resistivity.",
            "Use geometry when finding resistance or field.",
        ],
        "formulas": [
            ("Ohm's law", "V = I R"),
            ("Resistance", "R = rho L / A"),
            ("Current density", "J = sigma E"),
        ],
        "pitfalls": [
            "Assuming the field must be zero inside a working wire.",
            "Forgetting to turn diameter into radius for area.",
        ],
    },
    19: {
        "title": "Microscopic Conduction and RC Transients",
        "summary": "Blend conduction ideas with capacitor charge/discharge behavior and time-dependent current.",
        "diagramType": "rc",
        "objectives": [
            "Estimate the small field needed to drive current in metals.",
            "Use current density and conductivity.",
            "Interpret RC-style transient graphs.",
        ],
        "formulas": [
            ("Microscopic field", "E = J / sigma"),
            ("Current density", "J = I / A"),
            ("RC decay", "I(t) = I0 exp(-t / RC)"),
        ],
        "pitfalls": [
            "Confusing conductivity with resistivity.",
            "Expecting a linear trend when the physics is exponential.",
        ],
    },
    20: {
        "title": "Magnetic Force and Crossed Fields",
        "summary": "Work with magnetic force directions, magnitude, straight-line balance, and beam motion.",
        "diagramType": "magnetic-force",
        "objectives": [
            "Predict magnetic-force direction.",
            "Use the angle dependence in q v x B problems.",
            "Balance electric and magnetic forces when paths stay straight.",
        ],
        "formulas": [
            ("Magnetic force", "F = q v x B"),
            ("Magnitude", "|F| = |q| v B sin(theta)"),
            ("Straight path", "q E = q v B"),
        ],
        "pitfalls": [
            "Forgetting magnetic force is perpendicular to motion.",
            "Using the proton right-hand result for an electron without reversing it.",
        ],
    },
    21: {
        "title": "Flux Through Surfaces",
        "summary": "Use normals and geometry to compute electric or magnetic flux through surfaces.",
        "diagramType": "flux",
        "objectives": [
            "Use the angle to the area vector.",
            "Determine flux sign from orientation.",
            "Interpret field data across a surface.",
        ],
        "formulas": [
            ("Electric flux", "phi_E = E A cos(theta)"),
            ("Magnetic flux", "phi_B = B A cos(theta)"),
            ("General form", "phi = integral(F dot dA)"),
        ],
        "pitfalls": [
            "Using the angle to the plane instead of the normal.",
            "Ignoring which way the chosen normal points.",
        ],
    },
    22: {
        "title": "Induction and Curling Electric Fields",
        "summary": "Reason about changing magnetic flux, induced circulation, and Faraday-style direction questions.",
        "diagramType": "induction",
        "objectives": [
            "Predict clockwise versus counterclockwise induced behavior.",
            "Use Lenz reasoning to oppose flux change.",
            "Recognize that induced electric fields form loops.",
        ],
        "formulas": [
            ("Faraday's law", "loop integral(E dot dl) = - d(phi_B) / dt"),
            ("Lenz idea", "induced effect opposes flux change"),
            ("Field shape", "induced E forms loops"),
        ],
        "pitfalls": [
            "Switching viewpoint mid-problem.",
            "Using electrostatic field intuition for induction problems.",
        ],
    },
    23: {
        "title": "Electromagnetic Waves",
        "summary": "Tie together propagation direction, field orientation, wavelength, and frequency.",
        "diagramType": "em-wave",
        "objectives": [
            "Use the perpendicular E-B-propagation relationship.",
            "Convert between wavelength and frequency.",
            "Compare waves across the electromagnetic spectrum.",
        ],
        "formulas": [
            ("Wave speed", "c = f lambda"),
            ("Field ratio", "E / B = c"),
            ("Geometry", "E perp B perp propagation"),
        ],
        "pitfalls": [
            "Pointing E and B parallel instead of perpendicular.",
            "Dropping powers of ten in unit conversions.",
        ],
    },
}


NOISE_BITS = [
    "you've completed all of the work in this assignment",
    "question ",
    "policies",
    "attempt history",
    "your answer",
    "correct answer",
    "your answer is correct",
    "save for later",
    "submit answer",
    "attempts:",
    "using multiple attempts",
    "score reduction after attempt",
    "current attempt in progress",
    "etextbook and media",
]


def slugify(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-") or "item"


def parse_assignment_name(name: str) -> tuple[int, int, str]:
    match = re.match(r"CH(\d+)\s+HW(\d+)(?:\s+(.*))?$", name, flags=re.IGNORECASE)
    if not match:
        raise ValueError(f"Unsupported assignment folder name: {name}")
    chapter = int(match.group(1))
    homework = int(match.group(2))
    suffix = (match.group(3) or "").strip()
    return chapter, homework, suffix


def quoted_rel_url(path: Path) -> str:
    parts = path.relative_to(ROOT).parts
    return "../" + "/".join(quote(part) for part in parts)


def clean_line(text: str) -> str:
    text = text.replace("\u2019", "'").replace("\u2013", "-").replace("\u2014", "-")
    text = text.replace("\u00a0", " ")
    return re.sub(r"\s+", " ", text).strip(" -")


def skip_line(line: str, assignment_name: str) -> bool:
    lowered = line.lower()
    if not lowered or lowered == assignment_name.lower():
        return True
    if any(bit in lowered for bit in NOISE_BITS):
        return True
    if re.fullmatch(r"\d+\s*/\s*\d+", lowered):
        return True
    if re.fullmatch(r"[a-z]?\d+(\.\d+)?([eE][+-]?\d+)?", lowered):
        return True
    return False


def dedupe(items: list[str]) -> list[str]:
    seen = set()
    kept: list[str] = []
    for item in items:
        if item not in seen:
            kept.append(item)
            seen.add(item)
    return kept


def excerpt_from(lines: list[str]) -> str:
    for line in lines:
        if "?" in line and len(line) >= 28:
            return line
    for line in lines:
        if len(line) >= 40:
            return line
    return lines[0] if lines else "Open the screenshot to study this question."


def infer_focus(chapter: int, excerpt: str) -> str:
    guide = CHAPTER_GUIDES[chapter]
    if excerpt and excerpt != "Open the screenshot to study this question.":
        return excerpt
    return guide["summary"]


def ocr_question(ocr: RapidOCR, image_path: Path, assignment_name: str) -> dict:
    result, _ = ocr(str(image_path))
    raw_lines: list[str] = []
    if result:
        for item in result:
            line = clean_line(item[1])
            if skip_line(line, assignment_name):
                continue
            raw_lines.append(line)

    lines = dedupe(raw_lines)
    with Image.open(image_path) as image:
        width, height = image.size

    return {
        "fileName": image_path.name,
        "assetUrl": quoted_rel_url(image_path),
        "relativePath": image_path.relative_to(ROOT).as_posix(),
        "width": width,
        "height": height,
        "lineCount": len(lines),
        "excerpt": excerpt_from(lines),
        "transcript": "\n".join(lines),
    }


def build_course_data() -> dict:
    if not COURSE_DIR.exists():
        raise FileNotFoundError(f"Missing course folder: {COURSE_DIR}")

    ocr = RapidOCR()
    assignment_folders = sorted(
        [path for path in COURSE_DIR.iterdir() if path.is_dir()],
        key=lambda path: parse_assignment_name(path.name)[:2],
    )

    chapters_map: defaultdict[int, list[dict]] = defaultdict(list)
    assignments: list[dict] = []
    tree_folders: list[dict] = []
    total_questions = 0

    for folder in assignment_folders:
        chapter, homework, suffix = parse_assignment_name(folder.name)
        guide = CHAPTER_GUIDES[chapter]
        questions: list[dict] = []
        files: list[dict] = []

        for index, image_path in enumerate(sorted(folder.glob("question-*.png")), start=1):
            question = ocr_question(ocr, image_path, folder.name)
            question["index"] = index
            question["label"] = f"Question {index:02d}"
            question["anchor"] = f"{slugify(folder.name)}-question-{index:02d}"
            questions.append(question)
            files.append({"name": image_path.name, "index": index, "anchor": question["anchor"]})

        focus = infer_focus(chapter, questions[0]["excerpt"] if questions else "")
        assignment = {
            "name": folder.name,
            "slug": slugify(folder.name),
            "chapterNumber": chapter,
            "chapterKey": f"ch{chapter:02d}",
            "chapterTitle": guide["title"],
            "homeworkNumber": homework,
            "suffix": suffix,
            "focus": focus,
            "spotlight": guide["summary"],
            "tags": [guide["title"], chapter and f"CH{chapter}", f"HW{homework}"],
            "studySteps": guide["objectives"],
            "questionCount": len(questions),
            "folderPath": f"PY208/{folder.name}",
            "coverImage": questions[0]["assetUrl"] if questions else "",
            "coverExcerpt": questions[0]["excerpt"] if questions else "",
            "questions": questions,
        }
        assignments.append(assignment)
        chapters_map[chapter].append(assignment)
        tree_folders.append(
            {
                "name": folder.name,
                "slug": assignment["slug"],
                "chapterNumber": chapter,
                "homeworkNumber": homework,
                "questionCount": len(questions),
                "files": files,
            }
        )
        total_questions += len(questions)

    chapters: list[dict] = []
    for chapter in sorted(chapters_map):
        guide = CHAPTER_GUIDES[chapter]
        chapter_assignments = chapters_map[chapter]
        chapters.append(
            {
                "key": f"ch{chapter:02d}",
                "number": chapter,
                "title": guide["title"],
                "summary": guide["summary"],
                "diagramType": guide["diagramType"],
                "learningObjectives": guide["objectives"],
                "formulaBoard": [
                    {"label": label, "equation": equation, "note": guide["summary"]}
                    for label, equation in guide["formulas"]
                ],
                "studyChecklist": guide["objectives"],
                "pitfalls": guide["pitfalls"],
                "assignmentCount": len(chapter_assignments),
                "questionCount": sum(item["questionCount"] for item in chapter_assignments),
                "assignments": chapter_assignments,
            }
        )

    return {
        "generatedAt": datetime.now(UTC).isoformat(),
        "courseTitle": "PY208 Learning Atlas",
        "courseRoot": "PY208",
        "stats": {
            "chapterCount": len(chapters),
            "assignmentCount": len(assignments),
            "questionCount": total_questions,
        },
        "tree": {"name": "PY208", "folders": tree_folders},
        "chapters": chapters,
        "assignments": assignments,
    }


def write_course_data(output_path: Path = OUTPUT_PATH) -> Path:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    payload = build_course_data()
    output_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    return output_path


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8")
    output_path = write_course_data()
    print(f"Study data written to {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
