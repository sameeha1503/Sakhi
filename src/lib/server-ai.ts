// Shared server-side AI helper for OpenAI-compatible and Anthropic endpoints
// Server-side only: never expose API keys or upstream error bodies to the browser

export type UpstreamRequestOptions = {
  provider: "openai" | "anthropic";
  apiUrl: string;
  apiKey: string;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  image?: {
    data: string; // base64
    mediaType: "image/jpeg" | "image/png" | "image/webp";
  };
  timeoutMs?: number;
};

export type UpstreamResult = {
  text: string;
  status: number;
  errorBody?: string;
};

/**
 * Returns current YYYY-MM-DD in America/Los_Angeles timezone.
 */
export function getPacificDateString(date = new Date()): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Los_Angeles",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

/**
 * Calls an upstream OpenAI-compatible or Anthropic LLM endpoint with JSON mode and timeout.
 */
export async function callUpstreamChat(options: UpstreamRequestOptions): Promise<UpstreamResult> {
  const {
    provider,
    apiUrl,
    apiKey,
    model,
    systemPrompt,
    userPrompt,
    image,
    timeoutMs = 20000,
  } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let response: Response;

    if (provider === "anthropic") {
      const userContent: Array<
        | { type: "text"; text: string }
        | {
            type: "image";
            source: {
              type: "base64";
              media_type: "image/jpeg" | "image/png" | "image/webp";
              data: string;
            };
          }
      > = [];

      if (image) {
        userContent.push({
          type: "image",
          source: {
            type: "base64",
            media_type: image.mediaType,
            data: image.data,
          },
        });
      }
      userContent.push({
        type: "text",
        text: userPrompt,
      });

      response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model,
          max_tokens: 4096,
          temperature: 0,
          system: systemPrompt,
          messages: [
            {
              role: "user",
              content: userContent,
            },
          ],
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        return { text: "", status: response.status, errorBody: errText };
      }

      const data = (await response.json()) as { content?: Array<{ type: string; text?: string }> };
      const text = data.content?.find((c) => c.type === "text")?.text || "";
      return { text, status: 200 };
    }

    // Default: OpenAI-compatible endpoint (Google Gemini / OpenAI)
    const userContent = image
      ? [
          { type: "text", text: userPrompt },
          {
            type: "image_url",
            image_url: {
              url: `data:${image.mediaType};base64,${image.data}`,
            },
          },
        ]
      : userPrompt;

    response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: userContent,
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      return { text: "", status: response.status, errorBody: errText };
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = data.choices?.[0]?.message?.content || "";
    return { text, status: 200 };
  } finally {
    clearTimeout(timeoutId);
  }
}
