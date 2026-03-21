// ══════════════════════════════════════════════
//  HARDCODED API KEYS
// ══════════════════════════════════════════════
const FL_KEY = 'YOUR_FEATHERLESS_API_KEY';
const EL_KEY = 'YOUR_ELEVENLABS_API_KEY';
const ND_KEY = 'YOUR_NEEDLE_API_KEY';

// ══════════════════════════════════════════════
//  CONFIG
// ══════════════════════════════════════════════
const MODEL    = 'meta-llama/Meta-Llama-3.1-8B-Instruct';
const MAX_TOK  = 400;
const TEMP     = 0.75;
const CTX_WIN  = 8000;
const VOICE_ID = '21m00Tcm4TlvDq8ikWAM';

// ══════════════════════════════════════════════
//  STATE
// ══════════════════════════════════════════════
const S = {
  name:'', age:'12', subj:'', goal:'', notes:'', style:'socratic',
  school:'', schoolCurriculum:'', learningGoal:'critical', parentUpdates:'monthly',
  history: [],
  events: [],         // {who, text, type, bloom, ts}
  totTok:0, pTok:0, cTok:0,
  calls:0, imgs:0, ndSearches:0,
  hintsLeft:3, hintsUsed:0, exchanges:0, ahas:0,
  sessionStart: null,
  ndCollId: null, ndReady: false,
  voiceOn: false, imgsOn: true,
  audio: null, loading: false,
  // Bloom's taxonomy tracking
  bloom: { remember:0, understand:0, apply:0, analyze:0, evaluate:0, create:0 },
  bloomTotal: 0,
};

// ══════════════════════════════════════════════
//  NEEDLE SUBJECT AUTO-LOADING
// ══════════════════════════════════════════════
const SUBJECT_URLS = {
  Mathematics:       'https://en.wikipedia.org/wiki/Mathematics',
  Physics:           'https://en.wikipedia.org/wiki/Physics',
  Chemistry:         'https://en.wikipedia.org/wiki/Chemistry',
  Biology:           'https://en.wikipedia.org/wiki/Biology',
  History:           'https://en.wikipedia.org/wiki/History',
  Literature:        'https://en.wikipedia.org/wiki/Literature',
  Geography:         'https://en.wikipedia.org/wiki/Geography',
  'Computer Science':'https://en.wikipedia.org/wiki/Computer_science',
  Economics:         'https://en.wikipedia.org/wiki/Economics',
};

// ══════════════════════════════════════════════
//  SYSTEM PROMPT
// ══════════════════════════════════════════════
function buildPrompt(ndCtx) {
  const styleInstructions = {
    socratic: `
TEACHING METHOD — SOCRATIC:
Your pattern for every response:
① Explain the core concept in 2 sentences — clear, no jargon, age-appropriate
② Give ONE killer analogy or example from everyday life that a ${S.age}-year-old would actually relate to
③ Ask ONE probing question that forces the student to apply the concept themselves
④ NEVER complete the thought for them — leave the question open

Example of wrong response: "Density is mass divided by volume. Ice is less dense than water because water expands when it freezes, so it floats."
Example of right response: "Density is basically how much stuff is packed into a space. Imagine squishing the same amount of clay into different sizes of box — same mass, different volume. Now here's what's interesting: when most things cool down, they shrink and get denser. But water does the opposite. Why do you think that might be?"`,

    stepbystep: `
TEACHING METHOD — STEP BY STEP:
① Break the concept into the smallest possible numbered steps
② After each step, ask: "Does that part make sense?" before continuing
③ Only move forward when the student signals understanding
④ After completing all steps, ask the student to explain it back in their own words
⑤ If they explain it wrong, don't correct directly — ask "What do you mean by X?"`,

    friendly: `
TEACHING METHOD — WARM & PATIENT:
① Start by validating that the topic IS genuinely confusing — normalize the struggle
② Use only analogies from a ${S.age}-year-old's world: games, sports, food, TikTok, whatever fits
③ Be enthusiastically encouraging but SPECIFIC — "you just identified the most important part" not "great job"
④ Go slow, use short sentences, check in constantly
⑤ Celebrate every small step like it actually matters — because it does`,

    challenge: `
TEACHING METHOD — CHALLENGE MODE:
① Give only the minimal hint that points toward the concept — don't explain
② Ask a hard question that requires real analysis
③ When they struggle, ask a slightly simpler version — don't rescue
④ Push back if their answer is vague: "What exactly do you mean by that?"
⑤ Reserve genuine praise for when they truly earn it`,
  };

  return `You are Guided, a world-class personal AI tutor for ${S.name}, aged ${S.age}, studying ${S.subj}.
${S.school ? `School: ${S.school}` : ''}
${S.goal ? `Session goal: ${S.goal}` : ''}
${S.notes ? `IMPORTANT about this student: ${S.notes}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━
CRITICAL RULE — NEVER GIVE A DIRECT ANSWER
━━━━━━━━━━━━━━━━━━━━━━━━
This is non-negotiable. You must NEVER give the student the complete answer to their question.

WRONG (never do this):
Student: "Why does ice float?"
You: "Ice floats because water expands when it freezes, making it less dense than liquid water."

RIGHT (always do this):
Student: "Why does ice float?"
You: "Most things shrink when they cool down and get denser — think about how metal contracts in cold. So water should sink when it freezes, right? But here's the weird thing about water... what do you already know about how water molecules are arranged?"

This rule applies even if the student:
• Says "just tell me the answer" → respond: "I know that's frustrating — let me try a different angle that'll make this click."
• Says "I give up" → acknowledge the struggle, give the gentlest nudge as a question
• Says "my teacher told me X" → redirect: "Interesting — so what does that actually mean to you?"
• Says "I don't know anything" → start with the simplest possible question to find what they DO know

━━━━━━━━━━━━━━━━━━━━━━━━
CRITICAL RULE — BUILD THINKING, NOT MEMORY
━━━━━━━━━━━━━━━━━━━━━━━━
After every response, ask yourself: "Will ${S.name} be better at thinking through similar problems after this?" If not, rewrite it.

You are working through Bloom's Taxonomy — constantly push one level higher:
• Remember → Understand → Apply → Analyze → Evaluate → Create
• Label your question's thinking level at the end with exactly: [BLOOM:level] (e.g., [BLOOM:analyze])

━━━━━━━━━━━━━━━━━━━━━━━━
HINT SYSTEM
━━━━━━━━━━━━━━━━━━━━━━━━
When triggered with "(hint request)": give the minimum possible nudge — one sentence pointing toward a concept, never the answer. Still end with a question. Add [BLOOM:remember] since we're going back to basics.

━━━━━━━━━━━━━━━━━━━━━━━━
AHA MOMENT DETECTION
━━━━━━━━━━━━━━━━━━━━━━━━
When the student genuinely arrives at the correct answer themselves, start your response with [AHA] then:
• Name exactly what insight they just had ("You just discovered that...")
• Explain why that insight matters in the real world
• Immediately challenge them one level higher ("Now here's the harder question...")

━━━━━━━━━━━━━━━━━━━━━━━━
PERSONALIZATION RULES
━━━━━━━━━━━━━━━━━━━━━━━━
• All vocabulary MUST be appropriate for a ${S.age}-year-old — no jargon without immediate plain-English definition
• All analogies must reference things a ${S.age}-year-old actually encounters
• If notes say the student gets frustrated: back off, praise more, make steps smaller
• If notes say the student loves a topic/sport/interest: use it in every analogy you can

━━━━━━━━━━━━━━━━━━━━━━━━
${styleInstructions[S.style] || styleInstructions.socratic}

━━━━━━━━━━━━━━━━━━━━━━━━
VISUAL LEARNING
━━━━━━━━━━━━━━━━━━━━━━━━
When a diagram would genuinely help (geometry, processes, anatomy, timelines), write on its own line: [IMAGE: specific description]
Use sparingly — maximum one per response, only when truly useful.

━━━━━━━━━━━━━━━━━━━━━━━━
FORMAT
━━━━━━━━━━━━━━━━━━━━━━━━
• Max 3 short paragraphs. Never overwhelm.
• End EVERY response with a question or challenge.
• Always include [BLOOM:level] tag at the very end.

${ndCtx ? `\n━━━━━━━━━━━━━━━━━━━━━━━━\nSTUDY MATERIAL (use this to ask specific, grounded questions):\n${ndCtx}\n━━━━━━━━━━━━━━━━━━━━━━━━` : ''}`;
}

// ══════════════════════════════════════════════
//  ONBOARDING
// ══════════════════════════════════════════════
let obStep = 1;
let schoolDebounce = null;

function updateAgeSlider(val) {
  document.getElementById('age-display').textContent = val;
  // Update gradient fill
  const pct = ((val - 6) / 12) * 100;
  document.getElementById('ob-age').style.background =
    `linear-gradient(to right, var(--forest) 0%, var(--forest) ${pct}%, var(--cream3) ${pct}%)`;
}

function debounceSchool(val) {
  clearTimeout(schoolDebounce);
  if (!val.trim() || val.trim().length < 4) {
    document.getElementById('school-status').className = 'school-status';
    return;
  }
  schoolDebounce = setTimeout(() => lookupSchool(val.trim()), 800);
}

async function lookupSchool(name) {
  const el = document.getElementById('school-status');
  el.className = 'school-status searching';
  el.textContent = '🔍 Researching school curriculum...';

  // Detect country from school name keywords
  const lower = name.toLowerCase();
  let country = 'International';
  let curriculumUrl = '';
  let curriculumDesc = '';

  if (lower.includes('gymnasium') || lower.includes('realschule') || lower.includes('gesamtschule') || lower.includes('berlin') || lower.includes('münchen') || lower.includes('hamburg') || lower.includes('köln') || lower.includes('frankfurt') || lower.includes('deutsche')) {
    country = 'Germany';
    curriculumUrl = `https://en.wikipedia.org/wiki/Education_in_Germany`;
    curriculumDesc = 'German state curriculum (Lehrplan)';
  } else if (lower.includes('academy') || lower.includes('college') || lower.includes("st ") || lower.includes("saint") || lower.includes('grammar') || lower.includes('london') || lower.includes('manchester') || lower.includes('birmingham') || lower.includes('british')) {
    country = 'UK';
    curriculumUrl = `https://en.wikipedia.org/wiki/National_curriculum_in_England`;
    curriculumDesc = 'National Curriculum for England';
  } else if (lower.includes('école') || lower.includes('lycée') || lower.includes('collège') || lower.includes('paris') || lower.includes('français')) {
    country = 'France';
    curriculumUrl = `https://en.wikipedia.org/wiki/Education_in_France`;
    curriculumDesc = 'French national curriculum (Éducation nationale)';
  } else if (lower.includes('scuola') || lower.includes('liceo') || lower.includes('istituto') || lower.includes('italiano')) {
    country = 'Italy';
    curriculumUrl = `https://en.wikipedia.org/wiki/Education_in_Italy`;
    curriculumDesc = 'Italian Ministry of Education curriculum';
  } else if (lower.includes('high school') || lower.includes('elementary') || lower.includes('middle school') || lower.includes('american') || lower.includes('usa')) {
    country = 'USA';
    curriculumUrl = `https://en.wikipedia.org/wiki/Education_in_the_United_States`;
    curriculumDesc = 'US Common Core curriculum standards';
  } else {
    // Generic fallback — use IB curriculum
    country = 'International';
    curriculumUrl = `https://en.wikipedia.org/wiki/International_Baccalaureate`;
    curriculumDesc = 'International Baccalaureate curriculum';
  }

  // Store for later Needle loading
  S.school = name;
  S.schoolCurriculum = curriculumUrl;

  el.className = 'school-status found';
  el.innerHTML = `✓ Found: <strong>${country} curriculum</strong> detected — <em>${curriculumDesc}</em> will be loaded into Needle automatically when you start.`;

  // Update step 3 status
  document.getElementById('ob3-desc').textContent = `Featherless · ElevenLabs · Needle — ready. ${curriculumDesc} will load automatically.`;
}

function pickStyle(el) {
  document.querySelectorAll('.style-card').forEach(c => c.classList.remove('sel'));
  el.classList.add('sel');
}

function pickGoal(el) {
  document.querySelectorAll('.goal-chip').forEach(c => c.classList.remove('sel'));
  el.classList.add('sel');
}

function pickUpdate(el) {
  document.querySelectorAll('.update-opt').forEach(c => c.classList.remove('sel'));
  el.classList.add('sel');
}

function obBack() {
  if (obStep < 2) return;
  obStep--;
  renderOb();
}

function obNext() {
  if (obStep === 1) {
    if (!document.getElementById('ob-name').value.trim()) { toast('Enter your child\'s name', 'err'); return; }
  }
  if (obStep === 3) { launch(); return; }
  obStep++;
  renderOb();
}

function renderOb() {
  ['ob1','ob2','ob3'].forEach((id, i) => {
    document.getElementById(id).classList.toggle('active', i + 1 === obStep);
    const dot = document.getElementById(`sd${i+1}`);
    dot.classList.toggle('cur', i + 1 === obStep);
    dot.classList.toggle('done', i + 1 < obStep);
  });
  document.getElementById('ob-prog').style.width = (obStep / 3 * 100) + '%';
  document.getElementById('ob-back').style.display = obStep > 1 ? 'block' : 'none';
  document.getElementById('ob-next').textContent = obStep === 3 ? 'Start Learning →' : 'Continue →';
}

async function launch() {
  S.name   = document.getElementById('ob-name').value.trim();
  S.age    = document.getElementById('ob-age').value;
  S.subj   = 'General / Mixed';
  S.notes  = document.getElementById('ob-notes').value.trim();
  S.school = document.getElementById('ob-school').value.trim();

  const selGoal   = document.querySelector('.goal-chip.sel');
  const selUpdate = document.querySelector('.update-opt.sel');
  const selStyle  = document.querySelector('.style-card.sel');
  S.learningGoal  = selGoal   ? selGoal.dataset.g   : 'critical';
  S.parentUpdates = selUpdate ? selUpdate.dataset.u : 'monthly';
  S.style         = selStyle  ? selStyle.dataset.s  : 'socratic';
  S.sessionStart  = Date.now();

  // Map goal to a session goal string
  const goalMap = {
    critical: 'Build strong critical thinking and reasoning skills',
    homework: 'Homework support — understand the material well enough to work independently',
    curiosity: 'Spark genuine curiosity and love of learning',
  };
  S.goal = goalMap[S.learningGoal];

  // Hide onboarding, show app
  document.getElementById('ob').style.display = 'none';
  document.getElementById('app').style.display = 'flex';
  document.getElementById('app').classList.add('show');

  // Header
  document.getElementById('chip-av').textContent = S.name[0].toUpperCase();
  document.getElementById('chip-name').textContent = `${S.name}, ${S.age}`;


  // Dev panel
  document.getElementById('d-name').textContent    = S.name;
  document.getElementById('d-age').textContent     = S.age;
  document.getElementById('d-school').textContent  = S.school || '—';
  document.getElementById('d-subj').textContent    = S.subj;
  document.getElementById('d-goal').textContent    = S.goal || '—';
  document.getElementById('d-notes').textContent   = S.notes || '—';
  document.getElementById('d-conf').textContent    = `${TEMP} / ${MAX_TOK}`;
  document.getElementById('d-model').textContent   = MODEL;
  document.getElementById('d-updates').textContent = S.parentUpdates;

  const styleLabels = {socratic:'Socratic Guide',stepbystep:'Step by Step',friendly:'Warm & Patient',challenge:'Challenge Mode'};
  document.getElementById('d-style').textContent = styleLabels[S.style];

  // Build starter questions
  buildStarters();

  // Auto-load Needle: school curriculum first, then subject URL as fallback
  const curriculumUrl = S.schoolCurriculum || SUBJECT_URLS[S.subj];
  if (curriculumUrl) {
    const loadLabel = S.schoolCurriculum
      ? `Loading ${S.school || 'school'} curriculum via Needle...`
      : 'Loading subject material via Needle...';
    toast(loadLabel, 'ok');
    autoLoadNeedle(curriculumUrl);
  } else {
  }

  document.getElementById('sbtn').disabled = false;

  // Welcome message after short delay
  setTimeout(() => {
    const goalLine = S.goal ? ` Your goal: ${S.goal}.` : '';
    addBubble('ai', `Hi ${S.name}! 👋 I'm your personal tutor.${goalLine} Ask me anything — I won't just give you answers, I'll help you actually think through them so you understand them for good. What's on your mind?`);
  }, 500);

  document.getElementById('minput').focus();
}

// ══════════════════════════════════════════════
//  SEND MESSAGE
// ══════════════════════════════════════════════
async function sendMsg(isHint = false, isGotIt = false) {
  if (S.loading) return;
  const ta = document.getElementById('minput');
  let text = isHint ? '(hint request)' : isGotIt ? '(student says they figured it out — check if correct, celebrate specifically if so)' : ta.value.trim();

  // Handle pending image
  const imgSnap = pendingImg;
  if (imgSnap) clearImgPreview();

  if (!text && !isHint && !isGotIt && !imgSnap) return;

  const empty = document.getElementById('empty-chat');
  if (empty) empty.remove();

  if (!isHint && !isGotIt) {
    if (imgSnap) addImgBubble(imgSnap.dataUrl, text);
    else addBubble('user', text);
    S.events.push({ who: 'student', text: text || '[Bild]', type: 'message', ts: Date.now() });
    ta.value = ''; ta.style.height = 'auto';
  }

  // Build content for AI: if image, prepend a note
  let aiContent = isHint
    ? 'I need a hint — please give me the gentlest possible nudge without telling me the answer.'
    : isGotIt
    ? 'I think I got it! Please confirm if I understood correctly and challenge me further.'
    : text;

  if (imgSnap && !isHint && !isGotIt) {
    const imgNote = `[Der Schüler hat ein Bild geteilt${text ? ': ' + text : '. Frage neugierig nach, was er damit lernen oder verstehen möchte'}]`;
    aiContent = text ? `${text}\n\n${imgNote}` : imgNote;
  }

  S.history.push({ role: 'user', content: aiContent });

  S.loading = true;
  document.getElementById('sbtn').disabled = true;
  const tid = showTyping();

  // Get Needle context
  let ndCtx = '';
  if (S.ndReady) ndCtx = await srchNeedle(isHint ? 'hint nudge' : text);

  const t0 = Date.now();
  try {
    const { reply, usage } = await callFL(ndCtx);
    const lat = Date.now() - t0;
    removeTyping(tid);

    S.totTok += usage.total_tokens || 0;
    S.pTok   += usage.prompt_tokens || 0;
    S.cTok   += usage.completion_tokens || 0;
    S.calls++;
    S.exchanges++;

    // Parse response
    const isAha   = reply.startsWith('[AHA]');
    const clean   = reply.replace(/^\[AHA\]\s*/, '').replace(/\[BLOOM:\w+\]/gi, '').trim();
    const bloomM  = reply.match(/\[BLOOM:(\w+)\]/i);
    const bloomLvl = bloomM ? bloomM[1].toLowerCase() : 'understand';
    const { txt, imgP } = parseImg(clean);

    addBubble('ai', txt, usage, isHint, isAha, bloomLvl);
    S.history.push({ role: 'assistant', content: clean });
    S.events.push({ who: 'tutor', text: txt, type: isAha ? 'aha' : isHint ? 'hint' : 'message', bloom: bloomLvl, ts: Date.now() });

    if (isAha) { S.ahas++; document.getElementById('d-ahas').textContent = S.ahas; }

    // Track Bloom
    if (bloomLvl && S.bloom.hasOwnProperty(bloomLvl)) {
      S.bloom[bloomLvl]++;
      S.bloomTotal++;
    }

    if (imgP && S.imgsOn) genImg(imgP);

    updateDev(usage, lat);
    updateDashBadge();

  } catch(e) {
    removeTyping(tid);
    addBubble('ai', '⚠️ Error: ' + e.message);
    S.history.pop();
  }

  S.loading = false;
  document.getElementById('sbtn').disabled = false;
  document.getElementById('minput').focus();
}

function reqHint() {
  if (S.hintsLeft <= 0) { toast('No hints left!', 'err'); return; }
  S.hintsLeft--;
  S.hintsUsed++;
  document.getElementById('hcount').textContent = S.hintsLeft;
  document.getElementById('d-hints').textContent = S.hintsUsed;
  if (S.hintsLeft === 0) document.getElementById('btn-hint').disabled = true;
  S.events.push({ who: 'student', text: '(requested a hint)', type: 'hint', ts: Date.now() });
  sendMsg(true, false);
}

function gotIt() { sendMsg(false, true); }

// ══════════════════════════════════════════════
//  FEATHERLESS
// ══════════════════════════════════════════════
async function callFL(ndCtx) {
  const res = await fetch('https://api.featherless.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${FL_KEY}` },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'system', content: buildPrompt(ndCtx) }, ...S.history],
      max_tokens: MAX_TOK,
      temperature: TEMP
    })
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error?.message || `API error ${res.status}`);
  }
  const data = await res.json();
  document.getElementById('d-raw').textContent = JSON.stringify(data, null, 2);
  return { reply: data.choices[0].message.content.trim(), usage: data.usage || {} };
}

// ══════════════════════════════════════════════
//  IMAGE GENERATION (free — Pollinations)
// ══════════════════════════════════════════════
function parseImg(t) {
  const m = t.match(/\[IMAGE:\s*([^\]]+)\]/i);
  if (!m) return { txt: t, imgP: null };
  return { txt: t.replace(m[0], '').trim(), imgP: m[1].trim() };
}

function genImg(p) {
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent('clean educational diagram: ' + p + ', white background, textbook illustration, labeled clearly, professional')}?width=640&height=380&nologo=true&seed=${Date.now()}`;
  const wrap = document.createElement('div');
  wrap.className = 'msg ai';
  wrap.innerHTML = `
    <div class="msg-av" style="font-size:16px">🖼</div>
    <div class="msg-body">
      <div class="gen-img-card">
        <img src="${url}" alt="${p}" onload="document.getElementById('msgs').scrollTop=99999"/>
        <div class="gen-img-cap">📐 ${p}</div>
      </div>
    </div>`;
  document.getElementById('msgs').appendChild(wrap);
  document.getElementById('msgs').scrollTop = 99999;
  S.imgs++;
  document.getElementById('d-imgs').textContent = S.imgs;
}

// ══════════════════════════════════════════════
//  NEEDLE — AUTO-LOAD ON SESSION START
// ══════════════════════════════════════════════
async function autoLoadNeedle(url) {
  try {
    const cr = await fetch('https://needle-ai.com/api/v1/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-needle-api-key': ND_KEY },
      body: JSON.stringify({ name: `guided_${S.name}_${Date.now()}` })
    });
    if (!cr.ok) throw new Error(`Collection ${cr.status}`);
    const cd = await cr.json();
    S.ndCollId = cd.id;
    document.getElementById('d-coll').textContent = cd.id;

    await fetch(`https://needle-ai.com/api/v1/collections/${S.ndCollId}/files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-needle-api-key': ND_KEY },
      body: JSON.stringify({ url })
    });

    S.ndReady = true;
    toast('Needle loaded — questions grounded in study material', 'ok');
  } catch(e) {
    console.error('Needle auto-load:', e);
  }
}

async function loadNeedle() {
  const url = document.getElementById('nd-url').value.trim();
  if (!url) { toast('Enter a URL or topic first', 'err'); return; }
  const btn = document.getElementById('nd-btn');
  btn.disabled = true; btn.textContent = 'Loading...';
  showNdSt('ld', '⏳ Indexing document...');
  try {
    const cr = await fetch('https://needle-ai.com/api/v1/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-needle-api-key': ND_KEY },
      body: JSON.stringify({ name: `guided_${Date.now()}` })
    });
    if (!cr.ok) throw new Error(`Collection ${cr.status}`);
    const cd = await cr.json();
    S.ndCollId = cd.id;
    document.getElementById('d-coll').textContent = cd.id;

    const isUrl = url.startsWith('http');
    const fr = await fetch(`https://needle-ai.com/api/v1/collections/${S.ndCollId}/files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-needle-api-key': ND_KEY },
      body: JSON.stringify(isUrl ? { url } : { content: url, name: 'material.txt' })
    });
    if (!fr.ok) throw new Error(`File ${fr.status}`);
    S.ndReady = true;
    showNdSt('ok', '✓ Loaded. Every question now uses this as context.');
    toast('Needle loaded', 'ok');
  } catch(e) {
    showNdSt('er', '✕ ' + e.message);
    toast('Needle error', 'err');
  }
  btn.disabled = false; btn.textContent = 'Load into Needle →';
}

async function srchNeedle(q) {
  if (!S.ndCollId || !q) return '';
  try {
    const r = await fetch(`https://needle-ai.com/api/v1/collections/${S.ndCollId}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-needle-api-key': ND_KEY },
      body: JSON.stringify({ query: q, top_k: 3 })
    });
    const d = await r.json();
    S.ndSearches++;
    document.getElementById('d-nds').textContent = S.ndSearches;
    if (d.results?.length) {
      const ctx = d.results.map(r => r.content).join('\n\n');
      document.getElementById('d-lctx').textContent = ctx.slice(0, 80) + '...';
      return ctx;
    }
  } catch(e) { console.error('Needle search:', e); }
  return '';
}

function showNdSt(t, m) { const el = document.getElementById('nd-st'); el.className = `nd-status ${t}`; el.textContent = m; }

function stopAudio() {
  if (S.audio) { S.audio.pause(); S.audio = null; }
}

// ══════════════════════════════════════════════
//  PARENT DASHBOARD
// ══════════════════════════════════════════════
function updateDashBadge() {
  if (S.exchanges >= 4) {
    document.getElementById('tab-p').classList.add('has-data');
  }
}

function buildDashboard() {
  if (S.exchanges < 4) return;

  const duration = Math.max(1, Math.round((Date.now() - S.sessionStart) / 60000));

  // Independence score
  const hintPenalty = (S.hintsUsed / 3) * 30;
  const exchBonus   = Math.min(25, S.exchanges * 3);
  const ahaBon      = S.ahas * 12;
  const score       = Math.round(Math.max(5, Math.min(100, 68 - hintPenalty + exchBonus + ahaBon)));
  const scoreClass  = score >= 70 ? 'hi' : score >= 45 ? 'mid' : 'lo';
  const scoreWord   = score >= 70 ? 'Strong Independence' : score >= 45 ? 'Growing Independence' : 'Building Foundations';

  // Bloom %s
  const bloomColors = { remember:'#3B82F6',understand:'#22C55E',apply:'#EAB308',analyze:'#F97316',evaluate:'#A855F7',create:'#EF4444' };
  const bloomBarsHTML = Object.entries(S.bloom).map(([level, count]) => {
    const pct = S.bloomTotal > 0 ? Math.round((count / S.bloomTotal) * 100) : 0;
    return `<div class="bloom-row">
      <div class="bloom-label">${level.charAt(0).toUpperCase() + level.slice(1)}</div>
      <div class="bloom-track"><div class="bloom-fill" style="width:${pct}%;background:${bloomColors[level]}"></div></div>
      <div class="bloom-pct">${pct}%</div>
    </div>`;
  }).join('');

  // Headlines
  const headlines = {
    hi:  `${S.name} showed strong independent thinking this session`,
    mid: `${S.name} made solid progress with guided support`,
    lo:  `${S.name} is building foundations — consistent practice will accelerate this`,
  };

  const thinkingInsight = {
    hi:  'Worked through problems with minimal support. Reached conclusions through own reasoning.',
    mid: 'Used hints strategically and kept trying when stuck — a key learning habit.',
    lo:  'Needed significant scaffolding. Concepts are new and that\'s completely normal at this stage.',
  };

  const nextStep = {
    hi:  `Challenge ${S.name} with harder problems. Try reducing hints to 1 per session.`,
    mid: `Daily sessions of 20 minutes will compound quickly. Encourage independent attempts before hints.`,
    lo:  `Short, frequent sessions (15 min daily) beat long occasional ones. Focus on one concept at a time.`,
  };

  // Struggle points
  const hintEvents = S.events.filter(e => e.type === 'hint');
  const ahaEvents  = S.events.filter(e => e.type === 'aha');

  const dw = document.getElementById('dash-wrap');
  dw.innerHTML = `
    <div class="dash-top">
      <div>
        <div class="dash-heading">Parent Dashboard</div>
        <div class="dash-sub-head">${S.name} · ${S.subj} · ${S.goal || 'General session'}</div>
      </div>
      <div class="dash-date">${new Date().toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}</div>
    </div>

    <!-- Score Hero -->
    <div class="score-hero">
      <div class="score-ring-outer">
        <div class="score-ring ${scoreClass}">
          <div class="score-num">${score}</div>
          <div class="score-sublabel">/ 100</div>
        </div>
        <div class="score-label">Independence Score</div>
      </div>
      <div class="score-right">
        <div class="score-headline">${headlines[scoreClass]}</div>
        <div class="score-stats">
          <div class="ss"><div class="ss-val">${S.exchanges}</div><div class="ss-key">Exchanges</div></div>
          <div class="ss"><div class="ss-val">${S.hintsUsed}</div><div class="ss-key">Hints used</div></div>
          <div class="ss"><div class="ss-val">${S.ahas}</div><div class="ss-key">Aha moments</div></div>
          <div class="ss"><div class="ss-val">${duration}m</div><div class="ss-key">Duration</div></div>
        </div>
      </div>
    </div>

    <!-- Bloom's Taxonomy -->
    <div class="bloom-section">
      <div class="section-eyebrow">Cognitive Development</div>
      <div class="section-title">What thinking levels did ${S.name} exercise?</div>
      <div class="bloom-bars">${bloomBarsHTML}</div>
      <div style="margin-top:14px;font-size:13px;color:var(--ink3);line-height:1.6">
        <strong style="color:var(--ink2)">What this means:</strong> Higher levels (Analyze, Evaluate, Create) indicate deeper thinking. 
        Remember/Understand is foundational. The goal over multiple sessions is to see the bars shift upward.
      </div>
    </div>

    <!-- Insights -->
    <div class="insight-grid">
      <div class="insight-card">
        <div class="insight-icon">🧠</div>
        <div class="insight-label">Thinking Style</div>
        <div class="insight-val">${thinkingInsight[scoreClass]}</div>
      </div>
      <div class="insight-card">
        <div class="insight-icon">${ahaEvents.length > 0 ? '✨' : '📈'}</div>
        <div class="insight-label">${ahaEvents.length > 0 ? 'Breakthrough Moments' : 'Progress'}</div>
        <div class="insight-val">${ahaEvents.length > 0 ? `${S.name} had ${ahaEvents.length} genuine "aha" moment${ahaEvents.length > 1 ? 's' : ''} — concepts clicked through their own thinking, not just being told.` : 'No aha moments this session yet. Keep going — they\'re coming. Every exchange builds the foundation.'}</div>
      </div>
      <div class="insight-card">
        <div class="insight-icon">💪</div>
        <div class="insight-label">Strength Shown</div>
        <div class="insight-val">${score >= 70 ? `${S.name} persisted through difficulty and didn't give up when the answer wasn't obvious. That's the most important skill to build.` : score >= 45 ? `${S.name} kept engaging even when stuck. Asking for a hint is smarter than giving up — it shows metacognition.` : `${S.name} showed up and tried. At this stage, that's everything.`}</div>
      </div>
      <div class="insight-card">
        <div class="insight-icon">🎯</div>
        <div class="insight-label">Next Session</div>
        <div class="insight-val">${nextStep[scoreClass]}</div>
      </div>
    </div>

    <!-- Struggles -->
    ${hintEvents.length > 0 ? `
    <div class="struggle-card">
      <div class="sc-header">
        <div class="section-eyebrow">Support Points</div>
        <div class="section-title">Where ${S.name} needed a nudge</div>
      </div>
      <div class="sc-body">
        ${hintEvents.map((e, i) => `
          <div class="struggle-item">
            <div class="si-icon">❓</div>
            <div class="si-text"><strong>Hint ${i+1}</strong> — ${S.name} requested support at this point in the session. This is a normal part of learning and not a failure — it shows self-awareness about being stuck.</div>
          </div>`).join('')}
      </div>
    </div>` : ''}

    <!-- Transcript -->
    <div class="transcript-card">
      <div class="tc-header">
        <div class="section-eyebrow">Full Record</div>
        <div class="section-title">Session Transcript</div>
      </div>
      <div class="tc-body">
        ${S.events.map(e => `
          <div class="tr-entry">
            <div class="tr-role ${e.who === 'student' ? 'student' : e.type === 'hint' ? 'hint' : e.type === 'aha' ? 'aha' : 'tutor'}">${e.who === 'student' ? S.name : e.type === 'aha' ? 'aha ✨' : e.type === 'hint' ? 'hint' : 'tutor'}</div>
            <div class="tr-text">${escH(e.text)}</div>
          </div>`).join('')}
      </div>
    </div>
  `;
}

// ══════════════════════════════════════════════
//  DEV PANEL
// ══════════════════════════════════════════════
function updateDev(usage, lat) {
  document.getElementById('d-tot').textContent   = S.totTok.toLocaleString();
  document.getElementById('d-split').textContent = `${S.pTok.toLocaleString()} / ${S.cTok.toLocaleString()}`;
  document.getElementById('d-calls').textContent = S.calls;
  document.getElementById('d-lat').textContent   = lat + 'ms';

  const pct = Math.min(100, Math.round((S.totTok / CTX_WIN) * 100));
  document.getElementById('d-cpct').textContent = pct + '%';
  const bar = document.getElementById('d-cbar');
  bar.style.width = pct + '%';
  bar.style.background = pct > 80 ? 'var(--red)' : pct > 60 ? 'var(--gold)' : 'var(--forest)';

  const hl = document.getElementById('d-hist');
  hl.innerHTML = '';
  [{ role: 'system', content: buildPrompt('') }, ...S.history].forEach(m => {
    const d = document.createElement('div');
    d.className = 'hist-entry';
    d.innerHTML = `<div class="hrole ${m.role}">${m.role}</div><div class="htext">${escH(m.content)}</div>`;
    hl.appendChild(d);
  });
}

// ══════════════════════════════════════════════
//  UI HELPERS
// ══════════════════════════════════════════════
const BLOOM_COLORS = { remember:'remember',understand:'understand',apply:'apply',analyze:'analyze',evaluate:'evaluate',create:'create' };

function addBubble(role, text, usage, isHint, isAha, bloomLvl) {
  const msgs = document.getElementById('msgs');
  const empty = document.getElementById('empty-chat');
  if (empty) empty.remove();

  const d = document.createElement('div');
  d.className = `msg ${role}`;

  let bubClass = 'bubble';
  if (isHint) bubClass += ' hint';
  if (isAha)  bubClass += ' aha';

  const tokTag = (role === 'ai' && usage?.completion_tokens)
    ? `<span class="tok-tag">${usage.completion_tokens} tok</span>` : '';

  const bloomTag = (role === 'ai' && bloomLvl && BLOOM_COLORS[bloomLvl])
    ? `<span class="thinking-badge ${BLOOM_COLORS[bloomLvl]}">${bloomLvl}</span>` : '';

  const initials = role === 'user' ? S.name.slice(0, 2).toUpperCase() : '🌱';

  d.innerHTML = `
    <div class="msg-av">${initials}</div>
    <div class="msg-body">
      <div class="${bubClass}">${escH(text)}</div>
      <div class="msg-meta">
        ${new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}
        ${tokTag}
        ${bloomTag}
      </div>
    </div>`;

  msgs.appendChild(d);
  msgs.scrollTop = msgs.scrollHeight;
}

function showTyping() {
  const msgs = document.getElementById('msgs');
  const id = 'tp' + Date.now();
  const d = document.createElement('div');
  d.className = 'msg ai'; d.id = id;
  d.innerHTML = `<div class="msg-av">🌱</div><div class="msg-body"><div class="typing-ring"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div></div>`;
  msgs.appendChild(d);
  msgs.scrollTop = msgs.scrollHeight;
  return id;
}

function removeTyping(id) { const e = document.getElementById(id); if (e) e.remove(); }

function buildStarters() {
  const map = {
    Mathematics: ['Why does x²-4=0 have two solutions?','What is a derivative actually measuring?','Why is dividing by zero impossible?'],
    Physics: ['Why does ice float?','What is the difference between speed and velocity?','How does gravity actually work?'],
    Chemistry: ['How do atoms bond to each other?','What actually happens in a chemical reaction?','Why is water so unusual?'],
    Biology: ['How does photosynthesis actually work?','What does DNA actually do?','How do vaccines work?'],
    History: ['Why did WW1 actually start?','What caused the fall of Rome?','Why did the Cold War happen?'],
    Literature: ['How do I analyse a poem?','What makes a character memorable?','How do I write a strong thesis?'],
    Geography: ['Why do tectonic plates move?','What causes climate zones?','Why do rivers flood?'],
    'Computer Science': ['What is recursion?','How does the internet work?','What is an algorithm?'],
    Economics: ['What causes inflation?','How does supply and demand work?','What is GDP?'],
    'General / Mixed': ['Explain something I find confusing','How do I think more critically?','What is the scientific method?'],
  };
  const s = map[S.subj] || map['General / Mixed'];
  const el = document.getElementById('starters'); el.innerHTML = '';
  s.forEach(t => {
    const c = document.createElement('div'); c.className = 'starter'; c.textContent = t;
    c.onclick = () => fillInput(t); el.appendChild(c);
  });
  document.getElementById('empty-title').textContent = `Hi ${S.name}! 👋`;
  document.getElementById('empty-sub').textContent = `Ask me anything — I'll explain it properly, not just give you the answer.`;
}

function clearChat() {
  S.history = []; S.events = [];
  S.totTok = 0; S.pTok = 0; S.cTok = 0; S.calls = 0;
  S.imgs = 0; S.ndSearches = 0;
  S.hintsLeft = 3; S.hintsUsed = 0; S.exchanges = 0; S.ahas = 0;
  S.bloom = { remember:0, understand:0, apply:0, analyze:0, evaluate:0, create:0 };
  S.bloomTotal = 0; S.sessionStart = Date.now();
  document.getElementById('msgs').innerHTML = '<div class="empty-chat" id="empty-chat"><div class="empty-icon-ring">🌱</div><div class="empty-title">Cleared</div><div class="empty-sub">Start fresh.</div></div>';
  document.getElementById('btn-hint').disabled = false;
  document.getElementById('hcount').textContent = '3';
  updateDev({}, 0);
  toast('Session cleared', 'ok');
}

function switchView(v) {
  document.querySelectorAll('.view').forEach(x => x.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(x => x.classList.remove('active'));
  document.getElementById(`v-${v}`).classList.add('active');
  document.getElementById(`tab-${v.charAt(0)}`).classList.add('active');
  if (v === 'parent') buildDashboard();
}

function toggleImgs()  { S.imgsOn = !S.imgsOn; document.getElementById('img-pill').classList.toggle('on', S.imgsOn); toast(S.imgsOn ? 'Images ON' : 'Images OFF'); }
function toggleDev()   { document.getElementById('dev-col').classList.toggle('hide'); document.getElementById('dev-pill').classList.toggle('on'); }

// ══════════════════════════════════════════════
//  LOGIN SYSTEM
// ══════════════════════════════════════════════

function showLoginScreen() {
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('school-screen').style.display = 'none';
  document.getElementById('admin-screen').style.display = 'none';
  document.getElementById('ob').style.display = 'none';
}

function chooseFamilie() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('ob').style.display = 'flex';
}

function chooseSchule() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('school-screen').style.display = 'flex';
}

function schTab(tab) {
  const isStudent = tab === 'student';
  document.getElementById('sch-tab-student').style.color = isStudent ? 'var(--forest)' : 'var(--ink4)';
  document.getElementById('sch-tab-student').style.borderBottomColor = isStudent ? 'var(--forest)' : 'transparent';
  document.getElementById('sch-tab-admin').style.color = !isStudent ? 'var(--forest)' : 'var(--ink4)';
  document.getElementById('sch-tab-admin').style.borderBottomColor = !isStudent ? 'var(--forest)' : 'transparent';
  document.getElementById('sch-student-panel').style.display = isStudent ? 'flex' : 'none';
  document.getElementById('sch-admin-panel').style.display = !isStudent ? 'flex' : 'none';
}

// ── LocalStorage helpers ─────────────────────────────────
function getSchools() { return JSON.parse(localStorage.getItem('guided_schools') || '[]'); }
function saveSchools(s) { localStorage.setItem('guided_schools', JSON.stringify(s)); }

function genCode() {
  const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let r = '';
  for (let i = 0; i < 6; i++) r += c[Math.floor(Math.random() * c.length)];
  return r;
}
function genPin() { return String(Math.floor(1000 + Math.random() * 9000)); }

// ── Create new school ────────────────────────────────────
function showNewSchoolForm() {
  const f = document.getElementById('admin-new-school-form');
  f.style.display = (f.style.display === 'none' || f.style.display === '') ? 'flex' : 'none';
}

function createSchool() {
  const name = document.getElementById('new-school-name').value.trim();
  const pw   = document.getElementById('new-admin-pw').value;
  if (!name) { toast('Schulname eingeben', 'err'); return; }
  if (pw.length < 4) { toast('Passwort muss min. 4 Zeichen haben', 'err'); return; }
  const schools = getSchools();
  // Check for duplicate names
  if (schools.find(s => s.name.toLowerCase() === name.toLowerCase())) {
    toast('Schule mit diesem Namen existiert bereits', 'err'); return;
  }
  const code = genCode();
  schools.push({ id: code, name, adminPw: pw, students: [] });
  saveSchools(schools);
  document.getElementById('admin-code').value = code;
  document.getElementById('admin-pw').value = pw;
  document.getElementById('admin-new-school-form').style.display = 'none';
  toast(`Schule erstellt! Code: ${code}`, 'ok');
}

// ── Admin login ──────────────────────────────────────────
let currentSchoolId = null;

function adminLogin() {
  const code = document.getElementById('admin-code').value.trim().toUpperCase();
  const pw   = document.getElementById('admin-pw').value;
  const schools = getSchools();
  const school = schools.find(s => s.id === code);
  if (!school) { toast('Schulcode nicht gefunden', 'err'); return; }
  if (school.adminPw !== pw) { toast('Falsches Passwort', 'err'); return; }
  currentSchoolId = code;
  document.getElementById('school-screen').style.display = 'none';
  openAdminDash(school);
}

function openAdminDash(school) {
  document.getElementById('admin-screen').style.display = 'flex';
  document.getElementById('admin-school-name').textContent = school.name;
  document.getElementById('admin-school-code').textContent = school.id;
  renderStudentList(school);
}

function renderStudentList(school) {
  const list = document.getElementById('student-list');
  document.getElementById('student-count').textContent = school.students.length;
  if (!school.students.length) {
    list.innerHTML = `<div style="text-align:center;padding:32px;color:var(--ink4);font-size:13.5px;background:var(--white);border:1px dashed var(--border);border-radius:14px">Noch keine Schüler. Füge oben den ersten hinzu.</div>`;
    return;
  }
  list.innerHTML = school.students.map(st => `
    <div class="student-row">
      <div class="student-av">${st.name.slice(0,2).toUpperCase()}</div>
      <div class="student-info">
        <div class="student-name">${escH(st.name)}</div>
        <div class="student-meta">${st.age} Jahre · ${styleLabel(st.style)} · ${goalLabel(st.goal)}</div>
        <div class="student-pin">PIN: ${st.pin}</div>
      </div>
      <button class="btn-launch-student" onclick='launchAsSchoolStudent(${JSON.stringify(st).replace(/'/g,"&#39;")})'>▶ Starten</button>
      <button class="btn-del" onclick="deleteStudent('${st.id}')">×</button>
    </div>
  `).join('');
}

function styleLabel(s) {
  return {socratic:'Sokratisch',stepbystep:'Schritt f. Schritt',friendly:'Warm',challenge:'Challenge'}[s] || s;
}
function goalLabel(g) {
  return {critical:'Krit. Denken',homework:'Hausaufgaben',curiosity:'Neugier'}[g] || g;
}

function addStudent() {
  const name  = document.getElementById('new-s-name').value.trim();
  const age   = document.getElementById('new-s-age').value || '12';
  const style = document.getElementById('new-s-style').value;
  const goal  = document.getElementById('new-s-goal').value;
  const notes = document.getElementById('new-s-notes').value.trim();
  if (!name) { toast('Name eingeben', 'err'); return; }
  const schools = getSchools();
  const school = schools.find(s => s.id === currentSchoolId);
  if (!school) return;
  const student = { id: Date.now().toString(), name, age, style, goal, notes, pin: genPin() };
  school.students.push(student);
  saveSchools(schools);
  document.getElementById('new-s-name').value = '';
  document.getElementById('new-s-notes').value = '';
  renderStudentList(school);
  toast(`${name} hinzugefügt — PIN: ${student.pin}`, 'ok');
}

function deleteStudent(id) {
  if (!confirm('Schüler wirklich löschen?')) return;
  const schools = getSchools();
  const school = schools.find(s => s.id === currentSchoolId);
  school.students = school.students.filter(s => s.id !== id);
  saveSchools(schools);
  renderStudentList(school);
  toast('Schüler gelöscht');
}

function adminLogout() {
  currentSchoolId = null;
  document.getElementById('admin-screen').style.display = 'none';
  showLoginScreen();
}

// ── Student login ────────────────────────────────────────
function studentLogin() {
  const code = document.getElementById('sch-code').value.trim().toUpperCase();
  const name = document.getElementById('sch-student-name').value.trim();
  const pin  = document.getElementById('sch-student-pin').value.trim();
  if (!code || !name || !pin) { toast('Alle Felder ausfüllen', 'err'); return; }
  const schools = getSchools();
  const school = schools.find(s => s.id === code);
  if (!school) { toast('Schulcode nicht gefunden', 'err'); return; }
  const student = school.students.find(s =>
    s.name.toLowerCase() === name.toLowerCase() && s.pin === pin
  );
  if (!student) { toast('Name oder PIN falsch', 'err'); return; }
  document.getElementById('school-screen').style.display = 'none';
  launchAsSchoolStudent({ ...student, schoolName: school.name });
}

// ── Launch app with school student profile ───────────────
function launchAsSchoolStudent(student) {
  document.getElementById('admin-screen').style.display = 'none';
  document.getElementById('school-screen').style.display = 'none';
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('ob').style.display = 'none';

  S.name   = student.name;
  S.age    = student.age || '12';
  S.subj   = 'General / Mixed';
  S.notes  = student.notes || '';
  S.school = student.schoolName || student.school || '';
  S.style  = student.style || 'socratic';
  S.learningGoal  = student.goal || 'critical';
  S.parentUpdates = 'monthly';
  S.sessionStart  = Date.now();
  const goalMap = {
    critical: 'Build strong critical thinking and reasoning skills',
    homework: 'Homework support — understand the material well enough to work independently',
    curiosity: 'Spark genuine curiosity and love of learning',
  };
  S.goal = goalMap[S.learningGoal] || '';

  document.getElementById('app').style.display = 'flex';
  document.getElementById('app').classList.add('show');

  document.getElementById('chip-av').textContent   = S.name.slice(0,1).toUpperCase();
  document.getElementById('chip-name').textContent = `${S.name}, ${S.age}`;
  document.getElementById('d-name').textContent    = S.name;
  document.getElementById('d-age').textContent     = S.age;
  document.getElementById('d-school').textContent  = S.school || '—';
  document.getElementById('d-subj').textContent    = S.subj;
  document.getElementById('d-goal').textContent    = S.goal || '—';
  document.getElementById('d-notes').textContent   = S.notes || '—';
  document.getElementById('d-conf').textContent    = `${TEMP} / ${MAX_TOK}`;
  document.getElementById('d-model').textContent   = MODEL;
  document.getElementById('d-updates').textContent = S.parentUpdates;

  const styleLabels = {socratic:'Socratic Guide',stepbystep:'Step by Step',friendly:'Warm & Patient',challenge:'Challenge Mode'};
  document.getElementById('d-style').textContent = styleLabels[S.style] || S.style;

  buildStarters();
  document.getElementById('sbtn').disabled = false;

  // Auto-load curriculum if school is known
  if (S.school) lookupSchool(S.school);

  setTimeout(() => {
    const goalLine = S.goal ? ` Dein Ziel heute: ${goalMap[S.learningGoal]}.` : '';
    addBubble('ai', `Hi ${S.name}! 👋 Ich bin dein persönlicher Tutor.${goalLine} Stell mir alles, was dich beschäftigt — ich gebe dir keine fertigen Antworten, sondern helfe dir, wirklich zu verstehen. Was haben wir heute vor?`);
  }, 500);

  document.getElementById('minput').focus();
}

// ══════════════════════════════════════════════
//  IMAGE ATTACH
// ══════════════════════════════════════════════
let pendingImg = null;

function toggleAttachMenu(e) {
  e.stopPropagation();
  const menu = document.getElementById('attach-menu');
  const isOpen = menu.style.display === 'block';
  menu.style.display = isOpen ? 'none' : 'block';
  if (!isOpen) {
    // Close when clicking anywhere else
    setTimeout(() => document.addEventListener('click', closeAttachMenu, { once: true }), 0);
  }
}
function closeAttachMenu() {
  document.getElementById('attach-menu').style.display = 'none';
}

function openCamera() {
  closeAttachMenu();
  document.getElementById('img-cam-input').click();
}
function openGallery() {
  closeAttachMenu();
  // Gallery: images only, no capture
  const inp = document.getElementById('img-file-input');
  inp.accept = 'image/*';
  inp.click();
}
function openFilePicker() {
  closeAttachMenu();
  const inp = document.getElementById('img-file-input');
  inp.accept = 'image/*,application/pdf,.doc,.docx,.txt,.csv';
  inp.click();
}

function handleImgPick(input) {
  const file = input.files[0];
  if (!file) return;
  input.value = ''; // allow re-selecting same file

  if (file.type.startsWith('image/')) {
    const reader = new FileReader();
    reader.onload = (e) => {
      pendingImg = { dataUrl: e.target.result, name: file.name, type: 'image' };
      document.getElementById('img-preview').src = e.target.result;
      document.getElementById('img-preview-wrap').style.display = 'block';
      document.getElementById('btn-attach').classList.add('has-img');
      document.getElementById('sbtn').disabled = false;
    };
    reader.readAsDataURL(file);
  } else {
    // Non-image file: just reference by name in the message
    pendingImg = { dataUrl: null, name: file.name, type: 'file' };
    document.getElementById('img-preview').src = '';
    document.getElementById('img-preview-wrap').style.display = 'block';
    document.getElementById('img-preview').style.display = 'none';
    // Show filename instead
    document.getElementById('img-preview-wrap').innerHTML = `
      <div class="img-preview-inner">
        <div style="background:var(--cream2);border:1.5px solid var(--border);border-radius:12px;padding:10px 16px;font-size:13px;font-weight:600;color:var(--ink2);display:flex;align-items:center;gap:8px">
          <span style="font-size:20px">📎</span> ${escH(file.name)}
          <button class="img-preview-remove" onclick="clearImgPreview()" style="position:relative;top:0;right:0;margin-left:8px">×</button>
        </div>
      </div>`;
    document.getElementById('btn-attach').classList.add('has-img');
    document.getElementById('sbtn').disabled = false;
  }
}

function clearImgPreview() {
  pendingImg = null;
  // Restore default preview HTML
  document.getElementById('img-preview-wrap').innerHTML = `
    <div class="img-preview-inner">
      <img id="img-preview" src="" alt="preview"/>
      <button class="img-preview-remove" onclick="clearImgPreview()">×</button>
    </div>`;
  document.getElementById('img-preview-wrap').style.display = 'none';
  document.getElementById('btn-attach').classList.remove('has-img');
  if (!document.getElementById('minput').value.trim()) {
    document.getElementById('sbtn').disabled = true;
  }
}

function addImgBubble(dataUrl, caption) {
  const msgs = document.getElementById('msgs');
  const empty = document.getElementById('empty-chat');
  if (empty) empty.remove();

  const initials = S.name ? S.name.slice(0,2).toUpperCase() : '?';
  const time = new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });

  const d = document.createElement('div');
  d.className = 'msg user';
  d.innerHTML = `
    <div class="msg-av" style="background:var(--forest);color:#fff;font-weight:700;font-family:'Playfair Display',serif">${initials}</div>
    <div class="msg-body">
      <div class="img-bubble-wrap" onclick="openLightbox('${dataUrl}')">
        <img src="${dataUrl}" alt="Bild"/>
      </div>
      ${caption ? `<div class="bubble" style="background:linear-gradient(145deg,var(--forest2),var(--forest));color:rgba(255,255,255,.94);border-bottom-right-radius:5px;box-shadow:0 4px 18px rgba(26,51,40,.22)">${escH(caption)}</div>` : ''}
      <div class="msg-meta" style="justify-content:flex-end">${time}</div>
    </div>`;
  msgs.appendChild(d);
  msgs.scrollTop = msgs.scrollHeight;
}

function openLightbox(src) {
  document.getElementById('img-lightbox-img').src = src;
  document.getElementById('img-lightbox').style.display = 'flex';
}
function closeLightbox() {
  document.getElementById('img-lightbox').style.display = 'none';
  document.getElementById('img-lightbox-img').src = '';
}

// ══════════════════════════════════════════════
//  VOICE MODE
// ══════════════════════════════════════════════
let voiceRecog     = null;
let voiceState     = 'idle'; // idle | listening | thinking | speaking
let voiceActive    = false;

function openVoiceMode() {
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRec) {
    toast('Spracherkennung wird von diesem Browser nicht unterstützt (Chrome empfohlen)', 'err');
    return;
  }
  voiceActive = true;
  document.getElementById('voice-overlay').style.display = 'flex';
  document.getElementById('btn-voice').classList.add('active');
  setVoiceState('idle');
}

function closeVoiceMode() {
  voiceActive = false;
  stopVoiceListening();
  stopAudio();
  document.getElementById('voice-overlay').style.display = 'none';
  document.getElementById('btn-voice').classList.remove('active');
  setVoiceState('idle');
}

function setVoiceState(state) {
  voiceState = state;
  const scene = document.getElementById('voice-orb-scene');
  scene.className = 'voice-orb-scene' + (state !== 'idle' ? ' ' + state : '');
  const statusMap = {
    idle:      'Tippe zum Sprechen',
    listening: 'Höre zu…',
    thinking:  'Denke nach…',
    speaking:  'Guided spricht…',
  };
  document.getElementById('voice-status').textContent = statusMap[state] || '';
}

function toggleVoiceListen() {
  if (voiceState === 'listening') {
    stopVoiceListening();
    setVoiceState('idle');
  } else if (voiceState === 'idle') {
    startVoiceListening();
  }
  // While thinking / speaking, tapping the orb does nothing — let it finish
}

function startVoiceListening() {
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  voiceRecog = new SpeechRec();
  voiceRecog.lang = navigator.language || 'de-DE';
  voiceRecog.interimResults = true;
  voiceRecog.continuous = false;
  voiceRecog.maxAlternatives = 1;

  setVoiceState('listening');
  document.getElementById('voice-transcript').textContent = '';

  voiceRecog.onresult = (e) => {
    const interim = Array.from(e.results).map(r => r[0].transcript).join('');
    document.getElementById('voice-transcript').textContent = interim;
    if (e.results[e.results.length - 1].isFinal) {
      voiceRecog.stop();
      handleVoiceInput(interim);
    }
  };

  voiceRecog.onerror = (e) => {
    console.error('Speech recognition error:', e.error);
    setVoiceState('idle');
    if (e.error !== 'no-speech') toast('Mikrofon-Fehler: ' + e.error, 'err');
  };

  voiceRecog.onend = () => {
    if (voiceState === 'listening') setVoiceState('idle');
  };

  voiceRecog.start();
}

function stopVoiceListening() {
  if (voiceRecog) { try { voiceRecog.stop(); } catch(e) {} voiceRecog = null; }
}

async function handleVoiceInput(text) {
  if (!text.trim() || !voiceActive) return;

  setVoiceState('thinking');
  document.getElementById('voice-transcript').textContent = text;

  // Show in chat
  const empty = document.getElementById('empty-chat');
  if (empty) empty.remove();
  addBubble('user', text);
  S.events.push({ who:'student', text, type:'message', ts:Date.now() });
  S.history.push({ role:'user', content: text });
  S.loading = true;

  let ndCtx = '';
  if (S.ndReady) ndCtx = await srchNeedle(text);

  try {
    const { reply, usage } = await callFL(ndCtx);
    S.loading = false;

    S.totTok += usage.total_tokens || 0;
    S.pTok   += usage.prompt_tokens || 0;
    S.cTok   += usage.completion_tokens || 0;
    S.calls++;
    S.exchanges++;

    const isAha   = reply.startsWith('[AHA]');
    const clean   = reply.replace(/^\[AHA\]\s*/, '').replace(/\[BLOOM:\w+\]/gi, '').trim();
    const bloomM  = reply.match(/\[BLOOM:(\w+)\]/i);
    const bloomLvl = bloomM ? bloomM[1].toLowerCase() : 'understand';
    const { txt }  = parseImg(clean);

    addBubble('ai', txt, usage, false, isAha, bloomLvl);
    S.history.push({ role:'assistant', content: clean });
    S.events.push({ who:'tutor', text:txt, type: isAha?'aha':'message', bloom:bloomLvl, ts:Date.now() });

    if (isAha) { S.ahas++; document.getElementById('d-ahas').textContent = S.ahas; }
    if (bloomLvl && S.bloom[bloomLvl] !== undefined) { S.bloom[bloomLvl]++; S.bloomTotal++; }

    updateDev(usage, Date.now());
    updateDashBadge();

    if (voiceActive) {
      setVoiceState('speaking');
      const preview = txt.length > 120 ? txt.slice(0, 120) + '…' : txt;
      document.getElementById('voice-transcript').textContent = preview;
      await speakTextEL(txt);
      if (voiceActive) {
        setVoiceState('idle');
        document.getElementById('voice-transcript').textContent = '';
        // Auto-listen again after short pause
        setTimeout(() => {
          if (voiceActive && voiceState === 'idle') startVoiceListening();
        }, 700);
      }
    }
  } catch(e) {
    S.loading = false;
    console.error('Voice AI error:', e);
    setVoiceState('idle');
    toast('Fehler beim Laden der Antwort', 'err');
  }
}

async function speakTextEL(text) {
  // Strip markdown for cleaner speech
  const clean = text
    .replace(/\*\*/g, '').replace(/\*/g, '')
    .replace(/#+\s/g, '').replace(/\[.*?\]/g, '')
    .replace(/<br>/gi, ' ').trim();
  const speakText = clean.length > 600 ? clean.slice(0, 600) + '.' : clean;

  try {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream`, {
      method: 'POST',
      headers: { 'xi-api-key': EL_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: speakText,
        model_id: 'eleven_turbo_v2',
        voice_settings: { stability: 0.5, similarity_boost: 0.75, speed: 1.0 }
      })
    });
    if (!res.ok) { console.error('ElevenLabs:', res.status, await res.text()); return; }
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    stopAudio();
    S.audio = new Audio(url);
    return new Promise(resolve => {
      S.audio.onended = () => { URL.revokeObjectURL(url); resolve(); };
      S.audio.onerror = resolve;
      S.audio.play().catch(resolve);
    });
  } catch(e) { console.error('TTS error:', e); }
}

// ── On page load: hide ob, show login ───────────────────
(function() {
  document.getElementById('ob').style.display = 'none';
})();

function fillInput(t) { const el = document.getElementById('minput'); el.value = t; el.focus(); autoResize(el); }
function handleKey(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); } }
function autoResize(el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 120) + 'px'; }
function escH(t) { return (t||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>'); }

let toastTimer;
function toast(msg, type = '') {
  const el = document.getElementById('toast');
  el.textContent = msg; el.className = 'toast show ' + type;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
}
