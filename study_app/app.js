const DATA_URL = "./course-data.json";

const state = {
  data: null,
  query: "",
  route: { type: "dashboard" },
};

const elements = {
  content: document.getElementById("content"),
  folderTree: document.getElementById("folder-tree"),
  searchInput: document.getElementById("search-input"),
  topbarTitle: document.getElementById("topbar-title"),
  dashboardButton: document.getElementById("dashboard-button"),
  conceptsButton: document.getElementById("concepts-button"),
  firstAssignmentButton: document.getElementById("first-assignment-button"),
};


function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}


function chapterLabel(number) {
  return `CH${number}`;
}


function indexes() {
  return {
    chapterMap: new Map(state.data.chapters.map((chapter) => [chapter.key, chapter])),
    assignmentMap: new Map(state.data.assignments.map((assignment) => [assignment.slug, assignment])),
  };
}


function parseRoute() {
  const hash = window.location.hash.replace(/^#/, "");
  const parts = hash.split("/");
  if (!hash) {
    return { type: "dashboard" };
  }
  if (parts[0] === "concepts") {
    return { type: "concepts" };
  }
  if (parts[0] === "chapter" && parts[1]) {
    return { type: "chapter", key: parts[1] };
  }
  if (parts[0] === "assignment" && parts[1]) {
    return { type: "assignment", slug: parts[1] };
  }
  if (parts[0] === "question" && parts[1] && parts[2]) {
    return { type: "question", slug: parts[1], index: Number(parts[2]) || 1 };
  }
  return { type: "dashboard" };
}


function setRoute(route) {
  if (route.type === "dashboard") {
    window.location.hash = "";
    return;
  }
  if (route.type === "concepts") {
    window.location.hash = "concepts";
    return;
  }
  if (route.type === "chapter") {
    window.location.hash = `chapter/${route.key}`;
    return;
  }
  if (route.type === "assignment") {
    window.location.hash = `assignment/${route.slug}`;
    return;
  }
  if (route.type === "question") {
    window.location.hash = `question/${route.slug}/${route.index}`;
  }
}


function diagramMarkup(type) {
  const diagrams = {
    vectors: `
      <svg viewBox="0 0 420 200" aria-hidden="true">
        <line x1="50" y1="140" x2="350" y2="140" stroke="#20334f" stroke-width="3"></line>
        <line x1="120" y1="140" x2="210" y2="70" stroke="#147a7e" stroke-width="6"></line>
        <line x1="120" y1="140" x2="70" y2="140" stroke="#d38d37" stroke-width="6"></line>
        <line x1="250" y1="95" x2="330" y2="95" stroke="#147a7e" stroke-width="6"></line>
        <text x="214" y="72" fill="#147a7e" font-size="20">b</text>
        <text x="56" y="135" fill="#d38d37" font-size="20">e</text>
        <text x="335" y="92" fill="#147a7e" font-size="20">c</text>
      </svg>`,
    charges: `
      <svg viewBox="0 0 420 200" aria-hidden="true">
        <circle cx="110" cy="102" r="30" fill="rgba(211,141,55,0.18)" stroke="#d38d37" stroke-width="4"></circle>
        <circle cx="300" cy="102" r="30" fill="rgba(20,122,126,0.16)" stroke="#147a7e" stroke-width="4"></circle>
        <text x="100" y="110" fill="#8a5718" font-size="24">+</text>
        <text x="292" y="109" fill="#0f6368" font-size="24">-</text>
        <line x1="142" y1="102" x2="268" y2="102" stroke="#20334f" stroke-width="3" stroke-dasharray="8 7"></line>
        <text x="198" y="92" fill="#20334f" font-size="18">r</text>
      </svg>`,
    "field-lines": `
      <svg viewBox="0 0 420 200" aria-hidden="true">
        <circle cx="92" cy="100" r="24" fill="rgba(211,141,55,0.18)" stroke="#d38d37" stroke-width="4"></circle>
        <text x="84" y="107" fill="#8a5718" font-size="22">+</text>
        <path d="M120 72 C180 56 235 56 310 72" fill="none" stroke="#147a7e" stroke-width="4"></path>
        <path d="M120 100 C180 100 235 100 310 100" fill="none" stroke="#147a7e" stroke-width="4"></path>
        <path d="M120 128 C180 144 235 144 310 128" fill="none" stroke="#147a7e" stroke-width="4"></path>
      </svg>`,
    conductor: `
      <svg viewBox="0 0 420 200" aria-hidden="true">
        <rect x="90" y="52" width="240" height="96" rx="48" fill="rgba(255,255,255,0.82)" stroke="#20334f" stroke-width="3"></rect>
        <circle cx="130" cy="78" r="9" fill="#d38d37"></circle>
        <circle cx="160" cy="72" r="9" fill="#d38d37"></circle>
        <circle cx="290" cy="126" r="9" fill="#147a7e"></circle>
        <circle cx="260" cy="132" r="9" fill="#147a7e"></circle>
        <text x="150" y="108" fill="#20334f" font-size="18">E inside = 0</text>
      </svg>`,
    "continuous-charge": `
      <svg viewBox="0 0 420 200" aria-hidden="true">
        <line x1="64" y1="120" x2="250" y2="120" stroke="#20334f" stroke-width="6"></line>
        <circle cx="100" cy="120" r="7" fill="#d38d37"></circle>
        <circle cx="134" cy="120" r="7" fill="#d38d37"></circle>
        <circle cx="168" cy="120" r="7" fill="#d38d37"></circle>
        <circle cx="202" cy="120" r="7" fill="#d38d37"></circle>
        <circle cx="314" cy="84" r="10" fill="#147a7e"></circle>
        <line x1="200" y1="118" x2="302" y2="88" stroke="#147a7e" stroke-width="4" stroke-dasharray="8 6"></line>
      </svg>`,
    potential: `
      <svg viewBox="0 0 420 200" aria-hidden="true">
        <rect x="90" y="42" width="34" height="116" rx="10" fill="rgba(211,141,55,0.22)" stroke="#d38d37" stroke-width="4"></rect>
        <rect x="296" y="42" width="34" height="116" rx="10" fill="rgba(20,122,126,0.18)" stroke="#147a7e" stroke-width="4"></rect>
        <line x1="136" y1="76" x2="286" y2="76" stroke="#20334f" stroke-dasharray="7 6"></line>
        <line x1="136" y1="104" x2="286" y2="104" stroke="#20334f" stroke-dasharray="7 6"></line>
        <line x1="136" y1="132" x2="286" y2="132" stroke="#20334f" stroke-dasharray="7 6"></line>
      </svg>`,
    "wire-field": `
      <svg viewBox="0 0 420 200" aria-hidden="true">
        <line x1="60" y1="98" x2="360" y2="98" stroke="#20334f" stroke-width="8"></line>
        <circle cx="210" cy="98" r="52" fill="none" stroke="#147a7e" stroke-width="4" stroke-dasharray="11 9"></circle>
        <circle cx="210" cy="98" r="82" fill="none" stroke="#147a7e" stroke-width="4" stroke-dasharray="11 9"></circle>
      </svg>`,
    resistance: `
      <svg viewBox="0 0 420 200" aria-hidden="true">
        <rect x="88" y="82" width="244" height="32" rx="14" fill="rgba(255,255,255,0.88)" stroke="#20334f" stroke-width="3"></rect>
        <circle cx="122" cy="98" r="7" fill="#147a7e"></circle>
        <circle cx="158" cy="98" r="7" fill="#147a7e"></circle>
        <circle cx="194" cy="98" r="7" fill="#147a7e"></circle>
        <circle cx="230" cy="98" r="7" fill="#147a7e"></circle>
      </svg>`,
    rc: `
      <svg viewBox="0 0 420 200" aria-hidden="true">
        <line x1="62" y1="136" x2="104" y2="136" stroke="#20334f" stroke-width="4"></line>
        <line x1="104" y1="110" x2="104" y2="162" stroke="#20334f" stroke-width="4"></line>
        <line x1="124" y1="110" x2="124" y2="162" stroke="#20334f" stroke-width="4"></line>
        <line x1="124" y1="136" x2="208" y2="136" stroke="#20334f" stroke-width="4"></line>
        <path d="M208 136 C224 116 236 156 252 136 C268 116 280 156 296 136" fill="none" stroke="#147a7e" stroke-width="4"></path>
      </svg>`,
    "magnetic-force": `
      <svg viewBox="0 0 420 200" aria-hidden="true">
        <circle cx="110" cy="102" r="16" fill="rgba(211,141,55,0.18)" stroke="#d38d37" stroke-width="4"></circle>
        <line x1="134" y1="102" x2="214" y2="102" stroke="#147a7e" stroke-width="5"></line>
        <line x1="110" y1="78" x2="110" y2="36" stroke="#20334f" stroke-width="5"></line>
        <line x1="110" y1="102" x2="110" y2="160" stroke="#b95f4c" stroke-width="5"></line>
      </svg>`,
    flux: `
      <svg viewBox="0 0 420 200" aria-hidden="true">
        <ellipse cx="210" cy="110" rx="96" ry="44" fill="rgba(255,255,255,0.82)" stroke="#20334f" stroke-width="3"></ellipse>
        <line x1="210" y1="110" x2="210" y2="48" stroke="#d38d37" stroke-width="5"></line>
        <line x1="150" y1="46" x2="170" y2="168" stroke="#147a7e" stroke-width="4" stroke-dasharray="10 8"></line>
        <line x1="200" y1="40" x2="220" y2="166" stroke="#147a7e" stroke-width="4" stroke-dasharray="10 8"></line>
        <line x1="250" y1="46" x2="270" y2="168" stroke="#147a7e" stroke-width="4" stroke-dasharray="10 8"></line>
      </svg>`,
    induction: `
      <svg viewBox="0 0 420 200" aria-hidden="true">
        <circle cx="208" cy="100" r="68" fill="none" stroke="#147a7e" stroke-width="4" stroke-dasharray="10 8"></circle>
        <path d="M148 100 A60 60 0 1 1 208 160" fill="none" stroke="#b95f4c" stroke-width="6"></path>
        <line x1="208" y1="26" x2="208" y2="48" stroke="#d38d37" stroke-width="6"></line>
      </svg>`,
    "em-wave": `
      <svg viewBox="0 0 420 200" aria-hidden="true">
        <path d="M42 100 C72 42 104 42 134 100 C164 158 196 158 226 100 C256 42 288 42 318 100" fill="none" stroke="#147a7e" stroke-width="5"></path>
        <path d="M42 100 C72 158 104 158 134 100 C164 42 196 42 226 100 C256 158 288 158 318 100" fill="none" stroke="#d38d37" stroke-width="5"></path>
        <line x1="42" y1="100" x2="370" y2="100" stroke="#20334f" stroke-dasharray="8 7"></line>
      </svg>`,
  };

  return `<div class="diagram-frame">${diagrams[type] || diagrams.vectors}</div>`;
}


function statMarkup(stats) {
  return `
    <div class="stats-grid">
      <article class="stat-card">
        <div class="stat-card__value">${stats.chapterCount}</div>
        <h4>Chapter Blocks</h4>
        <p>Guides that cover the full folder span.</p>
      </article>
      <article class="stat-card">
        <div class="stat-card__value">${stats.assignmentCount}</div>
        <h4>Homework Folders</h4>
        <p>Each assignment stays in original folder order.</p>
      </article>
      <article class="stat-card">
        <div class="stat-card__value">${stats.questionCount}</div>
        <h4>Captured Questions</h4>
        <p>Every screenshot is included with OCR text.</p>
      </article>
    </div>
  `;
}


function buttonCard(label, body, attrs) {
  return `
    <button class="jump-card" type="button" ${attrs}>
      <h4>${escapeHtml(label)}</h4>
      <p>${escapeHtml(body)}</p>
    </button>
  `;
}


function formulaMarkup(formula) {
  return `
    <article class="formula-card">
      <h4>${escapeHtml(formula.label)}</h4>
      <code>${escapeHtml(formula.equation)}</code>
      <p>${escapeHtml(formula.note)}</p>
    </article>
  `;
}


function listMarkup(title, items) {
  const entries = items && items.length ? items : ["No notes available yet."];
  return `
    <article class="list-card">
      <h4>${escapeHtml(title)}</h4>
      <ul class="bullet-list">
        ${entries.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
      </ul>
    </article>
  `;
}


function pathMarkup(parts) {
  return `<p class="pathline">${parts.map((part) => escapeHtml(part)).join(" / ")}</p>`;
}


function renderFolderTree() {
  const slug = state.route.slug || null;
  const selectedIndex = state.route.type === "question" ? state.route.index : null;
  elements.folderTree.innerHTML = state.data.tree.folders
    .map((folder) => {
      const open = slug === folder.slug;
      return `
        <div>
          <button class="tree-folder ${open ? "is-active" : ""}" type="button" data-route="assignment" data-slug="${escapeHtml(folder.slug)}">
            <span>${escapeHtml(folder.name)}</span>
            <span class="tree-folder__badge">${folder.questionCount}</span>
          </button>
          ${
            open
              ? `
                <div class="tree-file-list">
                  ${folder.files
                    .map(
                      (file) => `
                        <button
                          class="tree-file ${selectedIndex === file.index ? "is-active" : ""}"
                          type="button"
                          data-route="question"
                          data-slug="${escapeHtml(folder.slug)}"
                          data-index="${file.index}"
                        >
                          ${escapeHtml(file.name)}
                        </button>
                      `,
                    )
                    .join("")}
                </div>
              `
              : ""
          }
        </div>
      `;
    })
    .join("");
}


function renderDashboard() {
  const first = state.data.assignments[0];
  elements.topbarTitle.textContent = "Course Dashboard";
  elements.content.innerHTML = `
    <article class="hero-card">
      <div class="hero-grid">
        <div class="section-block">
          <p class="eyebrow">Built From Your Folder</p>
          <h3>${escapeHtml(state.data.courseTitle)}</h3>
          <p>
            This app mirrors the real PY208 folder layout, keeps every screenshot in order,
            and layers in chapter guides, OCR-backed search, and diagrams so the whole folder
            works like a full study atlas.
          </p>
          <div class="chip-row">
            <span class="chip">Exact folder tree</span>
            <span class="chip">Searchable screenshots</span>
            <span class="chip">Chapter guides</span>
            <span class="chip">Concept path</span>
          </div>
          <div class="assignment-links">
            ${buttonCard("Concepts In Order", "Study the whole folder as one guided sequence.", `data-route="concepts"`)}
            ${buttonCard(first.name, "Start with the first captured homework.", `data-route="assignment" data-slug="${escapeHtml(first.slug)}"`)}
          </div>
        </div>
        <div class="overview-card">
          <p class="eyebrow">Big Picture</p>
          ${diagramMarkup("em-wave")}
          <p>
            The capture covers vectors, Coulomb reasoning, electric fields, potential, current,
            circuits, magnetism, induction, flux, and electromagnetic waves.
          </p>
        </div>
      </div>
      ${statMarkup(state.data.stats)}
    </article>

    <section class="content">
      <h3 class="section-title">Chapter Roadmap</h3>
      <div class="chapter-grid">
        ${state.data.chapters
          .map(
            (chapter) => `
              <article class="chapter-card">
                <p class="eyebrow">${escapeHtml(chapterLabel(chapter.number))}</p>
                <h3>${escapeHtml(chapter.title)}</h3>
                <p>${escapeHtml(chapter.summary)}</p>
                <div class="chip-row">
                  <span class="chip">${chapter.assignmentCount} assignments</span>
                  <span class="chip">${chapter.questionCount} questions</span>
                </div>
                ${buttonCard(`Open ${chapterLabel(chapter.number)}`, "See the guide, formulas, pitfalls, and assignments.", `data-route="chapter" data-key="${escapeHtml(chapter.key)}"`)}
              </article>
            `,
          )
          .join("")}
      </div>
    </section>
  `;
}


function conceptJumpMarkup(chapter, index) {
  return `
    <button class="concept-strip-card" type="button" data-route="chapter" data-key="${escapeHtml(chapter.key)}">
      <span class="concept-strip-card__index">${String(index + 1).padStart(2, "0")}</span>
      <p class="concept-strip-card__eyebrow">${escapeHtml(chapterLabel(chapter.number))}</p>
      <strong>${escapeHtml(chapter.title)}</strong>
    </button>
  `;
}


function formulaGridMarkup(formulas) {
  if (!formulas || !formulas.length) {
    return `<div class="empty-state">No formulas were captured for this concept block yet.</div>`;
  }
  return `<div class="formula-grid">${formulas.map(formulaMarkup).join("")}</div>`;
}


function conceptStepMarkup(chapter, index, nextChapter) {
  const firstAssignment = chapter.assignments[0] || null;
  const lastAssignment = chapter.assignments[chapter.assignments.length - 1] || null;
  const pathParts = ["PY208"];

  if (firstAssignment) {
    pathParts.push(firstAssignment.name);
  }
  if (lastAssignment && lastAssignment.slug !== firstAssignment?.slug) {
    pathParts.push(lastAssignment.name);
  }

  return `
    <article class="concept-step" id="concept-${escapeHtml(chapter.key)}">
      <div class="concept-step__header">
        <div class="concept-step__number">${String(index + 1).padStart(2, "0")}</div>
        <div class="concept-step__intro">
          <p class="eyebrow">${escapeHtml(chapterLabel(chapter.number))}</p>
          <h3>${escapeHtml(chapter.title)}</h3>
          <p>${escapeHtml(chapter.summary)}</p>
          ${pathMarkup(pathParts)}
        </div>
        <div class="concept-step__meta">
          <span class="chip">${chapter.assignmentCount} assignments</span>
          <span class="chip">${chapter.questionCount} questions</span>
          <p class="concept-step__next">
            ${escapeHtml(
              nextChapter
                ? `Next up: ${chapterLabel(nextChapter.number)} ${nextChapter.title}`
                : "Final concept block in the captured folder.",
            )}
          </p>
        </div>
      </div>

      <div class="concept-step__body">
        <section class="overview-card">
          <p class="eyebrow">Mental Model</p>
          ${diagramMarkup(chapter.diagramType)}
          <p>
            ${escapeHtml(
              nextChapter
                ? `Lock this down before moving into ${nextChapter.title}.`
                : "Use this final unit to connect the full course into one picture.",
            )}
          </p>
        </section>
        <div class="list-grid">
          ${listMarkup("Concepts to learn", chapter.learningObjectives)}
          ${listMarkup("Study in this order", chapter.studyChecklist)}
          ${listMarkup("Mistakes to avoid", chapter.pitfalls)}
        </div>
      </div>

      <div class="concept-step__section">
        <h4 class="concept-step__section-title">Formula Board</h4>
        ${formulaGridMarkup(chapter.formulaBoard)}
      </div>

      <div class="concept-step__section">
        <h4 class="concept-step__section-title">Assignments That Reinforce This Unit</h4>
        <div class="assignment-links">
          ${buttonCard(
            `Open ${chapterLabel(chapter.number)} guide`,
            "See the focused chapter page with formulas, diagrams, and linked homework.",
            `data-route="chapter" data-key="${escapeHtml(chapter.key)}"`,
          )}
          ${
            chapter.assignments
              .map((assignment) =>
                buttonCard(
                  assignment.name,
                  assignment.focus,
                  `data-route="assignment" data-slug="${escapeHtml(assignment.slug)}"`,
                ),
              )
              .join("")
          }
        </div>
      </div>
    </article>
  `;
}


function renderConcepts() {
  const chapters = [...state.data.chapters].sort((left, right) => left.number - right.number);
  const firstChapter = chapters[0];
  const lastChapter = chapters[chapters.length - 1];

  elements.topbarTitle.textContent = "Concepts In Order";
  elements.content.innerHTML = `
    <article class="hero-card">
      <div class="hero-grid">
        <div class="section-block">
          <p class="eyebrow">Guided Sequence</p>
          <h3>Learn every concept in the same order the folder builds it.</h3>
          <p>
            This tab turns the captured PY208 material into one continuous lesson path. Each stop includes
            the core idea, a diagram, the formulas, the study checklist, and the exact assignment folders
            that practice that concept.
          </p>
          <div class="chip-row">
            <span class="chip">${chapters.length} ordered concept blocks</span>
            <span class="chip">${state.data.stats.assignmentCount} linked assignments</span>
            <span class="chip">${state.data.stats.questionCount} screenshot prompts</span>
          </div>
          <p class="muted-line">
            Sequence covered: ${escapeHtml(chapterLabel(firstChapter.number))} through ${escapeHtml(chapterLabel(lastChapter.number))}.
          </p>
        </div>
        <div class="overview-card">
          <p class="eyebrow">Jump To A Unit</p>
          <div class="concept-strip">
            ${chapters.map(conceptJumpMarkup).join("")}
          </div>
        </div>
      </div>
    </article>

    <section class="content">
      <h3 class="section-title">Ordered Concept Track</h3>
      <div class="concept-track">
        ${chapters
          .map((chapter, index) => conceptStepMarkup(chapter, index, chapters[index + 1] || null))
          .join("")}
      </div>
    </section>
  `;
}


function renderChapter(chapter) {
  elements.topbarTitle.textContent = `${chapterLabel(chapter.number)} Guide`;
  elements.content.innerHTML = `
    <article class="assignment-page">
      <div class="assignment-page__hero">
        <section class="overview-card">
          <p class="eyebrow">${escapeHtml(chapterLabel(chapter.number))}</p>
          <h3>${escapeHtml(chapter.title)}</h3>
          <p>${escapeHtml(chapter.summary)}</p>
          <div class="chip-row">
            <span class="chip">${chapter.assignmentCount} assignments</span>
            <span class="chip">${chapter.questionCount} questions</span>
          </div>
          ${pathMarkup(["PY208", `${chapterLabel(chapter.number)} ...`])}
        </section>
        <section class="overview-card">
          <p class="eyebrow">Concept Diagram</p>
          ${diagramMarkup(chapter.diagramType)}
          <p>Use this as a quick mental model before drilling into the screenshots.</p>
        </section>
      </div>

      <section class="content">
        <h3 class="section-title">Core Ideas</h3>
        <div class="list-grid">
          ${listMarkup("What to master", chapter.learningObjectives)}
          ${listMarkup("Study order", chapter.studyChecklist)}
          ${listMarkup("Common pitfalls", chapter.pitfalls)}
        </div>
      </section>

      <section class="content">
        <h3 class="section-title">Formula Board</h3>
        ${formulaGridMarkup(chapter.formulaBoard)}
      </section>

      <section class="content">
        <h3 class="section-title">Assignments In This Chapter</h3>
        <div class="assignment-links">
          ${chapter.assignments
            .map((assignment) =>
              buttonCard(
                assignment.name,
                assignment.focus,
                `data-route="assignment" data-slug="${escapeHtml(assignment.slug)}"`,
              ),
            )
            .join("")}
        </div>
      </section>
    </article>
  `;
}


function questionCardMarkup(assignment, question, open) {
  return `
    <details class="question-card" ${open ? "open" : ""} id="${escapeHtml(question.anchor)}">
      <summary>
        <div class="question-card__summary-top">
          <div>
            <p class="eyebrow">${escapeHtml(question.fileName)}</p>
            <h4 class="question-card__title">${escapeHtml(question.label)}</h4>
          </div>
          <span class="chip">${question.lineCount} OCR lines</span>
        </div>
        <p class="question-card__excerpt">${escapeHtml(question.excerpt)}</p>
      </summary>
      <div class="question-card__body">
        <div class="question-image">
          <img
            loading="lazy"
            src="${escapeHtml(question.assetUrl)}"
            alt="${escapeHtml(`${assignment.name} ${question.label}`)}"
            width="${question.width}"
            height="${question.height}"
          >
        </div>
        <div class="transcript-box">
          <h4>Extracted prompt text</h4>
          <pre>${escapeHtml(question.transcript || "No OCR text was extracted for this screenshot.")}</pre>
        </div>
      </div>
    </details>
  `;
}


function renderAssignment(assignment, selectedQuestionIndex = 1) {
  const chapter = state.data.chapters.find((item) => item.key === assignment.chapterKey);
  elements.topbarTitle.textContent = assignment.name;
  elements.content.innerHTML = `
    <article class="assignment-page">
      <div class="assignment-page__hero">
        <section class="overview-card">
          <p class="eyebrow">${escapeHtml(`${chapterLabel(assignment.chapterNumber)} / HW${assignment.homeworkNumber}`)}</p>
          <h3>${escapeHtml(assignment.name)}</h3>
          <p>${escapeHtml(assignment.focus)}</p>
          <div class="tag-row">
            ${assignment.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}
          </div>
          ${pathMarkup(["PY208", assignment.name])}
          <p class="muted-line">${assignment.questionCount} screenshot questions in exact folder order.</p>
        </section>
        <section class="overview-card">
          <p class="eyebrow">Study Diagram</p>
          ${diagramMarkup(chapter.diagramType)}
          <p>${escapeHtml(assignment.spotlight)}</p>
        </section>
      </div>

      <section class="content">
        <h3 class="section-title">How To Work This Assignment</h3>
        <div class="list-grid">
          ${listMarkup("Suggested study steps", assignment.studySteps)}
          ${listMarkup("Chapter pitfalls to watch", chapter.pitfalls)}
        </div>
      </section>

      <section class="content">
        <h3 class="section-title">Question Stack</h3>
        <div class="question-grid">
          ${assignment.questions
            .map((question) => questionCardMarkup(assignment, question, question.index === selectedQuestionIndex))
            .join("")}
        </div>
      </section>
    </article>
  `;

  if (selectedQuestionIndex > 1) {
    requestAnimationFrame(() => {
      document.getElementById(`${assignment.slug}-question-${String(selectedQuestionIndex).padStart(2, "0")}`)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }
}


function renderSearch(query) {
  const lowered = query.trim().toLowerCase();
  elements.topbarTitle.textContent = `Search: ${query}`;
  const results = [];

  for (const assignment of state.data.assignments) {
    for (const question of assignment.questions) {
      const blob = [
        assignment.name,
        assignment.focus,
        ...assignment.tags,
        question.excerpt,
        question.transcript,
      ]
        .join(" ")
        .toLowerCase();

      if (blob.includes(lowered)) {
        results.push({
          assignment,
          question,
        });
      }
    }
  }

  elements.content.innerHTML = `
    <article class="hero-card">
      <p class="eyebrow">Search Results</p>
      <h3>${results.length} matches for "${escapeHtml(query)}"</h3>
      <p>Results are matched against assignment descriptions, tags, and OCR-extracted prompt content.</p>
    </article>
    ${
      results.length
        ? `
          <div class="search-grid">
            ${results
              .map(
                ({ assignment, question }) => `
                  <article class="search-card">
                    <p class="eyebrow">${escapeHtml(chapterLabel(assignment.chapterNumber))}</p>
                    <h4>${escapeHtml(`${assignment.name} - ${question.label}`)}</h4>
                    <p>${escapeHtml(question.excerpt)}</p>
                    <div class="tag-row">
                      ${assignment.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}
                    </div>
                    ${buttonCard(
                      "Open this question",
                      "Jump straight to the screenshot and OCR transcript.",
                      `data-route="question" data-slug="${escapeHtml(assignment.slug)}" data-index="${question.index}"`,
                    )}
                  </article>
                `,
              )
              .join("")}
          </div>
        `
        : `<div class="empty-state">No matches yet. Try a chapter number, concept word, or a phrase from a screenshot.</div>`
    }
  `;
}


function renderRoute() {
  const { chapterMap, assignmentMap } = indexes();
  if (state.query.trim()) {
    renderSearch(state.query);
    return;
  }

  if (state.route.type === "concepts") {
    renderConcepts();
    return;
  }

  if (state.route.type === "chapter") {
    const chapter = chapterMap.get(state.route.key);
    if (chapter) {
      renderChapter(chapter);
      return;
    }
  }

  if (state.route.type === "assignment") {
    const assignment = assignmentMap.get(state.route.slug);
    if (assignment) {
      renderAssignment(assignment, 1);
      return;
    }
  }

  if (state.route.type === "question") {
    const assignment = assignmentMap.get(state.route.slug);
    if (assignment) {
      renderAssignment(assignment, state.route.index);
      return;
    }
  }

  renderDashboard();
}


function refresh() {
  renderFolderTree();
  elements.dashboardButton.classList.toggle("is-active", !state.query.trim() && state.route.type === "dashboard");
  elements.conceptsButton.classList.toggle("is-active", !state.query.trim() && state.route.type === "concepts");
  renderRoute();
}


function handleAction(target) {
  const route = target.dataset.route;
  if (!route) {
    return;
  }
  state.query = "";
  elements.searchInput.value = "";
  if (route === "dashboard") {
    state.route = { type: "dashboard" };
  } else if (route === "concepts") {
    state.route = { type: "concepts" };
  } else if (route === "chapter") {
    state.route = { type: "chapter", key: target.dataset.key };
  } else if (route === "assignment") {
    state.route = { type: "assignment", slug: target.dataset.slug };
  } else if (route === "question") {
    state.route = { type: "question", slug: target.dataset.slug, index: Number(target.dataset.index) || 1 };
  }
  setRoute(state.route);
  refresh();
}


async function loadData() {
  const response = await fetch(DATA_URL);
  if (!response.ok) {
    throw new Error(`Unable to load study data: ${response.status}`);
  }
  state.data = await response.json();
}


function bindEvents() {
  document.addEventListener("click", (event) => {
    const target = event.target.closest("[data-route]");
    if (target) {
      handleAction(target);
    }
  });

  window.addEventListener("hashchange", () => {
    state.route = parseRoute();
    refresh();
  });

  elements.searchInput.addEventListener("input", (event) => {
    state.query = event.target.value;
    renderRoute();
  });

  elements.dashboardButton.addEventListener("click", () => handleAction({ dataset: { route: "dashboard" } }));
  elements.conceptsButton.addEventListener("click", () => handleAction({ dataset: { route: "concepts" } }));
  elements.firstAssignmentButton.addEventListener("click", () => {
    const first = state.data?.assignments?.[0];
    if (first) {
      handleAction({ dataset: { route: "assignment", slug: first.slug } });
    }
  });
}


async function init() {
  try {
    await loadData();
    state.route = parseRoute();
    bindEvents();
    refresh();
  } catch (error) {
    elements.topbarTitle.textContent = "Unable to load the app";
    elements.content.innerHTML = `
      <article class="loading-card">
        <p class="eyebrow">Problem</p>
        <h3>Course data could not be loaded.</h3>
        <p>${escapeHtml(error.message)}</p>
      </article>
    `;
  }
}


init();
