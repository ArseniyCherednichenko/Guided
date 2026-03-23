# Guided — AI Tutor That Makes You Think

**Guided** is an AI-powered tutoring app for students aged 6–18 that never gives direct answers. It uses the Socratic method to guide students through problems with questions, staged hints, and a Reveal Ladder — so they build real understanding instead of copying answers.

> *The anti-ChatGPT for education.*

---

## Why Guided

Most students use AI to skip thinking. Guided flips that: it detects when a student is stuck, asks the right question, and only reveals the answer as a last resort. The result is active learning, not passive consumption.

---

## Features

### For Students
- **Socratic Engine** — never gives the answer directly; guides through questions
- **Reveal Ladder** — 4-stage hint system: nudge → clue → worked example → answer
- **Homework Paste Detection** — detects copy-pasted homework and responds pedagogically
- **Inline Diagram Generation** — Claude draws SVG diagrams instantly for geometry, timelines, graphs
- **Voice Mode** — speak questions, hear answers read back (ElevenLabs or browser TTS)
- **Bloom's Taxonomy Tracking** — every response is tagged by cognitive level (Remember → Create)
- **Curriculum-Aware** — detects school name and adapts to local curriculum

### For Teachers & Parents
- **Dual Role Login** — separate flows for students and teachers
- **School Dashboard** — view student sessions, Bloom's levels, topics covered
- **Multi-Student Management** — add and switch between students
- **Teaching Style Picker** — Socratic, Friendly, Challenger, or Direct modes

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML, CSS, JavaScript (single file, no build step) |
| AI | Claude claude-sonnet-4-5 (Anthropic) |
| Database | Supabase (PostgreSQL) |
| Voice | ElevenLabs API + browser Web Speech API fallback |
| Markdown | marked.js v9 |

---

## Getting Started

### Prerequisites
- [Anthropic API key](https://console.anthropic.com/)
- [Supabase](https://supabase.com/) project (free tier works)
- [ElevenLabs API key](https://elevenlabs.io/) *(optional — browser TTS is used as fallback)*

### Run locally

```bash
git clone https://github.com/ArseniyCherednichenko/Guided.git
cd Guided
open index.html
```

No build step. No dependencies to install. Open the file and go.

### First-time setup

1. Open `index.html` in your browser
2. On the setup screen, enter your **Anthropic API key** and **Supabase credentials**
3. Keys are stored in `localStorage` — never sent anywhere except the respective APIs

---

## Project Structure

```
Guided/
├── index.html          # Entire app — all HTML, CSS, and JS in one file
├── logo.svg            # Vector logo (green rounded square + spark mark)
├── guided-logo.png     # PNG favicon (512×512)
└── generate-logo.html  # Utility: regenerate the PNG logo in-browser
```

---

## Team

Built by **Arseniy Cherednichenko**, **Friedrich Wende**, and **Jakob Poorhosaini**. 
