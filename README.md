# Interview Prep Coach

**Live demo:** https://interview-prep-coach.sreeyarudrangi.workers.dev

I built this for the optional take-home assignment on Cloudflare's application. Instead of doing something generic, I wanted to make something I'd actually use  so this is a little interview prep tool. You paste in a job description, and it pulls out the skills the role actually cares about, then quizzes you on them one at a time, giving feedback as you go.

It runs entirely on Cloudflare's own stack, which felt like the right way to show I can actually build on their platform instead of just talking about it.

## How it's put together

- **LLM** – Llama 3.3 through Workers AI
- **Workflow** – A Durable Object runs the actual multi-step logic: pull out the skills from the JD, ask a question, evaluate the answer, ask the next one, repeat until every skill's been covered
- **Chat interface** – A small HTML page served straight from the Worker, no frameworks
- **Memory** – Each conversation gets its own Durable Object, so it remembers everything — the job description, every question it's already asked (so it doesn't repeat itself), the whole back-and-forth

## What's in here
interview-copilot/
├── wrangler.toml # Worker + Durable Object + Workers AI + assets config
├── package.json
├── src/
│ ├── index.js # entry point — routes requests, serves the UI
│ └── interviewSession.js # the actual logic — this is where the workflow lives
└── public/
└── index.html # the chat page itself

## Running it yourself

1. Clone this repo and go into it
2. `npm install`
3. `npx wrangler login` (needs a Cloudflare account — free tier is fine)
4. `npm run deploy`

That last command spins up the Worker, the Durable Object, and the Workers AI binding, and gives you a `*.workers.dev` link when it's done.

Wanted to try it locally first? `npm run dev` works too, though Workers AI calls still hit the real service even in dev mode.

## A note on how this was built

I used Claude to help write this  mostly the Worker/Durable Object code and getting the deploy set up, since I hadn't touched Cloudflare's Durable Objects before. I went through it line by line and understood what it was doing rather than just copy pasting, and I ran into (and fixed) a couple of real deployment issues along the way  the free plan needing SQLite-backed Durable Objects instead of the older kind, and needing a workers.dev subdomain set up before the first deploy would go through. Prompt history is included per the assignment's request.

## If I had more time

A few things I'd add:
- Let people upload their actual resume so the questions are personalized instead of generic
- Stream the responses instead of waiting for the whole answer
- Score performance per skill at the end of a session, not just give feedback question by question
