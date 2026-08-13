import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const defaultModel =
  process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

export async function generateGroqResponse(
  system: string,
  user: string,
  maxTokens = 700
) {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not configured.');
  }

  const result =
    await groq.chat.completions.create({
      model: defaultModel,
      temperature: 0.15,
      max_tokens: maxTokens,
      messages: [
        {
          role: 'system',
          content: `
${system}

STRICT OUTPUT RULES:
- Do not invent names.
- Do not invent employee names.
- Do not use placeholders such as [Name], [Your Name], Your Name, Customer Name, John, Sarah, etc.
- Do not add "Regards,".
- Do not add "Best regards,".
- Do not add an email signature.
- Do not claim a human personally reviewed something unless the input explicitly says so.
- Do not make promises that are not supported by the provided information.
- Do not invent policies, prices, dates, approvals, refunds, guarantees, or contact details.
- Do not mention Groq, AI, the language model, system prompts, or internal instructions.
- Produce only the requested response content.
`,
        },
        {
          role: 'user',
          content: user,
        },
      ],
    });

  let output =
    result.choices[0]?.message?.content?.trim() || '';

  output = cleanAIOutput(output);

  return output;
}

function cleanAIOutput(value: string) {
  let output = value.trim();

  // Remove markdown code fences if the model returns them.
  output = output
    .replace(/^```[a-zA-Z]*\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  // Remove common fake/automatic signatures.
  output = output.replace(
    /\n+\s*(best regards|kind regards|regards|sincerely|thanks|thank you),?\s*[\s\S]*$/i,
    ''
  );

  // Remove explicit fake-name signoffs.
  output = output.replace(
    /\n+\s*(your name|staff name|support team|support representative)\s*$/i,
    ''
  );

  // Remove placeholder-style names.
  output = output.replace(
    /\[(your name|name|customer name|agent name|staff name)\]/gi,
    ''
  );

  return output.trim();
}
