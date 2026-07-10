// "Ask Sam" — a small local knowledge-base assistant.
// Runs entirely client-side (keyword matching over a fixed knowledge base).
// It is not a hosted LLM — no data ever leaves the browser.
// Enhanced with fuzzy matching, stemming, and context awareness.

const SAM_KB = [
  {
    id: "greeting",
    keywords: ["hi", "hello", "hey", "yo", "sup", "salam", "assalamu alaikum", "greetings", "good morning", "good evening"],
    answer:
      "Hey, I'm Sam! Ask me about Soar, Sirat, or how to reach Samir — or tap one of the suggestions below.",
  },
  {
    id: "thanks",
    keywords: ["thanks", "thank you", "appreciate it", "appreciated", "thx", "ty"],
    answer: "Anytime! Anything else you want to know about Soar or Sirat?",
  },
  {
    id: "bye",
    keywords: ["bye", "goodbye", "see you", "later", "peace", "jazakallah"],
    answer: "Take care! Reach out anytime at samir.yasar.usa@gmail.com if you want to talk more.",
  },
  {
    id: "soar-overview",
    keywords: ["soar", "soar apps", "soar suite", "soar ecosystem", "what is soar", "tell me about soar"],
    answer:
      "Soar is a six-app AI and productivity ecosystem: Soar AI, Soar Work, Soar Business, Soar Life, Soar Connect, and Soar Studio. Ask about any of them by name.",
  },
  {
    id: "soar-ai",
    keywords: ["soar ai", "intelligence layer", "ai assistant", "ai agent"],
    answer:
      "Soar AI — \"the intelligence layer.\" A personal and business AI assistant ecosystem: personal + business AI agents, automation, document analysis, research and coding assistants, AI workflows, an AI marketplace, and connections to external AI models. Roughly ≈ ChatGPT + Copilot + AI agents.",
  },
  {
    id: "soar-work",
    keywords: ["soar work", "productivity platform", "work app", "workspace"],
    answer:
      "Soar Work — \"the productivity platform.\" A smart workspace: tasks, projects, notes, calendar, documents, team collaboration, meetings, workflow automation, AI-powered productivity. Roughly ≈ Notion + Asana + Microsoft 365.",
  },
  {
    id: "soar-business",
    keywords: ["soar business", "business operating system", "soar crm", "business app"],
    answer:
      "Soar Business — \"the business operating system.\" CRM, customer management, sales pipeline, marketing automation, inventory, analytics, finance tracking, employee management, and a business AI assistant. Roughly ≈ Salesforce + HubSpot + Shopify + QuickBooks.",
  },
  {
    id: "soar-life",
    keywords: ["soar life", "personal operating system", "life app", "personal dashboard"],
    answer:
      "Soar Life — \"the personal operating system.\" Personal dashboard, goals, habits, calendar, reminders, health routines, budget tracking, family organization, and a personal AI assistant. Roughly ≈ Apple ecosystem + Notion + Todoist.",
  },
  {
    id: "soar-connect",
    keywords: ["soar connect", "communication platform", "connect app", "messaging"],
    answer:
      "Soar Connect — \"the communication & community platform.\" Messaging, communities, groups, events, voice/video calls, professional networking, creator and business communities. Roughly ≈ Discord + Slack + LinkedIn.",
  },
  {
    id: "soar-studio",
    keywords: ["soar studio", "creation platform", "studio app", "design tool"],
    answer:
      "Soar Studio — \"the creation platform.\" AI design tools, image generation, video creation, a website builder, presentation builder, brand tools, marketing content, and a templates marketplace. Roughly ≈ Canva + Adobe + Figma + AI tools.",
  },
  {
    id: "sirat-overview",
    keywords: ["sirat", "sirat apps", "sirat suite", "sirat ecosystem", "what is sirat", "tell me about sirat"],
    answer:
      "Sirat (صراط, \"the path\") is a fifteen-app suite for Islamic learning and community life, grouped into three pillars: Foundation, Learning, and Community & Impact. Ask about a pillar or any app by name.",
  },
  {
    id: "sirat-pillars",
    keywords: ["pillars", "three pillars", "sirat pillars"],
    answer:
      "Sirat's three pillars — Foundation (Sirat One, Sirat AI, Sirat Cloud, Sirat Developers, Sirat Research), Learning (Sirat Quran, Sirat Education, Sirat Schools, Sirat Kids, Sirat Family), and Community & Impact (Sirat Mosques, Sirat Community, Sirat Finance, Sirat Studio, Sirat Foundation).",
  },
  {
    id: "sirat-one",
    keywords: ["sirat one", "islamic operating system", "sirat hub"],
    answer: "Sirat One — \"the Islamic Digital Operating System.\" The hub connecting every Sirat app in one place.",
  },
  {
    id: "sirat-ai",
    keywords: ["sirat ai", "islamic artificial intelligence", "islamic ai", "trusted ai"],
    answer: "Sirat AI — \"Trusted Islamic Artificial Intelligence.\" The AI layer behind the Sirat suite.",
  },
  {
    id: "sirat-quran",
    keywords: ["sirat quran", "quran app", "quran reader", "holy quran"],
    answer: "Sirat Quran — \"the complete Quran experience.\" A beautiful reader with Arabic text, translations, bookmarks, and recitation support.",
  },
  {
    id: "sirat-education",
    keywords: ["sirat education", "islamic education platform", "learning platform"],
    answer: "Sirat Education — a learning platform for students, teachers, and lifelong learning.",
  },
  {
    id: "sirat-schools",
    keywords: ["sirat schools", "classroom management", "school system"],
    answer: "Sirat Schools — a school and classroom management system.",
  },
  {
    id: "sirat-mosques",
    keywords: ["sirat mosques", "mosque management", "masjid", "masjid app"],
    answer: "Sirat Mosques — a mosque and community management platform, connecting people to their local masjid.",
  },
  {
    id: "sirat-family",
    keywords: ["sirat family", "family dashboard", "family app"],
    answer: "Sirat Family — a family dashboard with shared goals and child learning tools.",
  },
  {
    id: "sirat-kids",
    keywords: ["sirat kids", "kids learning", "islamic learning for children", "children app"],
    answer: "Sirat Kids — safe Islamic learning for children.",
  },
  {
    id: "sirat-community",
    keywords: ["sirat community", "study circles", "community app"],
    answer: "Sirat Community — groups, events, and study circles.",
  },
  {
    id: "sirat-finance",
    keywords: ["sirat finance", "zakat", "charity", "Islamic finance"],
    answer: "Sirat Finance — Zakat, charity, and Islamic financial tools.",
  },
  {
    id: "sirat-cloud",
    keywords: ["sirat cloud", "sirat infrastructure", "cloud platform"],
    answer: "Sirat Cloud — identity, sync, storage, and infrastructure for the whole suite.",
  },
  {
    id: "sirat-developers",
    keywords: ["sirat developers", "sirat api", "sirat sdk", "developer platform"],
    answer: "Sirat Developers — APIs, SDKs, and the developer platform for building on Sirat.",
  },
  {
    id: "sirat-research",
    keywords: ["sirat research", "arabic nlp", "research lab"],
    answer: "Sirat Research — Islamic AI, Arabic NLP, and knowledge research.",
  },
  {
    id: "sirat-studio",
    keywords: ["sirat studio", "content creation", "sirat publishing", "studio app"],
    answer: "Sirat Studio — content creation and publishing for scholars and educators.",
  },
  {
    id: "sirat-foundation",
    keywords: ["sirat foundation", "nonprofit", "sirat outreach", "foundation app"],
    answer: "Sirat Foundation — nonprofit initiatives, open knowledge, and global outreach.",
  },
  {
    id: "about-samir",
    keywords: ["who is samir", "samir yasar", "about you", "about samir", "who built this", "who made this", "founder"],
    answer:
      "Samir Yasar designs and ships software that removes friction — from AI assistants (Soar) to Islamic education and community tools (Sirat).",
  },
  {
    id: "focus",
    keywords: ["focus", "expertise", "skills", "what do you do", "what does he do", "capabilities"],
    answer:
      "Samir's focus areas: AI & Automation, Product & UX, Islamic Ed-Tech, and Community Tools.",
  },
  {
    id: "contact",
    keywords: ["contact", "email", "reach", "hire", "get in touch", "talk", "connect with"],
    answer:
      "Best way to reach Samir is by email: samir.yasar.usa@gmail.com — happy to talk Soar, Sirat, or anything else.",
  },
  {
    id: "roadmap",
    keywords: ["roadmap", "status", "progress", "shipped", "launched", "what's new", "updates"],
    answer:
      "Right now: Soar AI, Soar Work, and Soar Studio are actively being built, with Soar Business, Soar Life, and Soar Connect still at the idea stage. On the Sirat side, the Foundation and Learning pillars are building, Community & Impact is still an idea. See the Snapshot section on the home page for the full picture.",
  },
  {
    id: "snapshot",
    keywords: ["snapshot", "chart", "graph", "stats", "capability", "time split", "metrics"],
    answer:
      "The Snapshot section on the home page has a self-estimated focus split, a capability chart, and the live roadmap status for every product — worth a scroll.",
  },
  {
    id: "who-are-you",
    keywords: ["who are you", "are you ai", "are you real", "are you human", "chatgpt", "gpt", "what are you"],
    answer:
      "I'm Sam — a small local guide built into this site. I match your question against a short list of facts about Soar and Sirat, no external AI service involved.",
  },
];

const SAM_FALLBACK =
  "I don't have a good answer for that one — I'm a lightweight local guide, not a full AI. Try asking about Soar, Sirat, or how to get in touch, or email samir.yasar.usa@gmail.com directly.";

const SAM_GREETING =
  "Hey, I'm Sam — a quick local guide to Soar and Sirat. Ask me anything about either suite.";

// Simple stem map for fuzzy matching
const STEMS = {
  app: "app", apps: "app", application: "app", applications: "app",
  build: "build", building: "build", built: "build", builder: "build",
  create: "create", creation: "create", creator: "create",
  design: "design", designer: "design", designing: "design",
  develop: "develop", developer: "develop", developers: "develop", development: "develop",
  educate: "educate", education: "educate", educational: "educate",
  learn: "learn", learning: "learn", learner: "learn",
  manage: "manage", management: "manage", manager: "manage",
  mosque: "mosque", masjid: "mosque",
  productivity: "productivity", productive: "productivity",
  research: "research", researcher: "research",
  community: "community", communities: "community",
  family: "family", families: "family",
  finance: "finance", financial: "finance",
  child: "child", children: "child", kids: "child", kid: "child",
  school: "school", schools: "school",
  studio: "studio",
  cloud: "cloud",
  foundation: "foundation",
  quran: "quran", koran: "quran",
  ai: "ai", artificial: "ai", intelligence: "ai",
  islamic: "islamic", islam: "islamic", muslim: "islamic",
  connect: "connect", communication: "connect", messaging: "connect",
  life: "life", personal: "life",
  work: "work", workspace: "work", tasks: "work",
  business: "business", crm: "business", sales: "business",
  studio: "studio", design: "studio", creative: "studio",
};

function stem(word) {
  return STEMS[word] || word;
}

// Fuzzy match: checks if query words roughly match keywords
function fuzzyMatch(queryWords, keywords) {
  let score = 0;
  for (const qw of queryWords) {
    const stemmedQ = stem(qw);
    for (const kw of keywords) {
      const kwWords = kw.toLowerCase().split(/\s+/);
      for (const kwWord of kwWords) {
        const stemmedK = stem(kwWord);
        // Exact match
        if (qw === kwWord) { score += 2; continue; }
        // Stemmed match
        if (stemmedQ === stemmedK && stemmedQ !== qw) { score += 1.5; continue; }
        // Substring match
        if (kwWord.includes(qw) || qw.includes(kwWord)) { score += 1; continue; }
        // Levenshtein distance for short words (typo tolerance)
        if (qw.length >= 3 && kwWord.length >= 3) {
          const dist = levenshtein(qw, kwWord);
          if (dist <= 1) { score += 1; }
        }
      }
    }
  }
  return score;
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return dp[m][n];
}

function samScore(query, entry) {
  const q = ` ${query.toLowerCase().replace(/[^a-z0-9\s]/g, " ")} `;
  const queryWords = q.trim().split(/\s+/).filter(w => w.length >= 2);

  let score = 0;

  // Exact phrase matching (highest weight)
  entry.keywords.forEach((kw) => {
    if (q.includes(` ${kw.toLowerCase()} `)) score += kw.split(" ").length * 2;
  });

  // Fuzzy matching
  score += fuzzyMatch(queryWords, entry.keywords);

  return score;
}

let lastTopic = null;

function samAnswer(query) {
  let best = null;
  let bestScore = 0;

  SAM_KB.forEach((entry) => {
    const score = samScore(query, entry);
    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  });

  if (bestScore > 0 && best) {
    lastTopic = best.id;
    return best.answer;
  }

  // Context-aware fallback
  if (lastTopic && lastTopic.startsWith("soar")) {
    return "I'm not sure about that specific question. Try asking about a Soar app by name (AI, Work, Business, Life, Connect, or Studio), or ask about Sirat instead.";
  }
  if (lastTopic && lastTopic.startsWith("sirat")) {
    return "I'm not sure about that. Try asking about a Sirat app by name (Quran, Education, Schools, Mosques, etc.) or ask about Soar instead.";
  }

  return SAM_FALLBACK;
}

// Chat panel initialization
(function initSam() {
  const launcher = document.getElementById("samLauncher");
  const panel = document.getElementById("samPanel");
  const closeBtn = document.getElementById("samClose");
  const body = document.getElementById("samBody");
  const form = document.getElementById("samForm");
  const input = document.getElementById("samInput");
  const chipsWrap = document.getElementById("samChips");

  if (!launcher || !panel) return;

  let greeted = false;
  let previouslyFocused = null;

  function addMessage(text, from) {
    const msg = document.createElement("div");
    msg.className = `sam-msg sam-msg--${from}`;
    msg.textContent = text;
    body.appendChild(msg);
    body.scrollTop = body.scrollHeight;

    // Announce bot messages to screen readers
    if (from === "bot") {
      msg.setAttribute("role", "status");
    }

    return msg;
  }

  function addTyping() {
    const typing = document.createElement("div");
    typing.className = "sam-msg sam-msg--bot sam-msg--typing";
    typing.setAttribute("aria-label", "Sam is typing");
    typing.innerHTML = "<span></span><span></span><span></span>";
    body.appendChild(typing);
    body.scrollTop = body.scrollHeight;
    return typing;
  }

  function respond(query) {
    addMessage(query, "user");
    const typing = addTyping();
    const delay = 500 + Math.random() * 500;

    setTimeout(() => {
      typing.remove();
      addMessage(samAnswer(query), "bot");
    }, delay);
  }

  function openPanel() {
    previouslyFocused = document.activeElement;
    panel.classList.add("is-open");
    panel.setAttribute("aria-hidden", "false");
    if (!greeted) {
      greeted = true;
      addMessage(SAM_GREETING, "bot");
    }
    setTimeout(() => input.focus(), 150);
  }

  function closePanel() {
    panel.classList.remove("is-open");
    panel.setAttribute("aria-hidden", "true");
    if (previouslyFocused) {
      previouslyFocused.focus();
      previouslyFocused = null;
    }
  }

  // Focus trap within chat panel
  panel.addEventListener("keydown", (e) => {
    if (e.key !== "Tab") return;
    const focusable = panel.querySelectorAll(
      'button, input, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  launcher.addEventListener("click", () => {
    panel.classList.contains("is-open") ? closePanel() : openPanel();
  });

  closeBtn.addEventListener("click", closePanel);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && panel.classList.contains("is-open")) closePanel();
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const value = input.value.trim();
    if (!value) return;
    respond(value);
    input.value = "";
  });

  if (chipsWrap) {
    chipsWrap.querySelectorAll(".sam-chip").forEach((chip) => {
      chip.addEventListener("click", () => respond(chip.textContent));
    });
  }
})();
