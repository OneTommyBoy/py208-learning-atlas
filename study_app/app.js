const DATA_URL = "./course-data.json";
const PROGRESS_STORAGE_KEY = "py208-learning-atlas-progress-v3";

const PREP_SECTION_LABELS = {
  plan: "Study System",
  readiness: "Chapter Readiness",
  equation: "Equation Sheet",
  formulas: "Formula Deck",
  flashcards: "Flashcards",
  drills: "Drill Packs",
  mocks: "Mock Exams",
  "exam-day": "Exam Day",
};

const state = {
  data: null,
  query: "",
  route: { type: "dashboard" },
  progress: createEmptyProgress(),
};

const elements = {
  content: document.getElementById("content"),
  folderTree: document.getElementById("folder-tree"),
  searchInput: document.getElementById("search-input"),
  topbarTitle: document.getElementById("topbar-title"),
  dashboardButton: document.getElementById("dashboard-button"),
  conceptsButton: document.getElementById("concepts-button"),
  examButton: document.getElementById("exam-button"),
  firstAssignmentButton: document.getElementById("first-assignment-button"),
};


function createEmptyProgress() {
  return {
    planTasks: {},
    chapterStatus: {},
    knowledgeStatus: {},
    formulaStatus: {},
    flashcardStatus: {},
    drillStatus: {},
    mockScores: {},
  };
}


function normalizeProgress(raw) {
  const fallback = createEmptyProgress();
  if (!raw || typeof raw !== "object") {
    return fallback;
  }

  return {
    planTasks: raw.planTasks && typeof raw.planTasks === "object" ? raw.planTasks : {},
    chapterStatus: raw.chapterStatus && typeof raw.chapterStatus === "object" ? raw.chapterStatus : {},
    knowledgeStatus: raw.knowledgeStatus && typeof raw.knowledgeStatus === "object" ? raw.knowledgeStatus : {},
    formulaStatus: raw.formulaStatus && typeof raw.formulaStatus === "object" ? raw.formulaStatus : {},
    flashcardStatus: raw.flashcardStatus && typeof raw.flashcardStatus === "object" ? raw.flashcardStatus : {},
    drillStatus: raw.drillStatus && typeof raw.drillStatus === "object" ? raw.drillStatus : {},
    mockScores: raw.mockScores && typeof raw.mockScores === "object" ? raw.mockScores : {},
  };
}


function loadProgress() {
  try {
    return normalizeProgress(JSON.parse(window.localStorage.getItem(PROGRESS_STORAGE_KEY)));
  } catch (error) {
    return createEmptyProgress();
  }
}


function saveProgress() {
  try {
    window.localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(state.progress));
  } catch (error) {
    // Keep the app usable even if storage is blocked.
  }
}


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


function prepSectionLabel(section) {
  return PREP_SECTION_LABELS[section] || "Exam Prep";
}


function chapterStatusLabel(status) {
  if (status === "ready") {
    return "Ready";
  }
  if (status === "reviewing") {
    return "Reviewing";
  }
  return "Need Work";
}


function chapterStatusValue(status) {
  if (status === "ready") {
    return 2;
  }
  if (status === "reviewing") {
    return 1;
  }
  return 0;
}


function simpleStatusLabel(status) {
  if (status === "solid") {
    return "Locked In";
  }
  if (status === "needs-work") {
    return "Needs Work";
  }
  return "Unrated";
}


function percentage(part, whole) {
  if (!whole) {
    return 0;
  }
  return Math.round((part / whole) * 100);
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
  if (parts[0] === "exam") {
    return { type: "exam", section: parts[1] || "" };
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
  if (route.type === "exam") {
    window.location.hash = route.section ? `exam/${route.section}` : "exam";
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


function maybeScrollToPrepSection(section) {
  if (!section) {
    return;
  }

  requestAnimationFrame(() => {
    document.getElementById(`prep-section-${section}`)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  });
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


function formulaTrigger(chapter, formula) {
  const lowered = formula.label.toLowerCase();
  if (lowered.includes("magnitude")) {
    return "Use this when the problem gives components but asks for the size of a vector or force.";
  }
  if (lowered.includes("superposition")) {
    return "Use this when more than one source contributes to the same point.";
  }
  if (lowered.includes("conservation")) {
    return "Use this when a before-and-after charge or energy story is built into the setup.";
  }
  if (lowered.includes("current")) {
    return "Use this whenever charge flow is described with particles, time, or wire transport.";
  }
  if (lowered.includes("flux")) {
    return "Use this when the angle to a surface normal matters more than the angle to the surface itself.";
  }
  if (lowered.includes("wave")) {
    return "Use this when frequency, wavelength, and propagation direction need to connect cleanly.";
  }
  return `Use this when solving the core ${chapter.title.toLowerCase()} problems in this unit.`;
}


function takeChecks(chapter, indexesToUse) {
  return indexesToUse
    .map((index) => chapter.knowledgeChecks[index % chapter.knowledgeChecks.length])
    .filter(Boolean);
}


function buildSynthesisPack(chapters) {
  const potential = chapters.find((chapter) => chapter.number === 16);
  const circuits = chapters.find((chapter) => chapter.number === 18);
  const magnetism = chapters.find((chapter) => chapter.number === 20);
  const induction = chapters.find((chapter) => chapter.number === 22);
  const waves = chapters.find((chapter) => chapter.number === 23);

  return {
    id: "full-course-synthesis",
    title: "Final Synthesis Sprint",
    description: "Use these prompts after the chapter-by-chapter work feels stable. They force you to connect chapters instead of treating the course like isolated units.",
    timing: "30 to 40 minutes",
    items: [
      {
        id: "synth-field-potential",
        label: "Bridge Fields To Voltage",
        type: "Connection",
        difficulty: "Challenge",
        prompt: "Explain how electric field direction, potential difference, and a charge's potential-energy change fit together in one story.",
        checkpoints: [
          "Electric field points in the direction of decreasing electric potential.",
          "Potential-energy change is linked by Delta U = q Delta V.",
          "Positive and negative charges respond differently because q can flip the sign of Delta U.",
        ],
        pitfall: "Memorizing formulas separately without connecting field direction, Delta V, and Delta U.",
        chapterKey: potential?.key || "ch16",
        chapterNumber: potential?.number || 16,
        chapterTitle: potential?.title || "Electric Potential and Energy",
      },
      {
        id: "synth-current-fields",
        label: "Current Makes Fields",
        type: "Connection",
        difficulty: "Core",
        prompt: "Connect microscopic current in a wire to the magnetic field that appears around the wire.",
        checkpoints: [
          "Moving charge defines current, and conventional current sets the right-hand-rule direction.",
          "A working wire can still contain an electric field that drives drift.",
          "That current produces a circular magnetic field around the wire with strength that depends on distance.",
        ],
        pitfall: "Treating steady-state wires as field-free and then losing the link to magnetic effects.",
        chapterKey: circuits?.key || "ch18",
        chapterNumber: circuits?.number || 18,
        chapterTitle: circuits?.title || "Steady-State Wires and Resistance",
      },
      {
        id: "synth-magnetic-induction",
        label: "Magnetism Versus Induction",
        type: "Contrast",
        difficulty: "Challenge",
        prompt: "Contrast the magnetic force on a moving charge with the induced electric field that appears when magnetic flux changes.",
        checkpoints: [
          "Magnetic force acts on moving charges and stays perpendicular to velocity.",
          "Changing flux creates a curling electric field that can drive charges around a loop.",
          "The two ideas are linked through changing fields, but they are not the same mechanism.",
        ],
        pitfall: "Using the same intuition for magnetic-force questions and Faraday/Lenz questions.",
        chapterKey: induction?.key || "ch22",
        chapterNumber: induction?.number || 22,
        chapterTitle: induction?.title || "Induction and Curling Electric Fields",
      },
      {
        id: "synth-flux-to-faraday",
        label: "Flux As A Gatekeeper",
        type: "Reasoning",
        difficulty: "Challenge",
        prompt: "Why is flux the quantity that decides whether induction happens instead of magnetic field strength alone?",
        checkpoints: [
          "Induction depends on how much field passes through the looped area, not only on the field magnitude.",
          "Changing area or orientation can change flux even if the field magnitude stays constant.",
          "Faraday's law is written in terms of the rate of change of magnetic flux.",
        ],
        pitfall: "Looking only at B and ignoring geometry.",
        chapterKey: induction?.key || "ch22",
        chapterNumber: induction?.number || 22,
        chapterTitle: induction?.title || "Induction and Curling Electric Fields",
      },
      {
        id: "synth-cross-product",
        label: "Cross-Product Geometry",
        type: "Reasoning",
        difficulty: "Core",
        prompt: "Name two places in this course where perpendicular-direction reasoning matters, and explain the role it plays in each case.",
        checkpoints: [
          "Magnetic force uses perpendicular geometry through v x B.",
          "Electromagnetic waves use mutually perpendicular E, B, and propagation directions.",
          "Strong answers explain what each perpendicular relationship means physically, not just that the arrows are at 90 degrees.",
        ],
        pitfall: "Listing formulas without describing what the geometry controls.",
        chapterKey: magnetism?.key || "ch20",
        chapterNumber: magnetism?.number || 20,
        chapterTitle: magnetism?.title || "Magnetic Force and Crossed Fields",
      },
      {
        id: "synth-wave-story",
        label: "Final Wave Story",
        type: "Big picture",
        difficulty: "Challenge",
        prompt: "Give a compact explanation of how changing electric and magnetic fields lead naturally into electromagnetic waves.",
        checkpoints: [
          "Changing fields are tied together rather than acting as isolated static patterns.",
          "The wave carries perpendicular electric and magnetic fields through space.",
          "A strong explanation links this unit back to induction and field ideas from earlier chapters.",
        ],
        pitfall: "Describing EM waves as unrelated formulas instead of the course-wide payoff.",
        chapterKey: waves?.key || "ch23",
        chapterNumber: waves?.number || 23,
        chapterTitle: waves?.title || "Electromagnetic Waves",
      },
    ],
  };
}


function buildDrillPack(id, title, description, timing, chapters, indexesToUse) {
  return {
    id,
    title,
    description,
    timing,
    items: chapters.flatMap((chapter) =>
      takeChecks(chapter, indexesToUse).map((item) => ({
        ...item,
        id: `${id}-${item.id}`,
        label: `${chapterLabel(chapter.number)} ${item.label}`,
        chapterKey: chapter.key,
        chapterNumber: chapter.number,
        chapterTitle: chapter.title,
      })),
    ),
  };
}


function buildMockExam(id, title, summary, chapters, questionIndexes) {
  const sections = [
    {
      title: "Foundations and Electrostatics",
      description: "Set up directions, signs, and field logic cleanly before you chase algebra.",
      chapterNumbers: [1, 3, 13, 14, 15],
    },
    {
      title: "Potential and Circuits",
      description: "Push energy, current, resistance, and time-dependent circuit ideas under exam pressure.",
      chapterNumbers: [16, 17, 18, 19],
    },
    {
      title: "Magnetism, Flux, and Waves",
      description: "Finish with geometry-heavy questions that usually punish rushed sign or direction mistakes.",
      chapterNumbers: [20, 21, 22, 23],
    },
  ];

  return {
    id,
    title,
    summary,
    timing: "90 minutes",
    scoringGuide: "Score each response 0, 1, or 2 after you reveal the rubric: 0 = missed the core idea, 1 = partly right, 2 = strong exam-ready response.",
    sections: sections.map((section) => ({
      ...section,
      items: section.chapterNumbers
        .map((chapterNumber) => chapters.find((chapter) => chapter.number === chapterNumber))
        .filter(Boolean)
        .map((chapter) => {
          const source = chapter.knowledgeChecks[questionIndexes[chapter.number] ?? 0];
          return {
            ...source,
            id: `${id}-${chapter.key}-${source.label.toLowerCase()}`,
            chapterKey: chapter.key,
            chapterNumber: chapter.number,
            chapterTitle: chapter.title,
            label: `${chapterLabel(chapter.number)} ${source.label}`,
          };
        }),
    })),
  };
}


function buildFlashcardsForChapter(chapter) {
  const assignmentNames = chapter.assignments.slice(0, 3).map((assignment) => assignment.name);

  return [
    {
      id: `${chapter.key}-flash-core`,
      chapterKey: chapter.key,
      chapterNumber: chapter.number,
      chapterTitle: chapter.title,
      label: "Core Idea",
      type: "Concept",
      difficulty: "Core",
      front: `What is the central story of ${chapterLabel(chapter.number)} ${chapter.title}?`,
      backTitle: "Strong recall answer",
      backBullets: [chapter.summary, ...chapter.learningObjectives.slice(0, 2)],
    },
    {
      id: `${chapter.key}-flash-formulas`,
      chapterKey: chapter.key,
      chapterNumber: chapter.number,
      chapterTitle: chapter.title,
      label: "Formula Recall",
      type: "Formula",
      difficulty: "Core",
      front: `What formulas or relations should you be able to write instantly from ${chapter.title}?`,
      backTitle: "Write these cold",
      backBullets: chapter.formulaBoard.map((formula) => `${formula.label}: ${formula.equation}`),
    },
    {
      id: `${chapter.key}-flash-pitfalls`,
      chapterKey: chapter.key,
      chapterNumber: chapter.number,
      chapterTitle: chapter.title,
      label: "Trap Check",
      type: "Pitfalls",
      difficulty: "Foundation",
      front: `What mistakes most often cost points in ${chapter.title}?`,
      backTitle: "Avoid these slips",
      backBullets: chapter.pitfalls,
    },
    {
      id: `${chapter.key}-flash-reinforcement`,
      chapterKey: chapter.key,
      chapterNumber: chapter.number,
      chapterTitle: chapter.title,
      label: "Assignment Bridge",
      type: "Practice",
      difficulty: "Foundation",
      front: `Which folder work should you reopen when ${chapter.title} still feels weak?`,
      backTitle: "Best places to revisit",
      backBullets: assignmentNames.length
        ? assignmentNames.map((name) => `Reopen ${name} and say out loud what skill each question is testing.`)
        : ["Open the chapter guide and use the linked assignments as your first review set."],
    },
  ];
}


function buildExamPrepData(data) {
  const chapters = [...data.chapters].sort((left, right) => left.number - right.number);
  const firstChapter = chapters[0];
  const lastChapter = chapters[chapters.length - 1];
  const formulaDeck = chapters.flatMap((chapter) =>
    chapter.formulaBoard.map((formula) => ({
      ...formula,
      id: `${formula.id}-recall`,
      chapterKey: chapter.key,
      chapterNumber: chapter.number,
      chapterTitle: chapter.title,
      prompt: `State this relation from memory and explain when it belongs in ${chapter.title}.`,
      trigger: formulaTrigger(chapter, formula),
      pitfall: chapter.pitfalls[0],
    })),
  );
  const flashcards = chapters.flatMap(buildFlashcardsForChapter);
  const studySystem = [
    {
      id: "phase-map",
      title: "Pass 1",
      subtitle: "Map The Course",
      description: "Start by building the whole story of the course in order so later practice has somewhere to attach.",
      tasks: [
        {
          id: "plan-concepts-track",
          label: `Work through Concepts In Order from ${chapterLabel(firstChapter.number)} to ${chapterLabel(lastChapter.number)} without skipping units.`,
        },
        {
          id: "plan-chapter-guides",
          label: `Open every chapter guide and say each chapter's main idea out loud before you leave it.`,
        },
        {
          id: "plan-initial-status",
          label: "Mark every chapter as Need Work, Reviewing, or Ready so the app can steer your revision.",
        },
      ],
    },
    {
      id: "phase-retrieval",
      title: "Pass 2",
      subtitle: "Retrieval And Repair",
      description: "Turn passive understanding into recall by answering prompts before you reveal the rubrics.",
      tasks: [
        {
          id: "plan-knowledge-checks",
          label: `Complete all ${data.stats.knowledgeCheckCount} chapter knowledge checks and rate each one honestly.`,
        },
        {
          id: "plan-formula-deck",
          label: `Work the ${formulaDeck.length}-card formula deck until the equations feel automatic.`,
        },
        {
          id: "plan-flashcards",
          label: `Review the ${flashcards.length} flashcards until the weak cards are narrowed down.`,
        },
      ],
    },
    {
      id: "phase-pressure",
      title: "Pass 3",
      subtitle: "Exam Conditions",
      description: "Finish with cumulative practice that mixes chapters and forces speed, direction logic, and self-scoring.",
      tasks: [
        {
          id: "plan-drills",
          label: "Finish every mixed drill pack and reopen the linked chapter guide when a pack feels shaky.",
        },
        {
          id: "plan-mocks",
          label: "Take both mock exams like the real thing, then score every response with the rubric.",
        },
        {
          id: "plan-equation-sheet",
          label: "Practice with the built-in equation sheet so your real exam reference feels familiar.",
        },
      ],
    },
  ];

  const chapterTargets = chapters.map((chapter) => ({
    key: chapter.key,
    number: chapter.number,
    title: chapter.title,
    mission: chapter.summary,
    mustKnow: [
      ...chapter.learningObjectives.slice(0, 2),
      chapter.formulaBoard[0] ? `${chapter.formulaBoard[0].label}: ${chapter.formulaBoard[0].equation}` : "Know the central relation for this chapter cold.",
    ],
    trap: chapter.pitfalls[0],
    assignmentNames: chapter.assignments.slice(0, 3).map((assignment) => assignment.name),
    knowledgeCheckCount: chapter.knowledgeChecks.length,
    formulaCount: chapter.formulaBoard.length,
  }));

  const drillPacks = [
    buildDrillPack(
      "foundations-and-electrostatics",
      "Foundations and Electrostatics",
      "Run this pack when you need to tighten vector setup, field direction, charge logic, and continuous-distribution reasoning.",
      "25 to 30 minutes",
      chapters.filter((chapter) => [1, 3, 13, 14, 15].includes(chapter.number)),
      [0, 2],
    ),
    buildDrillPack(
      "potential-and-circuits",
      "Potential, Current, and Circuits",
      "This pack blends sign reasoning, energy flow, microscopic current ideas, and resistance/transient questions.",
      "20 to 25 minutes",
      chapters.filter((chapter) => [16, 17, 18, 19].includes(chapter.number)),
      [1, 3],
    ),
    buildDrillPack(
      "magnetism-and-induction",
      "Magnetism, Flux, and Induction",
      "Use this set to sharpen right-hand rules, angle choices, flux reasoning, and Lenz-law direction calls.",
      "20 to 25 minutes",
      chapters.filter((chapter) => [20, 21, 22].includes(chapter.number)),
      [0, 4, 5],
    ),
    buildSynthesisPack(chapters),
  ];

  const mockExams = [
    buildMockExam(
      "mock-a",
      "Mock Exam A",
      "A broad first pass. Take it once you have finished the concept track and at least one retrieval pass through the flashcards.",
      chapters,
      {
        1: 1,
        3: 0,
        13: 1,
        14: 1,
        15: 0,
        16: 1,
        17: 1,
        18: 1,
        19: 0,
        20: 1,
        21: 1,
        22: 0,
        23: 1,
      },
    ),
    buildMockExam(
      "mock-b",
      "Mock Exam B",
      "A tougher second pass. Use it after reviewing your weak spots from Mock A and the drill packs.",
      chapters,
      {
        1: 5,
        3: 5,
        13: 4,
        14: 4,
        15: 5,
        16: 4,
        17: 4,
        18: 4,
        19: 5,
        20: 5,
        21: 5,
        22: 5,
        23: 5,
      },
    ),
  ];

  return {
    studySystem,
    chapterTargets,
    formulaDeck,
    flashcards,
    drillPacks,
    mockExams,
    equationSheet: {
      title: "208 Equation Sheet",
      assetUrl: "./assets/208-eqn-sheet.pdf",
      note: "Keep the real-looking sheet inside the app so your final review and your exam-day reference match.",
    },
    examDay: {
      checklist: [
        "Warm up with 3 to 5 formulas from memory before you look at any solutions.",
        "Skim the chapter readiness cards and spend your first review block on anything not marked Ready.",
        "Use the equation sheet section while practicing so the reference becomes familiar instead of distracting.",
        "During mock work, say force directions and sign decisions out loud before writing equations.",
        "After every timed set, record what actually went wrong: concept gap, sign slip, geometry slip, or rushed algebra.",
      ],
      rescuePlan: [
        "If you stall on a question, identify the chapter first and reopen that chapter guide after the timed block ends.",
        "If signs keep flipping, redraw the physical direction story before touching the math.",
        "If formulas blur together, switch to the formula deck and rate every card honestly for one short pass.",
        "If you feel overloaded, use the Concepts In Order tab to rebuild the big picture before more timed work.",
      ],
    },
  };
}


function hydrateData(payload) {
  const chapters = payload.chapters.map((chapter) => {
    const formulaBoard = chapter.formulaBoard.map((formula, index) => ({
      ...formula,
      id: `${chapter.key}-formula-${index + 1}`,
    }));
    const knowledgeChecks = chapter.knowledgeChecks.map((item, index) => ({
      ...item,
      id: `${chapter.key}-kc-${index + 1}`,
    }));

    return {
      ...chapter,
      formulaBoard,
      knowledgeChecks,
    };
  });

  const hydrated = {
    ...payload,
    chapters,
  };

  hydrated.examPrep = buildExamPrepData(hydrated);
  hydrated.stats = {
    ...payload.stats,
    formulaCount: chapters.reduce((total, chapter) => total + chapter.formulaBoard.length, 0),
    knowledgeCheckCount: chapters.reduce((total, chapter) => total + chapter.knowledgeChecks.length, 0),
    flashcardCount: hydrated.examPrep.flashcards.length,
    drillPackCount: hydrated.examPrep.drillPacks.length,
    mockQuestionCount: hydrated.examPrep.mockExams.reduce(
      (total, exam) => total + exam.sections.reduce((sectionTotal, section) => sectionTotal + section.items.length, 0),
      0,
    ),
  };

  return hydrated;
}


function progressSnapshot() {
  const totalPlanTasks = state.data.examPrep.studySystem.reduce((total, phase) => total + phase.tasks.length, 0);
  const completedPlanTasks = Object.values(state.progress.planTasks).filter(Boolean).length;
  const readyChapters = Object.values(state.progress.chapterStatus).filter((status) => status === "ready").length;
  const reviewingChapters = Object.values(state.progress.chapterStatus).filter((status) => status === "reviewing").length;
  const solidKnowledge = Object.values(state.progress.knowledgeStatus).filter((status) => status === "solid").length;
  const solidFormulas = Object.values(state.progress.formulaStatus).filter((status) => status === "solid").length;
  const solidFlashcards = Object.values(state.progress.flashcardStatus).filter((status) => status === "solid").length;
  const completedDrillPacks = Object.values(state.progress.drillStatus).filter(Boolean).length;
  const mockQuestionTotal = state.data.examPrep.mockExams.reduce(
    (total, exam) => total + exam.sections.reduce((sectionTotal, section) => sectionTotal + section.items.length, 0),
    0,
  );
  const mockPoints = Object.values(state.progress.mockScores).reduce((total, value) => total + Number(value || 0), 0);
  const mockPercent = mockQuestionTotal ? Math.round((mockPoints / (mockQuestionTotal * 2)) * 100) : 0;
  const chapterPercent = percentage((readyChapters * 2) + reviewingChapters, state.data.chapters.length * 2);
  const knowledgePercent = percentage(solidKnowledge, state.data.stats.knowledgeCheckCount);
  const formulaPercent = percentage(solidFormulas, state.data.stats.formulaCount);
  const flashcardPercent = percentage(solidFlashcards, state.data.stats.flashcardCount);
  const drillPercent = percentage(completedDrillPacks, state.data.examPrep.drillPacks.length);
  const planPercent = percentage(completedPlanTasks, totalPlanTasks);
  const readiness = Math.round(
    (chapterPercent * 0.28)
    + (knowledgePercent * 0.2)
    + (formulaPercent * 0.18)
    + (flashcardPercent * 0.14)
    + (drillPercent * 0.1)
    + (planPercent * 0.05)
    + (mockPercent * 0.05),
  );

  return {
    totalPlanTasks,
    completedPlanTasks,
    readyChapters,
    reviewingChapters,
    solidKnowledge,
    solidFormulas,
    solidFlashcards,
    completedDrillPacks,
    mockQuestionTotal,
    mockPercent,
    readiness,
  };
}


function focusRecommendations() {
  return [...state.data.examPrep.chapterTargets]
    .sort((left, right) => left.number - right.number)
    .filter((chapter) => (state.progress.chapterStatus[chapter.key] || "todo") !== "ready")
    .slice(0, 3);
}


function statMarkup(stats) {
  const cards = [
    {
      value: stats.chapterCount,
      title: "Chapter Blocks",
      body: "Guides that cover the full folder span.",
    },
    {
      value: stats.assignmentCount,
      title: "Homework Folders",
      body: "Each assignment stays in original folder order.",
    },
    {
      value: stats.questionCount,
      title: "Captured Questions",
      body: "Every screenshot is included with OCR text.",
    },
    {
      value: stats.knowledgeCheckCount,
      title: "Knowledge Checks",
      body: "Chapter-by-chapter self-tests for active recall.",
    },
    {
      value: stats.flashcardCount,
      title: "Flashcards",
      body: "Condensed recall cards for formulas, traps, and concepts.",
    },
    {
      value: stats.mockQuestionCount,
      title: "Mock Questions",
      body: "Timed, cumulative prompts that pressure-test exam readiness.",
    },
  ];

  return `
    <div class="stats-grid">
      ${cards
        .map(
          (card) => `
            <article class="stat-card">
              <div class="stat-card__value">${card.value}</div>
              <h4>${escapeHtml(card.title)}</h4>
              <p>${escapeHtml(card.body)}</p>
            </article>
          `,
        )
        .join("")}
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


function formulaDisplayMarkup(formula) {
  const fallback = `<div class="formula-card__fallback">${escapeHtml(formula.equation)}</div>`;
  if (!formula.latex || !window.katex?.renderToString) {
    return fallback;
  }

  try {
    return `
      <div class="formula-card__equation" aria-label="${escapeHtml(formula.equation)}">
        ${window.katex.renderToString(formula.latex, { displayMode: true, throwOnError: false })}
      </div>
    `;
  } catch (error) {
    return fallback;
  }
}


function formulaMarkup(formula) {
  return `
    <article class="formula-card">
      <h4>${escapeHtml(formula.label)}</h4>
      ${formulaDisplayMarkup(formula)}
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


function progressMetricMarkup(value, label, detail, accent = "") {
  return `
    <article class="stat-card progress-metric ${accent}">
      <div class="stat-card__value">${escapeHtml(value)}</div>
      <h4>${escapeHtml(label)}</h4>
      <p>${escapeHtml(detail)}</p>
    </article>
  `;
}


function knowledgeCheckCardMarkup(item, options = {}) {
  const trackProgress = options.trackProgress || false;
  const status = state.progress.knowledgeStatus[item.id];

  return `
    <details class="knowledge-card">
      <summary>
        <div class="knowledge-card__meta">
          <span class="knowledge-card__label">${escapeHtml(item.label)}</span>
          <div class="chip-row">
            <span class="chip chip--teal">${escapeHtml(item.type)}</span>
            <span class="chip">${escapeHtml(item.difficulty)}</span>
            ${
              trackProgress
                ? `<span class="chip ${status === "solid" ? "chip--teal" : ""}">${escapeHtml(simpleStatusLabel(status))}</span>`
                : ""
            }
          </div>
        </div>
        <p class="knowledge-card__prompt">${escapeHtml(item.prompt)}</p>
        <p class="knowledge-card__hint">Try it first, then reveal the self-check rubric.</p>
      </summary>
      <div class="knowledge-card__body">
        <h4>Strong answer should include</h4>
        <ul class="bullet-list">
          ${item.checkpoints.map((point) => `<li>${escapeHtml(point)}</li>`).join("")}
        </ul>
        <p class="knowledge-card__pitfall"><strong>Watch for:</strong> ${escapeHtml(item.pitfall)}</p>
        ${
          trackProgress
            ? `
              <div class="progress-actions">
                <button
                  class="status-button ${status === "needs-work" ? "is-active" : ""}"
                  type="button"
                  data-progress-action="set-knowledge-status"
                  data-item-id="${escapeHtml(item.id)}"
                  data-status="needs-work"
                >
                  Needs Work
                </button>
                <button
                  class="status-button status-button--positive ${status === "solid" ? "is-active" : ""}"
                  type="button"
                  data-progress-action="set-knowledge-status"
                  data-item-id="${escapeHtml(item.id)}"
                  data-status="solid"
                >
                  Locked In
                </button>
              </div>
            `
            : ""
        }
      </div>
    </details>
  `;
}


function knowledgeCheckGridMarkup(items, options = {}) {
  const {
    limit = items?.length || 0,
    intro = "Try every prompt before revealing the answer guide.",
    previewNote = "",
    emptyMessage = "Knowledge checks have not been added for this concept block yet.",
    trackProgress = false,
  } = options;

  if (!items || !items.length) {
    return `<div class="empty-state">${escapeHtml(emptyMessage)}</div>`;
  }

  const subset = items.slice(0, limit);
  return `
    <div class="section-copy">${escapeHtml(intro)}</div>
    <div class="knowledge-grid">
      ${subset.map((item) => knowledgeCheckCardMarkup(item, { trackProgress })).join("")}
    </div>
    ${
      previewNote
        ? `<p class="knowledge-preview-note">${escapeHtml(previewNote)}</p>`
        : ""
    }
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
          <span class="chip">${chapter.knowledgeChecks.length} knowledge checks</span>
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
        <h4 class="concept-step__section-title">Knowledge Check Preview</h4>
        ${knowledgeCheckGridMarkup(chapter.knowledgeChecks, {
          limit: 2,
          intro: "Use these as quick self-tests before you move on to the next concept block.",
          previewNote: `Open the ${chapterLabel(chapter.number)} guide for all ${chapter.knowledgeChecks.length} prompts.`,
        })}
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


function renderDashboard() {
  const first = state.data.assignments[0];
  const progress = progressSnapshot();
  const focus = focusRecommendations();
  elements.topbarTitle.textContent = "Course Dashboard";
  elements.content.innerHTML = `
    <article class="hero-card">
      <div class="hero-grid">
        <div class="section-block">
          <p class="eyebrow">Built From Your Folder</p>
          <h3>${escapeHtml(state.data.courseTitle)}</h3>
          <p>
            This app mirrors the real PY208 folder layout, keeps every screenshot in order,
            and now adds a full exam-prep system with guided concept order, formula recall,
            chapter mastery tracking, mixed drills, mock exams, and the embedded equation sheet.
          </p>
          <div class="chip-row">
            <span class="chip">Exact folder tree</span>
            <span class="chip">Searchable screenshots</span>
            <span class="chip">Formula deck</span>
            <span class="chip">Mock exams</span>
          </div>
          <div class="assignment-links">
            ${buttonCard("Ultimate Exam Prep", "Use the study system, flashcards, drills, and mocks in one place.", `data-route="exam"`)}
            ${buttonCard("Concepts In Order", "Study the whole folder as one guided sequence.", `data-route="concepts"`)}
            ${buttonCard(first.name, "Start with the first captured homework.", `data-route="assignment" data-slug="${escapeHtml(first.slug)}"`)}
          </div>
        </div>
        <div class="overview-card focus-card">
          <p class="eyebrow">Current Readiness</p>
          <div class="readiness-pill">${progress.readiness}%</div>
          <p>
            ${progress.readyChapters} of ${state.data.chapters.length} chapters are marked ready. Keep pushing weak units into the
            reviewing or ready column until the course stops feeling fragmented.
          </p>
          ${
            focus.length
              ? `
                <div class="priority-list">
                  ${focus
                    .map(
                      (chapter) => `
                        <button class="priority-pill" type="button" data-route="chapter" data-key="${escapeHtml(chapter.key)}">
                          <strong>${escapeHtml(chapterLabel(chapter.number))}</strong>
                          <span>${escapeHtml(chapter.title)}</span>
                        </button>
                      `,
                    )
                    .join("")}
                </div>
              `
              : `<p class="muted-line">Everything is marked ready. Use the mock exams and drills to keep the edge sharp.</p>`
          }
        </div>
      </div>
      ${statMarkup(state.data.stats)}
    </article>

    <section class="content">
      <h3 class="section-title">Exam Prep Snapshot</h3>
      <div class="stats-grid">
        ${progressMetricMarkup(`${progress.readyChapters}/${state.data.chapters.length}`, "Ready Chapters", "How many full units already feel exam-ready.", "progress-metric--teal")}
        ${progressMetricMarkup(`${progress.solidKnowledge}/${state.data.stats.knowledgeCheckCount}`, "Locked Checks", "Knowledge checks you have already rated as solid.")}
        ${progressMetricMarkup(`${progress.solidFormulas}/${state.data.stats.formulaCount}`, "Solid Formulas", "Formula cards you can now recall with confidence.")}
        ${progressMetricMarkup(`${progress.solidFlashcards}/${state.data.stats.flashcardCount}`, "Solid Flashcards", "Concept and trap cards that feel stable.")}
        ${progressMetricMarkup(`${progress.completedDrillPacks}/${state.data.examPrep.drillPacks.length}`, "Drill Packs Done", "Mixed review sets completed under pressure.")}
        ${progressMetricMarkup(`${progress.mockPercent}%`, "Mock Score", "Average from every scored mock-exam prompt so far.")}
      </div>
    </section>

    <section class="content">
      <h3 class="section-title">Chapter Roadmap</h3>
      <div class="chapter-grid">
        ${state.data.chapters
          .map((chapter) => {
            const status = state.progress.chapterStatus[chapter.key] || "todo";
            return `
              <article class="chapter-card">
                <p class="eyebrow">${escapeHtml(chapterLabel(chapter.number))}</p>
                <h3>${escapeHtml(chapter.title)}</h3>
                <p>${escapeHtml(chapter.summary)}</p>
                <div class="chip-row">
                  <span class="chip">${chapter.assignmentCount} assignments</span>
                  <span class="chip">${chapter.questionCount} questions</span>
                  <span class="chip">${chapter.knowledgeChecks.length} knowledge checks</span>
                  <span class="chip ${status === "ready" ? "chip--teal" : ""}">${escapeHtml(chapterStatusLabel(status))}</span>
                </div>
                ${buttonCard(`Open ${chapterLabel(chapter.number)}`, "See the guide, formulas, pitfalls, and assignments.", `data-route="chapter" data-key="${escapeHtml(chapter.key)}"`)}
              </article>
            `;
          })
          .join("")}
      </div>
    </section>
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
  const chapterStatus = state.progress.chapterStatus[chapter.key] || "todo";
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
            <span class="chip">${chapter.knowledgeChecks.length} knowledge checks</span>
            <span class="chip ${chapterStatus === "ready" ? "chip--teal" : ""}">${escapeHtml(chapterStatusLabel(chapterStatus))}</span>
          </div>
          ${pathMarkup(["PY208", `${chapterLabel(chapter.number)} ...`])}
          <div class="progress-actions">
            <button
              class="status-button ${chapterStatus === "todo" ? "is-active" : ""}"
              type="button"
              data-progress-action="set-chapter-status"
              data-key="${escapeHtml(chapter.key)}"
              data-status="todo"
            >
              Need Work
            </button>
            <button
              class="status-button ${chapterStatus === "reviewing" ? "is-active" : ""}"
              type="button"
              data-progress-action="set-chapter-status"
              data-key="${escapeHtml(chapter.key)}"
              data-status="reviewing"
            >
              Reviewing
            </button>
            <button
              class="status-button status-button--positive ${chapterStatus === "ready" ? "is-active" : ""}"
              type="button"
              data-progress-action="set-chapter-status"
              data-key="${escapeHtml(chapter.key)}"
              data-status="ready"
            >
              Ready
            </button>
          </div>
        </section>
        <section class="overview-card">
          <p class="eyebrow">Concept Diagram</p>
          ${diagramMarkup(chapter.diagramType)}
          <p>Use this as a quick mental model before drilling into the screenshots.</p>
          ${buttonCard("Open Exam Prep Hub", "Jump into flashcards, drill packs, mocks, and the equation sheet.", `data-route="exam"`)}
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
        <h3 class="section-title">Knowledge Check</h3>
        ${knowledgeCheckGridMarkup(chapter.knowledgeChecks, {
          intro: `Work through all ${chapter.knowledgeChecks.length} prompts without opening the answer guides first. Then reveal the rubrics and compare your reasoning.`,
          trackProgress: true,
        })}
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
          ${buttonCard("Open Chapter Guide", "Jump back to the chapter roadmap, formulas, and chapter knowledge checks.", `data-route="chapter" data-key="${escapeHtml(chapter.key)}"`)}
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


function planPhaseMarkup(phase) {
  return `
    <article class="phase-card">
      <p class="eyebrow">${escapeHtml(phase.title)}</p>
      <h4>${escapeHtml(phase.subtitle)}</h4>
      <p>${escapeHtml(phase.description)}</p>
      <div class="checklist-grid">
        ${phase.tasks
          .map((task) => {
            const checked = Boolean(state.progress.planTasks[task.id]);
            return `
              <label class="check-item ${checked ? "is-done" : ""}">
                <input
                  type="checkbox"
                  data-progress-action="toggle-plan-task"
                  data-task-id="${escapeHtml(task.id)}"
                  ${checked ? "checked" : ""}
                >
                <span>${escapeHtml(task.label)}</span>
              </label>
            `;
          })
          .join("")}
      </div>
    </article>
  `;
}


function chapterMasteryMarkup(item) {
  const status = state.progress.chapterStatus[item.key] || "todo";
  return `
    <article class="chapter-mastery-card">
      <div class="prep-card__header">
        <div>
          <p class="eyebrow">${escapeHtml(chapterLabel(item.number))}</p>
          <h4>${escapeHtml(item.title)}</h4>
        </div>
        <span class="chip ${status === "ready" ? "chip--teal" : ""}">${escapeHtml(chapterStatusLabel(status))}</span>
      </div>
      <p>${escapeHtml(item.mission)}</p>
      <ul class="bullet-list">
        ${item.mustKnow.map((point) => `<li>${escapeHtml(point)}</li>`).join("")}
      </ul>
      <p class="knowledge-card__pitfall"><strong>Top trap:</strong> ${escapeHtml(item.trap)}</p>
      <p class="muted-line">
        Assignments to revisit: ${escapeHtml(item.assignmentNames.join(", ") || `Open the ${chapterLabel(item.number)} guide`)}.
      </p>
      <div class="progress-actions">
        <button
          class="status-button ${status === "todo" ? "is-active" : ""}"
          type="button"
          data-progress-action="set-chapter-status"
          data-key="${escapeHtml(item.key)}"
          data-status="todo"
        >
          Need Work
        </button>
        <button
          class="status-button ${status === "reviewing" ? "is-active" : ""}"
          type="button"
          data-progress-action="set-chapter-status"
          data-key="${escapeHtml(item.key)}"
          data-status="reviewing"
        >
          Reviewing
        </button>
        <button
          class="status-button status-button--positive ${status === "ready" ? "is-active" : ""}"
          type="button"
          data-progress-action="set-chapter-status"
          data-key="${escapeHtml(item.key)}"
          data-status="ready"
        >
          Ready
        </button>
      </div>
      ${buttonCard("Open Chapter Guide", "Use the chapter page for formulas, linked assignments, and tracked knowledge checks.", `data-route="chapter" data-key="${escapeHtml(item.key)}"`)}
    </article>
  `;
}


function formulaRecallMarkup(item) {
  const status = state.progress.formulaStatus[item.id];
  return `
    <article class="prep-card formula-recall-card">
      <div class="prep-card__header">
        <div>
          <p class="eyebrow">${escapeHtml(chapterLabel(item.chapterNumber))}</p>
          <h4>${escapeHtml(item.label)}</h4>
        </div>
        <span class="chip ${status === "solid" ? "chip--teal" : ""}">${escapeHtml(simpleStatusLabel(status))}</span>
      </div>
      ${formulaDisplayMarkup(item)}
      <p class="prep-card__prompt">${escapeHtml(item.prompt)}</p>
      <p class="muted-line"><strong>Use it when:</strong> ${escapeHtml(item.trigger)}</p>
      <p class="muted-line"><strong>Watch for:</strong> ${escapeHtml(item.pitfall)}</p>
      <div class="progress-actions">
        <button
          class="status-button ${status === "needs-work" ? "is-active" : ""}"
          type="button"
          data-progress-action="set-formula-status"
          data-item-id="${escapeHtml(item.id)}"
          data-status="needs-work"
        >
          Needs Work
        </button>
        <button
          class="status-button status-button--positive ${status === "solid" ? "is-active" : ""}"
          type="button"
          data-progress-action="set-formula-status"
          data-item-id="${escapeHtml(item.id)}"
          data-status="solid"
        >
          Locked In
        </button>
      </div>
      ${buttonCard(`Open ${chapterLabel(item.chapterNumber)}`, "Return to the chapter guide for the surrounding concept story.", `data-route="chapter" data-key="${escapeHtml(item.chapterKey)}"`)}
    </article>
  `;
}


function flashcardMarkup(card) {
  const status = state.progress.flashcardStatus[card.id];
  return `
    <details class="knowledge-card flashcard-card">
      <summary>
        <div class="knowledge-card__meta">
          <span class="knowledge-card__label">${escapeHtml(card.label)}</span>
          <div class="chip-row">
            <span class="chip chip--teal">${escapeHtml(card.type)}</span>
            <span class="chip">${escapeHtml(card.difficulty)}</span>
            <span class="chip ${status === "solid" ? "chip--teal" : ""}">${escapeHtml(simpleStatusLabel(status))}</span>
          </div>
        </div>
        <p class="knowledge-card__prompt">${escapeHtml(card.front)}</p>
        <p class="knowledge-card__hint">Answer aloud before opening the card.</p>
      </summary>
      <div class="knowledge-card__body">
        <h4>${escapeHtml(card.backTitle)}</h4>
        <ul class="bullet-list">
          ${card.backBullets.map((point) => `<li>${escapeHtml(point)}</li>`).join("")}
        </ul>
        <div class="progress-actions">
          <button
            class="status-button ${status === "needs-work" ? "is-active" : ""}"
            type="button"
            data-progress-action="set-flashcard-status"
            data-item-id="${escapeHtml(card.id)}"
            data-status="needs-work"
          >
            Needs Work
          </button>
          <button
            class="status-button status-button--positive ${status === "solid" ? "is-active" : ""}"
            type="button"
            data-progress-action="set-flashcard-status"
            data-item-id="${escapeHtml(card.id)}"
            data-status="solid"
          >
            Locked In
          </button>
        </div>
        ${buttonCard(`Open ${chapterLabel(card.chapterNumber)}`, "Jump back to the chapter guide tied to this card.", `data-route="chapter" data-key="${escapeHtml(card.chapterKey)}"`)}
      </div>
    </details>
  `;
}


function drillPackMarkup(pack) {
  const completed = Boolean(state.progress.drillStatus[pack.id]);
  return `
    <article class="drill-pack">
      <div class="prep-card__header">
        <div>
          <p class="eyebrow">Mixed Drill Pack</p>
          <h4>${escapeHtml(pack.title)}</h4>
        </div>
        <div class="chip-row">
          <span class="chip">${escapeHtml(pack.timing)}</span>
          <span class="chip">${pack.items.length} prompts</span>
          <span class="chip ${completed ? "chip--teal" : ""}">${completed ? "Completed" : "Not done"}</span>
        </div>
      </div>
      <p>${escapeHtml(pack.description)}</p>
      <div class="progress-actions">
        <button
          class="status-button ${completed ? "is-active status-button--positive" : ""}"
          type="button"
          data-progress-action="toggle-drill-status"
          data-pack-id="${escapeHtml(pack.id)}"
        >
          ${completed ? "Mark As Not Done" : "Mark Pack Complete"}
        </button>
      </div>
      <div class="knowledge-grid">
        ${pack.items
          .map(
            (item) => `
              <details class="knowledge-card">
                <summary>
                  <div class="knowledge-card__meta">
                    <span class="knowledge-card__label">${escapeHtml(item.label)}</span>
                    <div class="chip-row">
                      <span class="chip chip--teal">${escapeHtml(item.type)}</span>
                      <span class="chip">${escapeHtml(item.difficulty)}</span>
                    </div>
                  </div>
                  <p class="knowledge-card__prompt">${escapeHtml(item.prompt)}</p>
                  <p class="knowledge-card__hint">Treat this like a closed-book exam prompt before you open the rubric.</p>
                </summary>
                <div class="knowledge-card__body">
                  <h4>Strong answer should include</h4>
                  <ul class="bullet-list">
                    ${item.checkpoints.map((point) => `<li>${escapeHtml(point)}</li>`).join("")}
                  </ul>
                  <p class="knowledge-card__pitfall"><strong>Watch for:</strong> ${escapeHtml(item.pitfall)}</p>
                  ${buttonCard(`Open ${chapterLabel(item.chapterNumber)}`, "Review the full chapter guide behind this drill prompt.", `data-route="chapter" data-key="${escapeHtml(item.chapterKey)}"`)}
                </div>
              </details>
            `,
          )
          .join("")}
      </div>
    </article>
  `;
}


function examScoreSummary(exam) {
  const items = exam.sections.flatMap((section) => section.items);
  const scored = items.filter((item) => state.progress.mockScores[item.id] !== undefined);
  const points = scored.reduce((total, item) => total + Number(state.progress.mockScores[item.id] || 0), 0);
  const percent = items.length ? Math.round((points / (items.length * 2)) * 100) : 0;

  return {
    totalQuestions: items.length,
    scoredQuestions: scored.length,
    points,
    percent,
  };
}


function mockItemMarkup(item) {
  const score = state.progress.mockScores[item.id];
  return `
    <details class="knowledge-card mock-question-card">
      <summary>
        <div class="knowledge-card__meta">
          <span class="knowledge-card__label">${escapeHtml(item.label)}</span>
          <div class="chip-row">
            <span class="chip chip--teal">${escapeHtml(item.type)}</span>
            <span class="chip">${escapeHtml(item.difficulty)}</span>
            <span class="chip ${score === 2 ? "chip--teal" : ""}">${score === undefined ? "Unscored" : `Score ${score}/2`}</span>
          </div>
        </div>
        <p class="knowledge-card__prompt">${escapeHtml(item.prompt)}</p>
        <p class="knowledge-card__hint">Work it first under exam conditions, then score yourself honestly.</p>
      </summary>
      <div class="knowledge-card__body">
        <h4>Strong answer should include</h4>
        <ul class="bullet-list">
          ${item.checkpoints.map((point) => `<li>${escapeHtml(point)}</li>`).join("")}
        </ul>
        <p class="knowledge-card__pitfall"><strong>Watch for:</strong> ${escapeHtml(item.pitfall)}</p>
        <div class="score-actions">
          <span class="muted-line">Self-score this response:</span>
          <div class="progress-actions">
            ${[0, 1, 2]
              .map(
                (value) => `
                  <button
                    class="status-button ${score === value ? "is-active" : ""}"
                    type="button"
                    data-progress-action="set-mock-score"
                    data-item-id="${escapeHtml(item.id)}"
                    data-score="${value}"
                  >
                    ${value}/2
                  </button>
                `,
              )
              .join("")}
          </div>
        </div>
        ${buttonCard(`Open ${chapterLabel(item.chapterNumber)}`, "Review the chapter guide if this mock question exposed a weak spot.", `data-route="chapter" data-key="${escapeHtml(item.chapterKey)}"`)}
      </div>
    </details>
  `;
}


function mockExamMarkup(exam) {
  const summary = examScoreSummary(exam);

  return `
    <article class="mock-exam">
      <div class="prep-card__header">
        <div>
          <p class="eyebrow">Timed Practice</p>
          <h4>${escapeHtml(exam.title)}</h4>
        </div>
        <div class="chip-row">
          <span class="chip">${escapeHtml(exam.timing)}</span>
          <span class="chip">${summary.totalQuestions} questions</span>
          <span class="chip ${summary.percent >= 80 ? "chip--teal" : ""}">${summary.percent}% scored</span>
        </div>
      </div>
      <p>${escapeHtml(exam.summary)}</p>
      <p class="muted-line">${escapeHtml(exam.scoringGuide)}</p>
      <div class="stats-grid mock-score-grid">
        ${progressMetricMarkup(`${summary.scoredQuestions}/${summary.totalQuestions}`, "Questions Scored", "How much of this mock you have reviewed so far.")}
        ${progressMetricMarkup(`${summary.points}/${summary.totalQuestions * 2}`, "Points Earned", "Self-scored points recorded for this mock.")}
        ${progressMetricMarkup(`${summary.percent}%`, "Current Percentage", "A rough signal of how stable your answers are under pressure.", summary.percent >= 80 ? "progress-metric--teal" : "")}
      </div>
      <div class="mock-sections">
        ${exam.sections
          .map(
            (section) => `
              <section class="mock-section">
                <div class="mock-section__header">
                  <div>
                    <p class="eyebrow">${escapeHtml(section.title)}</p>
                    <h4>${escapeHtml(section.description)}</h4>
                  </div>
                  <span class="chip">${section.items.length} prompts</span>
                </div>
                <div class="knowledge-grid">
                  ${section.items.map(mockItemMarkup).join("")}
                </div>
              </section>
            `,
          )
          .join("")}
      </div>
    </article>
  `;
}


function buildSearchResults(query) {
  const lowered = query.trim().toLowerCase();
  const results = [];

  const pushResult = (blobParts, result) => {
    const blob = blobParts.join(" ").toLowerCase();
    if (blob.includes(lowered)) {
      results.push(result);
    }
  };

  for (const chapter of state.data.chapters) {
    pushResult(
      [
        chapter.title,
        chapter.summary,
        ...chapter.learningObjectives,
        ...chapter.pitfalls,
        ...chapter.formulaBoard.map((formula) => `${formula.label} ${formula.equation}`),
        ...chapter.knowledgeChecks.map((item) => item.prompt),
      ],
      {
        eyebrow: chapterLabel(chapter.number),
        title: `${chapter.title} Guide`,
        body: chapter.summary,
        tags: ["chapter guide", `${chapter.knowledgeChecks.length} checks`],
        routeAttrs: `data-route="chapter" data-key="${escapeHtml(chapter.key)}"`,
      },
    );
  }

  for (const assignment of state.data.assignments) {
    for (const question of assignment.questions) {
      pushResult(
        [
          assignment.name,
          assignment.focus,
          ...assignment.tags,
          question.excerpt,
          question.transcript,
        ],
        {
          eyebrow: chapterLabel(assignment.chapterNumber),
          title: `${assignment.name} - ${question.label}`,
          body: question.excerpt,
          tags: assignment.tags,
          routeAttrs: `data-route="question" data-slug="${escapeHtml(assignment.slug)}" data-index="${question.index}"`,
        },
      );
    }
  }

  for (const formula of state.data.examPrep.formulaDeck) {
    pushResult(
      [formula.chapterTitle, formula.label, formula.equation, formula.prompt, formula.trigger, formula.pitfall],
      {
        eyebrow: `${chapterLabel(formula.chapterNumber)} Formula`,
        title: formula.label,
        body: formula.trigger,
        tags: ["formula deck", formula.chapterTitle],
        routeAttrs: `data-route="exam" data-section="formulas"`,
      },
    );
  }

  for (const flashcard of state.data.examPrep.flashcards) {
    pushResult(
      [flashcard.chapterTitle, flashcard.front, flashcard.backTitle, ...flashcard.backBullets],
      {
        eyebrow: `${chapterLabel(flashcard.chapterNumber)} Flashcard`,
        title: flashcard.label,
        body: flashcard.front,
        tags: ["flashcard", flashcard.type],
        routeAttrs: `data-route="exam" data-section="flashcards"`,
      },
    );
  }

  for (const pack of state.data.examPrep.drillPacks) {
    pushResult(
      [pack.title, pack.description, ...pack.items.flatMap((item) => [item.prompt, ...item.checkpoints])],
      {
        eyebrow: "Drill Pack",
        title: pack.title,
        body: pack.description,
        tags: [pack.timing, `${pack.items.length} prompts`],
        routeAttrs: `data-route="exam" data-section="drills"`,
      },
    );
  }

  for (const exam of state.data.examPrep.mockExams) {
    pushResult(
      [exam.title, exam.summary, ...exam.sections.flatMap((section) => [section.title, section.description, ...section.items.map((item) => item.prompt)])],
      {
        eyebrow: "Mock Exam",
        title: exam.title,
        body: exam.summary,
        tags: [exam.timing, "self-scored"],
        routeAttrs: `data-route="exam" data-section="mocks"`,
      },
    );
  }

  pushResult(
    [
      state.data.examPrep.equationSheet.title,
      state.data.examPrep.equationSheet.note,
      "equation sheet formula reference pdf",
    ],
    {
      eyebrow: "Exam Prep",
      title: state.data.examPrep.equationSheet.title,
      body: state.data.examPrep.equationSheet.note,
      tags: ["equation sheet", "reference"],
      routeAttrs: `data-route="exam" data-section="equation"`,
    },
  );

  return results;
}


function renderSearch(query) {
  const results = buildSearchResults(query);
  elements.topbarTitle.textContent = `Search: ${query}`;
  elements.content.innerHTML = `
    <article class="hero-card">
      <p class="eyebrow">Search Results</p>
      <h3>${results.length} matches for "${escapeHtml(query)}"</h3>
      <p>
        Results are matched against chapter guides, formulas, flashcards, drill packs, mock exams,
        assignment descriptions, and OCR-extracted screenshot text.
      </p>
    </article>
    ${
      results.length
        ? `
          <div class="search-grid">
            ${results
              .map(
                (result) => `
                  <article class="search-card">
                    <p class="eyebrow">${escapeHtml(result.eyebrow)}</p>
                    <h4>${escapeHtml(result.title)}</h4>
                    <p>${escapeHtml(result.body)}</p>
                    <div class="tag-row">
                      ${result.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}
                    </div>
                    ${buttonCard(
                      "Open Result",
                      "Jump straight to the matching guide, question, or exam-prep section.",
                      result.routeAttrs,
                    )}
                  </article>
                `,
              )
              .join("")}
          </div>
        `
        : `<div class="empty-state">No matches yet. Try a chapter number, concept word, formula name, or phrase from a screenshot.</div>`
    }
  `;
}


function renderExamPrep() {
  const prep = state.data.examPrep;
  const progress = progressSnapshot();
  const focus = focusRecommendations();

  elements.topbarTitle.textContent = "Ultimate Exam Prep";
  elements.content.innerHTML = `
    <article class="hero-card prep-hero">
      <div class="hero-grid">
        <div class="section-block">
          <p class="eyebrow">Exam Command Center</p>
          <h3>One place to learn, recall, test, and close every weak spot before the exam.</h3>
          <p>
            Work the study system in order: map the whole course, repair recall with chapter checks and flashcards,
            then pressure-test yourself with mixed drills, mock exams, and the built-in equation sheet.
          </p>
          <div class="chip-row">
            <span class="chip">${state.data.stats.knowledgeCheckCount} tracked knowledge checks</span>
            <span class="chip">${state.data.stats.formulaCount} formula cards</span>
            <span class="chip">${prep.flashcards.length} flashcards</span>
            <span class="chip">${prep.mockExams.length} mock exams</span>
          </div>
          <div class="assignment-links">
            ${buttonCard("Study System", "Follow the three-pass prep structure from first pass to final review.", `data-route="exam" data-section="plan"`)}
            ${buttonCard("Formula Deck", "Drill the equations and when to use them.", `data-route="exam" data-section="formulas"`)}
            ${buttonCard("Mock Exams", "Run cumulative, self-scored exam practice.", `data-route="exam" data-section="mocks"`)}
          </div>
        </div>
        <div class="overview-card focus-card">
          <p class="eyebrow">Readiness Meter</p>
          <div class="readiness-pill">${progress.readiness}%</div>
          <p>
            This score blends chapter status, locked-in knowledge checks, formula recall, flashcards,
            drill-pack completion, and mock-exam scoring.
          </p>
          ${
            focus.length
              ? `
                <div class="priority-list">
                  ${focus
                    .map(
                      (chapter) => `
                        <button class="priority-pill" type="button" data-route="chapter" data-key="${escapeHtml(chapter.key)}">
                          <strong>${escapeHtml(chapterLabel(chapter.number))}</strong>
                          <span>${escapeHtml(chapter.title)}</span>
                        </button>
                      `,
                    )
                    .join("")}
                </div>
              `
              : `<p class="muted-line">Every chapter is marked ready. Keep sharpening with the mocks and synthesis drills.</p>`
          }
        </div>
      </div>

      <div class="stats-grid">
        ${progressMetricMarkup(`${progress.readyChapters}/${state.data.chapters.length}`, "Ready Chapters", "How many full units you trust under exam conditions.", "progress-metric--teal")}
        ${progressMetricMarkup(`${progress.solidKnowledge}/${state.data.stats.knowledgeCheckCount}`, "Locked Checks", "Chapter prompts already rated as solid.")}
        ${progressMetricMarkup(`${progress.solidFormulas}/${state.data.stats.formulaCount}`, "Solid Formulas", "Formula-deck cards you can write from memory.")}
        ${progressMetricMarkup(`${progress.solidFlashcards}/${prep.flashcards.length}`, "Solid Flashcards", "Recall cards that no longer feel shaky.")}
        ${progressMetricMarkup(`${progress.completedDrillPacks}/${prep.drillPacks.length}`, "Drills Done", "Cumulative mixed packs completed.")}
        ${progressMetricMarkup(`${progress.mockPercent}%`, "Mock Average", "Current percentage from self-scored mock responses.")}
      </div>

      <div class="prep-jump-grid">
        ${buttonCard("Chapter Readiness", "Rate every chapter and reopen the weak ones first.", `data-route="exam" data-section="readiness"`)}
        ${buttonCard("Equation Sheet", "Keep the real formula sheet inside the app while you practice.", `data-route="exam" data-section="equation"`)}
        ${buttonCard("Flashcards", "Train compact recall on concepts, formulas, and traps.", `data-route="exam" data-section="flashcards"`)}
        ${buttonCard("Drill Packs", "Mix chapters so your recall survives outside chapter order.", `data-route="exam" data-section="drills"`)}
        ${buttonCard("Exam Day", "Use the final checklist and rescue plan before the test.", `data-route="exam" data-section="exam-day"`)}
      </div>
    </article>

    <section class="content prep-section" id="prep-section-plan">
      <h3 class="section-title">Study System</h3>
      <div class="phase-grid">
        ${prep.studySystem.map(planPhaseMarkup).join("")}
      </div>
    </section>

    <section class="content prep-section" id="prep-section-readiness">
      <h3 class="section-title">Chapter Readiness</h3>
      <div class="chapter-mastery-grid">
        ${prep.chapterTargets.map(chapterMasteryMarkup).join("")}
      </div>
    </section>

    <section class="content prep-section" id="prep-section-equation">
      <h3 class="section-title">Equation Sheet</h3>
      <article class="equation-sheet">
        <div class="section-block">
          <p class="eyebrow">Built-In Reference</p>
          <h4>${escapeHtml(prep.equationSheet.title)}</h4>
          <p>${escapeHtml(prep.equationSheet.note)}</p>
          <div class="chip-row">
            <span class="chip">Inside the app</span>
            <span class="chip">Good for timed review</span>
            <span class="chip">Matches your study workflow</span>
          </div>
          ${buttonCard("Open Formula Deck", "Pair the sheet with active recall instead of passive rereading.", `data-route="exam" data-section="formulas"`)}
        </div>
        <div class="pdf-frame">
          <iframe src="${escapeHtml(prep.equationSheet.assetUrl)}#view=FitH" title="${escapeHtml(prep.equationSheet.title)}"></iframe>
        </div>
      </article>
    </section>

    <section class="content prep-section" id="prep-section-formulas">
      <h3 class="section-title">Formula Deck</h3>
      <div class="formula-recall-grid">
        ${prep.formulaDeck.map(formulaRecallMarkup).join("")}
      </div>
    </section>

    <section class="content prep-section" id="prep-section-flashcards">
      <h3 class="section-title">Flashcards</h3>
      <div class="knowledge-grid">
        ${prep.flashcards.map(flashcardMarkup).join("")}
      </div>
    </section>

    <section class="content prep-section" id="prep-section-drills">
      <h3 class="section-title">Drill Packs</h3>
      <div class="drill-pack-grid">
        ${prep.drillPacks.map(drillPackMarkup).join("")}
      </div>
    </section>

    <section class="content prep-section" id="prep-section-mocks">
      <h3 class="section-title">Mock Exams</h3>
      <div class="mock-exam-grid">
        ${prep.mockExams.map(mockExamMarkup).join("")}
      </div>
    </section>

    <section class="content prep-section" id="prep-section-exam-day">
      <h3 class="section-title">Exam Day</h3>
      <div class="list-grid">
        ${listMarkup("Final checklist", prep.examDay.checklist)}
        ${listMarkup("If you hit a wall", prep.examDay.rescuePlan)}
      </div>
    </section>
  `;

  maybeScrollToPrepSection(state.route.section);
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

  if (state.route.type === "exam") {
    renderExamPrep();
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
  elements.examButton.classList.toggle("is-active", !state.query.trim() && state.route.type === "exam");
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
  } else if (route === "exam") {
    state.route = { type: "exam", section: target.dataset.section || "" };
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


function handleProgressAction(target) {
  const action = target.dataset.progressAction;
  if (!action) {
    return;
  }

  if (action === "toggle-plan-task") {
    state.progress.planTasks[target.dataset.taskId] = target.checked;
  } else if (action === "set-chapter-status") {
    state.progress.chapterStatus[target.dataset.key] = target.dataset.status;
  } else if (action === "set-knowledge-status") {
    state.progress.knowledgeStatus[target.dataset.itemId] = target.dataset.status;
  } else if (action === "set-formula-status") {
    state.progress.formulaStatus[target.dataset.itemId] = target.dataset.status;
  } else if (action === "set-flashcard-status") {
    state.progress.flashcardStatus[target.dataset.itemId] = target.dataset.status;
  } else if (action === "toggle-drill-status") {
    const packId = target.dataset.packId;
    state.progress.drillStatus[packId] = !state.progress.drillStatus[packId];
  } else if (action === "set-mock-score") {
    state.progress.mockScores[target.dataset.itemId] = Number(target.dataset.score) || 0;
  }

  saveProgress();
  refresh();
}


async function loadData() {
  const response = await fetch(DATA_URL);
  if (!response.ok) {
    throw new Error(`Unable to load study data: ${response.status}`);
  }
  state.data = hydrateData(await response.json());
}


function bindEvents() {
  document.addEventListener("click", (event) => {
    const progressTarget = event.target.closest("[data-progress-action]");
    if (progressTarget && progressTarget.tagName !== "INPUT") {
      handleProgressAction(progressTarget);
      return;
    }

    const target = event.target.closest("[data-route]");
    if (target) {
      handleAction(target);
    }
  });

  document.addEventListener("change", (event) => {
    const progressTarget = event.target.closest("[data-progress-action]");
    if (progressTarget && progressTarget.tagName === "INPUT") {
      handleProgressAction(progressTarget);
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
  elements.examButton.addEventListener("click", () => handleAction({ dataset: { route: "exam" } }));
  elements.firstAssignmentButton.addEventListener("click", () => {
    const first = state.data?.assignments?.[0];
    if (first) {
      handleAction({ dataset: { route: "assignment", slug: first.slug } });
    }
  });
}


async function init() {
  try {
    state.progress = loadProgress();
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
