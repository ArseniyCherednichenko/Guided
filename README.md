# Guided — Socratic AI Tutor

**Guided** is an AI tutoring app for students aged 6–18 that never gives direct answers. Instead, it guides students through questions, staged hints, and a Reveal Ladder system — preserving critical thinking in an age of AI dependency.

## Features

- **Socratic Engine** — Asks guiding questions instead of giving answers
- **Reveal Ladder** — Staged hint system (nudge → clue → walkthrough → answer)
- **Homework Paste Detection** — Detects copy-pasted homework and responds pedagogically
- **Subject & Curriculum Detection** — Adapts to the student's school curriculum
- **Voice Mode** — Spoken Socratic questions via ElevenLabs
- **Parent Dashboard** — Analytics, Bloom's Taxonomy tracking, session history
- **Age-Appropriate Communication** — Adjusts tone and complexity by age

## Tech Stack

- **Frontend:** HTML, CSS, JavaScript
- **LLM:** Featherless (Meta-Llama 3.1 8B)
- **Voice:** ElevenLabs
- **RAG:** Needle
- **Curriculum Research:** Autonomous web-search agent

## Setup

1. Clone the repo:
   ```bash
   git clone https://github.com/frwende/Guided.git
   cd Guided
   ```

2. Add your API keys in `app.js`:
   ```js
   const FL_KEY = 'your-featherless-key';
   const EL_KEY = 'your-elevenlabs-key';
   const ND_KEY = 'your-needle-key';
   ```

3. Open `index.html` in a browser — no build step needed.

## Team

Built by **Fritzi**, **Arseniy**, and **Jakob** at the AI Mini Hackathon Berlin.

## Philosophy

> The "anti-ChatGPT for education" — active critical thinking development beats blocking AI access.

## License

MIT
