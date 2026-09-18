export { InterviewSession } from "./interviewSession.js";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Start a new interview session; returns a session ID the client stores.
    if (url.pathname === "/api/session" && request.method === "POST") {
      const id = env.SESSIONS.newUniqueId();
      return json({ sessionId: id.toString() });
    }

    // Send a chat message into a session's Durable Object, which runs the workflow.
    if (url.pathname === "/api/chat" && request.method === "POST") {
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: "Invalid JSON body" }, 400);
      }

      const { sessionId, message } = body;
      if (!sessionId || typeof message !== "string" || !message.trim()) {
        return json({ error: "Missing sessionId or message" }, 400);
      }

      let id;
      try {
        id = env.SESSIONS.idFromString(sessionId);
      } catch {
        return json({ error: "Invalid sessionId" }, 400);
      }

      const stub = env.SESSIONS.get(id);
      const doResponse = await stub.fetch("https://session/chat", {
        method: "POST",
        body: JSON.stringify({ message }),
        headers: { "content-type": "application/json" },
      });
      return doResponse;
    }

    if (url.pathname === "/api/reset" && request.method === "POST") {
      const { sessionId } = await request.json();
      if (!sessionId) return json({ error: "Missing sessionId" }, 400);
      const id = env.SESSIONS.idFromString(sessionId);
      const stub = env.SESSIONS.get(id);
      return stub.fetch("https://session/reset", { method: "POST" });
    }

    // Everything else: serve the static chat UI from /public.
    return env.ASSETS.fetch(request);
  },
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}
