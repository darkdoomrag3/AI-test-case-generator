# AI Test Case Generator

A web app that turns product requirements (and optional screenshots) into structured test artefacts for QA: suites with traceability metadata, detailed cases, and exports for tools and documentation.

One Node.js server supports **OpenAI** (official API), **Groq** (OpenAI-compatible API at `api.groq.com`), and **Google Gemini**. Configure whichever provider you use; if more than one API key is present, you can choose the provider in the UI or lock it via environment variables.

## Features

- **Multiple AI backends**: OpenAI (`gpt-4o` by default), Groq (Llama vision/text defaults; see `.env.example`), or Gemini (`gemini-2.0-flash` by default); optional screenshot analysis where the model supports it.
- **QA-oriented output**: Suite summary, assumptions, open questions, risks; per-case fields such as requirement references, priority, severity, type, category, risk, test data, automation hints, pre/postconditions.
- **Exports**: CSV (wide column set), XML, JSON (suite + cases), Markdown (suites for wikis or Confluence-style docs).
- **Local history**: Successful generations saved under `data/history/` as JSON.

## Requirements

- **Node.js** 18 or newer (20+ recommended).
- At least one API key from [OpenAI](https://platform.openai.com/), [Groq](https://console.groq.com/), and/or [Google AI Studio](https://aistudio.google.com/) (Gemini).

## Project layout

```
├── public/              # Static UI (HTML, CSS, JS)
├── src/
│   ├── config/          # Environment and provider resolution
│   ├── providers/       # OpenAI, Groq, Gemini generation
│   ├── prompts/         # Shared generation prompts
│   ├── routes/          # REST API and export helpers
│   ├── services/        # Generation orchestration
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

## Running

```bash
npm start
```

Open **http://localhost:3847** (or your configured `PORT`).

The UI shows connection status under **AI provider**. If more than one backend is configured, a dropdown selects which runs for each generation.

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

Use and modify according to your organization’s policies; add a SPDX license file if you publish this repository publicly.
