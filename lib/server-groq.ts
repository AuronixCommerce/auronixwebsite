import Groq from "groq-sdk";

const GROQ_API_KEY = process.env.GROQ_API_KEY?.trim() || "";

const GROQ_MODEL = process.env.GROQ_MODEL?.trim() || "openai/gpt-oss-120b";

if (!GROQ_API_KEY) {
  console.warn("[Auronix AI] GROQ_API_KEY is not configured.");
}

const groq = new Groq({
  timeout: 15000,
  maxRetries: 0,
  apiKey: GROQ_API_KEY,
});

export async function generateGroqResponse(
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 1000,
): Promise<string> {
  if (!GROQ_API_KEY) {
    throw new Error(
      "GROQ_API_KEY is not configured. Add GROQ_API_KEY to .env.local and restart Next.js.",
    );
  }

  if (!systemPrompt.trim()) {
    throw new Error("AI system prompt is empty.");
  }

  if (!userPrompt.trim()) {
    throw new Error("AI user prompt is empty.");
  }

  try {
    const request = async (reasoningEffort: "low" | "medium") =>
      groq.chat.completions.create({
        model: GROQ_MODEL,

        messages: [
          {
            role: "system",

            content: systemPrompt,
          },

          {
            role: "user",

            content: userPrompt,
          },
        ],

        temperature: 0.35,

        max_completion_tokens: Math.min(Math.max(maxTokens, 2000), 4000),

        /*
         * GPT-OSS supports low/medium/high
         * reasoning on Groq. A smaller reasoning budget reserves room for structured screening output.
         */
        ...(/gpt-oss/i.test(GROQ_MODEL)
          ? { reasoning_effort: reasoningEffort, include_reasoning: false }
          : {}),

        /*
         * Keep reasoning hidden from visitors.
         */
      });

    let completion = await request("low");

    let content = completion.choices?.[0]?.message?.content;

    // A reasoning model can occasionally spend its entire completion budget
    // before emitting final content. Retry once with a smaller reasoning budget
    // instead of surfacing a misleading empty-response error to the admin.
    if (typeof content !== "string" || !content.trim()) {
      completion = await request("medium");
      content = completion.choices?.[0]?.message?.content;
    }

    if (typeof content !== "string" || !content.trim()) {
      throw new Error("Groq returned an empty AI response.");
    }

    return content.trim();
  } catch (error) {
    console.error("[Auronix AI] Groq request failed:", error);

    if (error instanceof Error) {
      throw new Error(`AI service request failed: ${error.message}`);
    }

    throw new Error("AI service request failed.");
  }
}

export function getGroqModel(): string {
  return GROQ_MODEL;
}

export function isGroqConfigured(): boolean {
  return Boolean(GROQ_API_KEY);
}
