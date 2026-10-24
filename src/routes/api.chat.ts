import { createFileRoute } from "@tanstack/react-router";

// In-memory sliding window rate limiter: ~10 requests per minute per client
const rateLimitMap = new Map<string, number[]>();

function isRateLimited(clientIp: string, maxRequests = 10, windowMs = 60000): boolean {
  const now = Date.now();
  const history = rateLimitMap.get(clientIp) || [];
  const recent = history.filter((timestamp) => now - timestamp < windowMs);

  if (recent.length >= maxRequests) {
    rateLimitMap.set(clientIp, recent);
    return true;
  }

  recent.push(now);
  rateLimitMap.set(clientIp, recent);
  return false;
}

const SYSTEM_PROMPT =
  "You are Sakhi, a friendly health information assistant for women in India. Reply in the user's selected language in short, simple sentences. Share general educational information only. Never diagnose, never recommend or change medicine doses, never interpret test results. For symptoms, suggest seeing a doctor or health worker. If the user describes an emergency, tell them to go to a hospital or call 108 now. Keep answers under 120 words. If you are unsure, say so.";

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      GET: async () => {
        return Response.json({
          status: "ok",
          service: "Ask Sakhi API",
          aiEnabled: Boolean(process.env["LLM_API_KEY"] && process.env["LLM_API_URL"]),
        });
      },
      POST: async ({ request }) => {
        // Extract client IP for rate limiting
        const forwarded = request.headers.get("x-forwarded-for");
        const clientIp = forwarded ? (forwarded.split(",")[0]?.trim() ?? "127.0.0.1") : "127.0.0.1";

        if (isRateLimited(clientIp, 10, 60000)) {
          return Response.json(
            {
              error: "rate_limited",
              fallback: true,
              message: "Too many requests. Please wait a minute.",
            },
            { status: 429 },
          );
        }

        const apiKey = process.env["LLM_API_KEY"];
        const apiUrl = process.env["LLM_API_URL"];

        // If no API key or URL configured, signal client to use Mode 1 knowledge base
        if (!apiKey || !apiUrl) {
          return Response.json({
            enabled: false,
            fallback: true,
            message: "LLM not configured on server",
          });
        }

        try {
          const body = (await request.json()) as {
            messages?: Array<{ sender: "user" | "assistant"; text: string }>;
            lang?: string;
          };

          const rawMessages = Array.isArray(body?.messages) ? body.messages : [];
          // Input validation: Last 6 messages only, max 500 characters per message
          const sanitizedMessages = rawMessages.slice(-6).map((m) => ({
            role: m.sender === "user" ? ("user" as const) : ("assistant" as const),
            content: typeof m.text === "string" ? m.text.slice(0, 500).trim() : "",
          }));

          if (sanitizedMessages.length === 0) {
            return Response.json({ error: "empty_messages", fallback: true }, { status: 400 });
          }

          // Call LLM with 15-second timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000);

          const modelName = process.env["LLM_MODEL"] || "gpt-4o-mini";

          const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: modelName,
              messages: [
                {
                  role: "system",
                  content: `${SYSTEM_PROMPT}${
                    body.lang ? `\nPlease reply in the user's language (code: ${body.lang}).` : ""
                  }`,
                },
                ...sanitizedMessages,
              ],
              max_tokens: 250,
              temperature: 0.3,
            }),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            console.warn(`[chat-api] LLM endpoint responded with status ${response.status}`);
            return Response.json(
              { error: "llm_upstream_error", fallback: true },
              { status: response.status },
            );
          }

          const data = (await response.json()) as {
            choices?: Array<{ message?: { content?: string } }>;
            text?: string;
          };

          const replyText = data?.choices?.[0]?.message?.content?.trim() || data?.text?.trim();

          if (!replyText) {
            return Response.json({ error: "no_reply", fallback: true });
          }

          return Response.json({
            text: replyText,
            source: "llm",
          });
        } catch (err: unknown) {
          const isTimeout =
            err instanceof Error && (err.name === "AbortError" || err.name === "TimeoutError");
          console.warn("[chat-api] Request failed:", isTimeout ? "Timeout" : err);
          return Response.json(
            { error: isTimeout ? "timeout" : "network_error", fallback: true },
            { status: isTimeout ? 504 : 500 },
          );
        }
      },
    },
  },
  // Dummy component so client routing never errors if invoked
  component: () => null,
});
