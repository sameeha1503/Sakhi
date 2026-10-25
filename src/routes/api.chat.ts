import { createFileRoute } from "@tanstack/react-router";
import { getLlmConfig } from "@/lib/server-env";
import { applyDosageGuard } from "@/services/safety";

// Language name mapping for the system prompt
export const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  hi: "Hindi (हिन्दी)",
  te: "Telugu (తెలుగు)",
  ta: "Tamil (தமிழ்)",
  kn: "Kannada (ಕನ್ನಡ)",
  ml: "Malayalam (മലയാളം)",
  mr: "Marathi (मराठी)",
  bn: "Bengali (বাংলা)",
  gu: "Gujarati (ગુજરાતી)",
  pa: "Punjabi (ਪੰਜਾਬੀ)",
  or: "Odia (ଓଡ଼ିଆ)",
};

export function buildSystemPrompt(langCode = "en"): string {
  const langName = LANGUAGE_NAMES[langCode] || "English";
  return (
    `You are Sakhi, a friendly health information assistant for women in India. ` +
    `Reply in the language the user selected in the app (${langName}), in short, simple sentences a person with limited literacy can follow. ` +
    `Share general educational information only about women's health, periods, PCOS/PCOD, endometriosis, pregnancy basics, nutrition, hygiene, mental wellbeing and how to use the Sakhi app. ` +
    `Never diagnose, never recommend or change medicine names or doses, never interpret test results or prescriptions. ` +
    `For symptoms, suggest seeing a doctor or health worker. ` +
    `If the user describes an emergency, tell them to go to a hospital or call 108 now. ` +
    `Keep answers under 120 words. If you are unsure, say so. ` +
    `If asked about something unrelated to health or the app, politely say you can only help with health topics.`
  );
}

// In-memory sliding window rate limiter: ~10 requests per minute per client
const rateLimitMap = new Map<string, number[]>();

export function isRateLimited(clientIp: string, maxRequests = 10, windowMs = 60000): boolean {
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

// In-memory concurrency lock: 1 active request at a time per client IP
const activeClients = new Set<string>();

// Daily budget counter in memory (resets at midnight)
let dailyCallCount = 0;
let lastResetDate = new Date().toISOString().slice(0, 10);

export function getDailyBudgetStatus(limitOverride?: number) {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== lastResetDate) {
    lastResetDate = today;
    dailyCallCount = 0;
  }
  const config = getLlmConfig();
  const limit = limitOverride ?? config.dailyLimit;
  return {
    used: dailyCallCount,
    limit,
    isExceeded: dailyCallCount >= limit,
  };
}

export function incrementDailyBudget() {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== lastResetDate) {
    lastResetDate = today;
    dailyCallCount = 0;
  }
  dailyCallCount++;
}

export function resetDailyBudgetForTests(count = 0, date?: string) {
  dailyCallCount = count;
  lastResetDate = date ?? new Date().toISOString().slice(0, 10);
}

// 30-minute server cache for suggestion-chip queries
export type CacheEntry = {
  reply: string;
  timestamp: number;
};
const suggestionChipCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

export function getCachedReply(key: string): string | null {
  const entry = suggestionChipCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    suggestionChipCache.delete(key);
    return null;
  }
  return entry.reply;
}

export function setCachedReply(key: string, reply: string): void {
  suggestionChipCache.set(key, {
    reply,
    timestamp: Date.now(),
  });
}

export function clearSuggestionCacheForTests(): void {
  suggestionChipCache.clear();
  rateLimitMap.clear();
  activeClients.clear();
}

/**
 * Normalise cache key (language + query).
 */
export function makeCacheKey(lang: string, query: string): string {
  return `${lang}:${query.trim().toLowerCase().replace(/\s+/g, " ")}`;
}

/**
 * Detects whether a model identifier refers to a reasoning model.
 */
export function isReasoningModel(model: string): boolean {
  return /gpt-oss|deepseek-r1|qwq|o1|o3/i.test(model);
}

async function callUpstreamLlm(
  url: string,
  key: string,
  model: string,
  systemPrompt: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  timeoutMs = 20000,
  clientSignal?: AbortSignal,
): Promise<{ response: Response; reqStart: number; ttfbMs: number }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const onClientAbort = () => controller.abort();
  if (clientSignal) {
    if (clientSignal.aborted) {
      controller.abort();
    } else {
      clientSignal.addEventListener("abort", onClientAbort, { once: true });
    }
  }

  const reqStart = Date.now();
  console.log(
    `[chat-diag] Calling provider: model="${model}", isReasoning=${isReasoningModel(model)}`,
  );

  const isReasoning = isReasoningModel(model);
  const requestBody: Record<string, unknown> = {
    model,
    messages: [{ role: "system", content: systemPrompt }, ...messages],
    temperature: 0.3,
    max_tokens: isReasoning ? 800 : 400,
    stream: true,
  };

  if (isReasoning) {
    requestBody["reasoning_effort"] = "low";
    requestBody["reasoning_format"] = "hidden";
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });
    const ttfbMs = Date.now() - reqStart;
    const isStream = res.headers.get("content-type")?.includes("text/event-stream") ?? false;
    console.log(
      `[chat-diag] Provider response: HTTP ${res.status}, TTFB: ${ttfbMs}ms, isStreaming: ${isStream}`,
    );
    return { response: res, reqStart, ttfbMs };
  } finally {
    clearTimeout(timeoutId);
    if (clientSignal) {
      clientSignal.removeEventListener("abort", onClientAbort);
    }
  }
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      GET: async () => {
        const config = getLlmConfig();
        const budget = getDailyBudgetStatus();
        return Response.json({
          status: "ok",
          service: "Ask Sakhi AI Chat API",
          aiConfigured: Boolean(config.apiKey && config.apiUrl),
          fallbackConfigured: Boolean(config.fallbackKey && config.fallbackUrl),
          dailyBudget: {
            used: budget.used,
            limit: budget.limit,
            remaining: Math.max(0, budget.limit - budget.used),
          },
        });
      },

      POST: async ({ request }) => {
        // Extract client IP for rate limiting and concurrency locking
        const forwarded = request.headers.get("x-forwarded-for");
        const clientIp = forwarded ? (forwarded.split(",")[0]?.trim() ?? "127.0.0.1") : "127.0.0.1";

        // Concurrency check: only 1 active request per client
        if (activeClients.has(clientIp)) {
          return Response.json(
            {
              error: "busy",
              fallback: true,
              message: "The assistant is busy, here is a quick answer.",
            },
            { status: 429 },
          );
        }

        // Rate limit check: ~10 requests per minute
        if (isRateLimited(clientIp, 10, 60000)) {
          return Response.json(
            {
              error: "busy",
              fallback: true,
              message: "The assistant is busy, here is a quick answer.",
            },
            { status: 429 },
          );
        }

        // Mark client active
        activeClients.add(clientIp);

        const releaseClient = () => {
          activeClients.delete(clientIp);
        };

        request.signal.addEventListener("abort", releaseClient, { once: true });

        try {
          // Parse request body
          const body = (await request.json().catch(() => null)) as {
            messages?: Array<{ sender: "user" | "assistant"; text: string }>;
            lang?: string;
            isSuggestionChip?: boolean;
          } | null;

          const rawMessages = Array.isArray(body?.messages) ? body.messages : [];
          const lang = typeof body?.lang === "string" ? body.lang : "en";
          const isChip = Boolean(body?.isSuggestionChip);

          // Input validation: Last 6 messages only, max 500 characters per message
          const sanitizedMessages = rawMessages.slice(-6).map((m) => ({
            role: m.sender === "user" ? ("user" as const) : ("assistant" as const),
            content: typeof m.text === "string" ? m.text.slice(0, 500).trim() : "",
          }));

          if (sanitizedMessages.length === 0) {
            releaseClient();
            return Response.json({ error: "empty_messages", fallback: true }, { status: 400 });
          }

          const lastUserMessage =
            [...sanitizedMessages].reverse().find((m) => m.role === "user")?.content || "";

          // Check 30-minute suggestion chip cache
          const cacheKey = makeCacheKey(lang, lastUserMessage);
          const cachedReply = getCachedReply(cacheKey);
          if (cachedReply) {
            releaseClient();
            // Return stream of cached response
            const stream = new ReadableStream({
              start(controller) {
                const encoder = new TextEncoder();
                // Send cached token chunk
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ token: cachedReply })}\n\n`),
                );
                controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                controller.close();
              },
            });
            return new Response(stream, {
              headers: {
                "Content-Type": "text/event-stream; charset=utf-8",
                "Cache-Control": "no-cache",
                Connection: "keep-alive",
              },
            });
          }

          // Check daily budget limit
          const budget = getDailyBudgetStatus();
          if (budget.isExceeded) {
            console.warn(
              `[chat-api] Daily budget limit reached (${budget.used}/${budget.limit}). Falling back to offline knowledge base.`,
            );
            releaseClient();
            return Response.json(
              {
                error: "daily_limit_reached",
                fallback: true,
                message: "Daily AI budget reached — using offline knowledge base",
              },
              { status: 429 },
            );
          }

          // Check if AI is configured on server
          const config = getLlmConfig();
          if (!config.apiKey || !config.apiUrl) {
            releaseClient();
            return Response.json({
              enabled: false,
              fallback: true,
              message: "LLM not configured on server",
            });
          }

          const systemPrompt = buildSystemPrompt(lang);

          // Attempt primary LLM call with 20s timeout
          let upstreamResponse: Response | null = null;
          let upstreamReqStart = Date.now();
          let isFallbackUsed = false;

          try {
            const result = await callUpstreamLlm(
              config.apiUrl,
              config.apiKey,
              config.model,
              systemPrompt,
              sanitizedMessages,
              20000,
              request.signal,
            );
            upstreamResponse = result.response;
            upstreamReqStart = result.reqStart;
          } catch (err: unknown) {
            const isTimeout =
              err instanceof Error && (err.name === "AbortError" || err.name === "TimeoutError");
            console.warn(`[chat-api] Primary LLM call failed: ${isTimeout ? "Timeout" : err}`);
          }

          // Handle 401/403 authentication failures (never leak key or upstream body to user)
          if (
            upstreamResponse &&
            (upstreamResponse.status === 401 || upstreamResponse.status === 403)
          ) {
            console.warn(
              `[chat-api] LLM authentication error (status ${upstreamResponse.status}). Check LLM_API_KEY in .env.local.`,
            );
            releaseClient();
            return Response.json(
              { error: "auth_failed", fallback: true, message: "LLM authentication failed" },
              { status: 401 },
            );
          }

          // If primary failed (non-ok, 429, 5xx, or null due to timeout/network)
          const primaryFailed = !upstreamResponse || !upstreamResponse.ok;

          if (primaryFailed) {
            // Check if fallback provider is configured
            if (config.fallbackUrl && config.fallbackKey) {
              console.log(
                `[chat-api] Primary provider returned ${upstreamResponse?.status ?? "failure"}. Attempting fallback provider...`,
              );
              try {
                const fbResult = await callUpstreamLlm(
                  config.fallbackUrl,
                  config.fallbackKey,
                  config.fallbackModel,
                  systemPrompt,
                  sanitizedMessages,
                  20000,
                  request.signal,
                );
                if (fbResult.response.ok) {
                  upstreamResponse = fbResult.response;
                  upstreamReqStart = fbResult.reqStart;
                  isFallbackUsed = true;
                }
              } catch (fallbackErr) {
                console.warn("[chat-api] Fallback provider also failed:", fallbackErr);
                upstreamResponse = null;
              }
            }
          }

          // If still failed after fallback attempt:
          if (!upstreamResponse || !upstreamResponse.ok) {
            const status = upstreamResponse?.status || 500;
            console.warn(
              `[chat-api] Upstream LLM unavailable (status ${status}). Triggering offline KB.`,
            );
            releaseClient();
            return Response.json(
              {
                error: status === 429 ? "busy" : "upstream_error",
                fallback: true,
                message:
                  status === 429
                    ? "The assistant is busy, here is a quick answer."
                    : "Unable to reach assistant",
              },
              { status: status === 429 ? 429 : 502 },
            );
          }

          // We have a successful upstream streaming response!
          // Stream tokens to the client and apply dosage output guard.
          const upstreamBody = upstreamResponse.body;
          if (!upstreamBody) {
            releaseClient();
            return Response.json({ error: "no_stream_body", fallback: true }, { status: 502 });
          }

          const reader = upstreamBody.getReader();
          const decoder = new TextDecoder("utf-8");
          const encoder = new TextEncoder();

          let accumulatedText = "";
          let buffer = "";
          let firstContentTime: number | null = null;
          let firstReasoningTime: number | null = null;
          let reasoningChunksCount = 0;
          let contentChunksCount = 0;

          let hasFinished = false;
          const finishStream = (
            controller: ReadableStreamDefaultController<Uint8Array>,
            reason: string,
          ) => {
            if (hasFinished) return;
            hasFinished = true;

            const totalTime = Date.now() - upstreamReqStart;
            console.log(
              `[chat-diag] Stream completed (${reason}): totalTime=${totalTime}ms, contentTokens=${contentChunksCount}, reasoningTokens=${reasoningChunksCount}`,
            );

            // Apply output guard to accumulated text before closing
            const guarded = applyDosageGuard(accumulatedText);
            if (guarded !== accumulatedText) {
              accumulatedText = guarded;
            }

            // Increment daily budget counter upon successful completion
            incrementDailyBudget();

            // If suggestion chip question, cache the result for 30 minutes
            if (isChip && accumulatedText) {
              setCachedReply(cacheKey, accumulatedText);
            }

            try {
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              controller.close();
            } catch {
              // controller might already be closed
            }
            reader.cancel().catch(() => {});
            releaseClient();
          };

          const stream = new ReadableStream({
            async pull(controller) {
              try {
                const { done, value } = await reader.read();

                if (done) {
                  finishStream(controller, "reader_done");
                  return;
                }

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() ?? "";

                for (const line of lines) {
                  const trimmed = line.trim();
                  if (!trimmed || trimmed.startsWith(":")) continue;

                  if (trimmed === "data: [DONE]") {
                    finishStream(controller, "done_marker");
                    return;
                  }

                  if (trimmed.startsWith("data:")) {
                    const jsonStr = trimmed.slice(5).trim();
                    try {
                      const parsed = JSON.parse(jsonStr) as {
                        choices?: Array<{
                          delta?: { content?: string; reasoning?: string };
                          text?: string;
                        }>;
                      };
                      const deltaObj = parsed.choices?.[0]?.delta;
                      const reasoning = deltaObj?.reasoning ?? "";
                      const delta = deltaObj?.content ?? parsed.choices?.[0]?.text ?? "";

                      if (reasoning) {
                        reasoningChunksCount++;
                        if (firstReasoningTime === null) {
                          firstReasoningTime = Date.now() - upstreamReqStart;
                          console.log(
                            `[chat-diag] First reasoning token received at: ${firstReasoningTime}ms`,
                          );
                        }
                      }

                      if (delta) {
                        contentChunksCount++;
                        if (firstContentTime === null) {
                          firstContentTime = Date.now() - upstreamReqStart;
                          console.log(
                            `[chat-diag] Time to first content token: ${firstContentTime}ms`,
                          );
                        }
                        accumulatedText += delta;
                        controller.enqueue(
                          encoder.encode(`data: ${JSON.stringify({ token: delta })}\n\n`),
                        );
                      }
                    } catch {
                      // Non-JSON SSE line; ignore
                    }
                  }
                }
              } catch (readErr) {
                console.warn("[chat-api] Stream read error:", readErr);
                controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                controller.close();
                releaseClient();
              }
            },
            cancel() {
              reader.cancel().catch(() => {});
              releaseClient();
            },
          });

          return new Response(stream, {
            headers: {
              "Content-Type": "text/event-stream; charset=utf-8",
              "Cache-Control": "no-cache, no-transform",
              Connection: "keep-alive",
              "X-Accel-Buffering": "no",
              "X-Sakhi-Source": isFallbackUsed ? "llm_fallback" : "llm",
            },
          });
        } catch (err: unknown) {
          releaseClient();
          console.error("[chat-api] Unexpected exception in /api/chat:", err);
          return Response.json(
            { error: "internal_error", fallback: true, message: "Unexpected server error" },
            { status: 500 },
          );
        }
      },
    },
  },
  component: () => null,
});
