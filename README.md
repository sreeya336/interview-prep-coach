# Interview Prep Coach

An AI-powered chat app built on Cloudflare, made for the "Optional Assignment"
in the Cloudflare application. Paste a job description and it runs a
multi-step coaching workflow: extract the key skills the role needs, ask you
a tailored interview question, evaluate your answer, and move to the next
skill — remembering the whole conversation as it goes.

## How it maps to the assignment's required components

| Requirement | Implementation |
|---|---|
| **LLM** | Cloudflare Workers AI, running `@cf/meta/llama-3.3-70b-instruct-fp8-fast` |
| **Workflow / coordination** | A Durable Object (`InterviewSession`) runs a multi-step pipeline: extract skills → generate question → evaluate answer → generate next question, looping until every skill has been covered |
| **User input via chat** | A small static chat UI (`public/index.html`) served directly by the Worker |
| **Memory / state** | Each session is its own Durable Object instance; its storage persists the job description, extracted skills, every question asked (so it never repeats one), and the full conversation history |

## Project structure

```
interview-copilot/
├── wrangler.toml          # Worker + Durable Object + Workers AI + assets config
├── package.json
├── src/
│   ├── index.js            # Worker entrypoint: routes /api/* and serves the UI
│   └── interviewSession.js # Durable Object: the actual workflow + memory
└── public/
    └── index.html           # Chat UI
```

## Deploying it

This needs to run against your own Cloudflare account — API access isn't
available from where this was built, so these steps are for you to run
locally.

1. **Install dependencies**
   ```bash
   cd interview-copilot
   npm install
   ```

2. **Log in to Cloudflare**
   ```bash
   npx wrangler login
   ```
   This opens a browser window to authorize wrangler against your account.

3. **Deploy**
   ```bash
   npm run deploy
   ```
   Wrangler will provision the Worker, the Durable Object class, and enable
   the Workers AI binding automatically based on `wrangler.toml`. It prints
   a `*.workers.dev` URL when done — that's your live app.

4. **Try it locally first (optional)**
   ```bash
   npm run dev
   ```
   Workers AI calls work in local dev too (they run against the real Workers
   AI service, so you'll need to be logged in via `wrangler login` first).

5. **Push the code to a GitHub repo** and paste that repo URL into the
   application form's "Optional Assignment" field.

## About the "AI-assisted coding" prompt history note

The assignment says AI-assisted coding is encouraged but prompt history
needs to be submitted. This project's code was generated in a Claude
conversation — export or screenshot that conversation (or copy the relevant
prompts into a `PROMPTS.md` file in the repo) before you submit, since
that's what they're asking to see.

## Extending it further (optional, if you want to go beyond the minimum)

- Swap the plain-text chat for streaming responses (Workers AI supports
  streaming; the UI would need an `EventSource`/`ReadableStream` reader).
- Let the user upload their resume text so the skill-gap comparison is
  personalized instead of generic.
- Add a summary screen at the end scoring performance per skill, stored
  back into the Durable Object.
