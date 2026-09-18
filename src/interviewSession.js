const MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

const DEFAULT_STATE = () => ({
  stage: "awaiting_jd", // awaiting_jd -> interviewing
  jobDescription: "",
  keySkills: [],
  askedQuestions: [],
  history: [],
});

export class InterviewSession {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/reset" && request.method === "POST") {
      await this.state.storage.put("data", DEFAULT_STATE());
      return json({ ok: true });
    }

    if (url.pathname !== "/chat" || request.method !== "POST") {
      return json({ error: "Not found" }, 404);
    }

    const { message } = await request.json();
    const data = (await this.state.storage.get("data")) || DEFAULT_STATE();

    data.history.push({ role: "user", content: message });

    let reply;

    if (data.stage === "awaiting_jd") {
      reply = await this.startInterview(data, message);
    } else {
      reply = await this.continueInterview(data, message);
    }

    data.history.push({ role: "assistant", content: reply });
    await this.state.storage.put("data", data);

    return json({
      reply,
      stage: data.stage,
      skillsIdentified: data.keySkills,
      questionsAsked: data.askedQuestions.length,
    });
  }

  // Step 1: treat the first user message as a job description. Extract the
  // key skills the role needs, then kick off with the first question.
  async startInterview(data, jobDescription) {
    data.jobDescription = jobDescription;

    const extraction = await this.env.AI.run(MODEL, {
      messages: [
        {
          role: "system",
          content:
            "You extract the 5 to 8 most important technical skills or requirements from a job description. " +
            "Respond with ONLY a comma-separated list, no numbering, no extra commentary.",
        },
        { role: "user", content: jobDescription },
      ],
    });

    data.keySkills = extraction.response
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (data.keySkills.length === 0) {
      data.keySkills = ["general software engineering experience"];
    }

    data.stage = "interviewing";

    const firstQuestion = await this.nextQuestion(data);
    return (
      `Thanks! Based on that job description, I'll focus on: ${data.keySkills.join(", ")}.\n\n` +
      `Let's begin.\n\n${firstQuestion}`
    );
  }

  // Step 2+: evaluate the answer to the previous question, then ask the next one.
  async continueInterview(data, answer) {
    const lastQuestion = data.askedQuestions[data.askedQuestions.length - 1];

    const feedback = await this.env.AI.run(MODEL, {
      messages: [
        {
          role: "system",
          content:
            "You are a friendly but rigorous technical interview coach. In 2-3 sentences, give specific, " +
            "constructive feedback on the candidate's answer. Be encouraging but honest about gaps or missing depth.",
        },
        {
          role: "user",
          content: `Interview question: ${lastQuestion}\n\nCandidate's answer: ${answer}`,
        },
      ],
    });

    if (data.askedQuestions.length >= data.keySkills.length * 2) {
      return `${feedback.response}\n\nThat covers all the key areas from this job description pretty thoroughly. Nice work — paste a new job description any time to start a fresh session.`;
    }

    const next = await this.nextQuestion(data);
    return `${feedback.response}\n\n${next}`;
  }

  // Generates one question targeting the next skill in rotation, avoiding
  // repeats by tracking everything already asked in this session's memory.
  async nextQuestion(data) {
    const skill = data.keySkills[data.askedQuestions.length % data.keySkills.length];

    const q = await this.env.AI.run(MODEL, {
      messages: [
        {
          role: "system",
          content:
            "You generate one focused, realistic technical interview question for a software engineering " +
            "candidate, targeting a specific skill. Ask only the question itself, no preamble, no numbering.",
        },
        {
          role: "user",
          content:
            `Skill to probe: ${skill}\n\n` +
            (data.askedQuestions.length
              ? `Questions already asked this session (do not repeat): ${data.askedQuestions.join(" | ")}`
              : "This is the first question of the session."),
        },
      ],
    });

    const question = q.response.trim();
    data.askedQuestions.push(question);
    return question;
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}
