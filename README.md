# QA Workbench

A local web app for software QA teams: structured **test suite generation**, a conversational **QA Copilot** agent, **guided workflows** (bug reports, exploratory charters, release checklists, risk reviews), **exports** for test management tools, and a **history browser** for past suites.

One Node.js server supports **OpenAI** (official API), **Groq** (`api.groq.com`), and **Google Gemini**. Configure whichever provider you use; if more than one API key is present, pick a backend per screen or lock defaults in `.env`.

## Features

- **Suite generator** (`/generator`): requirements and optional screenshots → suites with traceability metadata; exports CSV, XML, JSON, Markdown.
- **QA Copilot** (`/agent`): multi-turn chat for strategy, coverage, bug quality, automation trade-offs, and similar QA questions. System prompt is fixed server-side.
- **Workflows** (`/workflows`): structured JSON outputs for bug report coaching, exploratory charters, release checklists, and risk brainstorming (paste into Jira, Confluence, etc.).
- **Suite history** (`/history`): browse `data/history` JSON from successful generator runs.
- **Multiple AI backends**: OpenAI, Groq, Gemini with shared provider selection rules.

## Requirements

- **Node.js** 18 or newer (20+ recommended).
- At least one API key from [OpenAI](https://platform.openai.com/), [Groq](https://console.groq.com/), and/or [Google AI Studio](https://aistudio.google.com/) (Gemini).

## Project layout

```
├── public/              # Multi-page UI (dashboard, generator, agent, workflows, history)
├── src/
│   ├── config/          # Environment and provider resolution
│   ├── providers/       # OpenAI, Groq, Gemini + agent chat
│   ├── prompts/         # Suite, agent, and workflow prompts
│   ├── routes/          # REST API, exports, QA platform routes
│   ├── services/        # Generation + workflow JSON orchestration
│   ├── http/            # Upload handling (Multer)
│   ├── utils/           # Paths, history, JSON parsing
│   └── server.js        # Express entrypoint
├── data/
│   ├── history/         # Saved generations (created automatically)
│   └── uploads/         # Temporary image uploads (cleaned after requests)
├── .env.example
├── package.json
└── README.md
```

## Installation

From the repository root:

```bash
npm install
```

## Configuration

Copy the example env file and add your keys:

```bash
copy .env.example .env
```

On Linux or macOS:

```bash
cp .env.example .env
```

Edit `.env`:

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | Official OpenAI API key. |
| `GROQ_API_KEY` | Groq API key ([Groq Console](https://console.groq.com/)). |
| `GEMINI_API_KEY` | Google Gemini API key. |
| `AI_PROVIDER` | `auto`, `openai`, `groq`, or `gemini`. With `auto`, the first available provider is used in order: OpenAI → Groq → Gemini (unless you override in the UI when multiple keys exist). |
| `PORT` | HTTP port (default `3847`). |
| `OPENAI_MODEL` | Optional override (default `gpt-4o`). |
| `GEMINI_MODEL` | Optional override (default `gemini-2.0-flash`). |
| `GROQ_MODEL` | Optional single model for all Groq requests; if unset, text uses `llama-3.3-70b-versatile` and image uploads use `GROQ_VISION_MODEL` (default `llama-3.2-11b-vision-preview`). |

Environment files are loaded from the **project root** `.env` first, then `src/.env` if present (legacy compatibility).

## Theme

Use **Auto**, **Dark**, or **Light** in the top navigation. **Auto** follows the OS (`prefers-color-scheme`). The choice is stored in `localStorage` under `qa-workbench-theme` (`system` | `dark` | `light`). A small script in each page head applies the theme before paint to limit flashing.

## Running

```bash
npm start
```

Open **http://localhost:3847** (or your configured `PORT`).

| Path | Screen |
|------|--------|
| `/` | Dashboard |
| `/generator` | Test suite generator |
| `/agent` | QA Copilot (chat) |
| `/workflows` | Structured workflows |
| `/history` | Saved suite library |

If more than one backend is configured, pages that call the model show a provider dropdown.

## API (summary)

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/health` | Liveness check. |
| `GET` | `/api/config` | Which providers are configured and the default active provider. |
| `POST` | `/api/generate` | Multipart form: requirements, optional feature name, platform, depth, flags, requirement ID text, optional `provider`, optional image files. |
| `POST` | `/api/export/csv` | Body: `{ "testCases": [...] }`. |
| `POST` | `/api/export/xml` | Same shape. |
| `POST` | `/api/export/json` | Body: `{ "suite": {}, "testCases": [...] }`. |
| `POST` | `/api/export/md` | Same as JSON export body. |
| `POST` | `/api/agent/chat` | Body: `{ "messages": [{"role":"user"|"assistant","content":"..."}], "provider"?: "openai"|"groq"|"gemini" }`. |
| `POST` | `/api/workflows/bug-report` | Body: `summary`, `stepsToReproduce`, `expected`, `actual`, `environment`, optional `provider`. |
| `POST` | `/api/workflows/charter` | Body: `featureArea`, `mission`, `timebox`, `focus`, optional `provider`. |
| `POST` | `/api/workflows/release-checklist` | Body: `releaseName`, `scopeNotes`, `riskNotes`, optional `provider`. |
| `POST` | `/api/workflows/risk-review` | Body: `context`, optional `provider`. |
| `GET` | `/api/history` | List saved suite files with metadata. |
| `GET` | `/api/history/file/:name` | One saved JSON record (safe filename only). |

Optional model overrides for Copilot / workflows: `AGENT_OPENAI_MODEL`, `GROQ_AGENT_MODEL`, `AGENT_GEMINI_MODEL`, `WORKFLOW_OPENAI_MODEL`, `WORKFLOW_GROQ_MODEL`, `WORKFLOW_GEMINI_MODEL` (see code defaults if unset).

## Data and privacy

- **History** is written only on successful generation, under `data/history/`. Add patterns to `.gitignore` if you customize paths.
- **Uploaded images** are removed after each request (success or failure).
- Do not commit `.env` or API keys.

## Troubleshooting

- **“No AI provider configured”**: Set at least one of `OPENAI_API_KEY`, `GROQ_API_KEY`, or `GEMINI_API_KEY`, restart the server, and confirm `.env` sits in the project root or `src/` as above.
- **OpenAI JSON errors**: Ensure `OPENAI_MODEL` supports vision if you attach images (for example `gpt-4o`).
- **Groq errors**: Confirm the model exists and supports JSON mode where used; override with `GROQ_MODEL` or split text/vision defaults via `GROQ_TEXT_MODEL` / `GROQ_VISION_MODEL` in `.env`.
- **Port already in use (`EADDRINUSE`)**: Something else is listening on `PORT` (often another `node src/server.js`). Either stop it—on Windows PowerShell: `Get-NetTCPConnection -LocalPort 3847` then `Stop-Process -Id <PID> -Force`—or pick another port in `.env` (for example `PORT=3848`). The server prints these hints if startup fails.

## License

Open source under the [MIT License](LICENSE). You may use, copy, modify, and distribute the software; include the license notice in copies. See `LICENSE` for the full text.

Replace “ai-test-case-generator contributors” in `LICENSE` with your name or organization in the copyright line if you prefer.
