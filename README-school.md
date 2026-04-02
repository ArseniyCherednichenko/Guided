# Guided — Socratic AI Tutor

**Guided** is an AI tutoring app for students aged 6–18 that never gives direct answers. Instead, it uses Socratic questioning, a staged Reveal Ladder, and persistent learning memory to build genuine thinking skills — the anti-ChatGPT for education.

One app, two experiences: the **child** gets a tutor that adapts to exactly where they are. The **parent** gets a dashboard with full visibility and control — without hovering over their shoulder.

## How It Works

Guided is a shared family account with two sides:

**For the student:** A Socratic AI tutor that asks guiding questions instead of giving answers. It tracks what the student knows (Bloom's Taxonomy), remembers past sessions, and adapts tone and complexity by age. Homework paste detection ensures students think through problems rather than outsourcing them.

**For the parent:** An onboarding flow where they set up their child's profile — age, school, learning style, what motivates them. A dashboard shows which subjects the child is working on, where they're getting stuck, and how far they push through challenges before asking for help.

## Features

- **Socratic Engine** — Guiding questions instead of direct answers
- **Reveal Ladder** — Staged hint system: nudge → clue → walkthrough → answer (only as last resort)
- **Persistent Learning Memory** — Last 10 sessions loaded on login; tutor handover notes generated between sessions
- **Homework Paste Detection** — Detects copy-pasted homework and responds pedagogically
- **Parent Dashboard** — Analytics, Bloom's Taxonomy tracking, session history
- **Voice Mode** — Spoken Socratic dialogue via ElevenLabs
- **Age-Appropriate Communication** — Adjusts tone and complexity from age 6 to 18
- **Curriculum Detection** — Adapts to the student's school curriculum via autonomous web-search agent

## School Connected (Optional Feature)

Guided works fully standalone as a family product. But when a school opts in, it unlocks a powerful layer of context.

**How it works:** The school grants consent (zero cost, zero extra workflow for teachers). Guided connects to the school's existing infrastructure — for example, Microsoft Teams channels — and passively reads teacher posts: assignments, materials, announcements. This content becomes context for the tutor, so it knows what's happening in the student's actual classes.

**The result:** Instead of generic tutoring, Guided asks questions about today's lesson. The teacher posts as usual — nothing changes for them. The student gets a tutor that knows their curriculum, their class, and their current topic.

**Integration paths:**
- **Microsoft Teams** — RSC Bot (Resource-Specific Consent) reads channel messages with Team Owner permission only. No Azure admin required.
- **Manual fallback** — For schools without Teams: a simple web form where teachers can share lesson context.

Schools that participate receive a **"KI-kompatible Schule"** certification — positioning them as forward-thinking institutions that integrate AI constructively rather than banning it.

## Tech Stack

- **Frontend:** Single-file HTML/CSS/JS (no build step)
- **LLM:** Claude Sonnet (Anthropic API with prompt caching — 90% token cost reduction)
- **Voice:** ElevenLabs
- **RAG:** Needle
- **Database & Auth:** Supabase
- **School Integration:** Microsoft Bot Framework SDK (planned)

## Setup

1. Clone the repo:
   ```bash
   git clone https://github.com/frwende/Guided-School.git
   cd Guided-School
   ```

2. Add your API keys in the setup screen (first launch) or directly in the source:
   - Anthropic API Key (required)
   - ElevenLabs API Key (optional — for voice)
   - Supabase URL + Key (for auth & persistence)
   - Needle Collection ID (for RAG)

3. Open `index.html` in a browser — no build step needed.

## Team

Built by **Fritzi**, **Arseniy**, and **Jakob** — Abitur students at Berlin Cosmopolitan School.

## Philosophy

> The ChatGPT user has a finished answer. You have a skill.

Traditional tutoring is fragmented — school, Nachhilfe, and individual development exist in separate silos. Guided unifies all three. Teachers aren't replaced; they're freed into a coaching role. Drilling and practice move into software. The tutor knows the student's past, present, and future learning plan.

## License

MIT
