import { userFacingError } from '@/lib/user-facing-error';
import { NextResponse } from 'next/server';

import { requireAdmin } from '@/lib/server-auth';

import {
  generateGroqResponse,
} from '@/lib/server-groq';

function text(
  value: unknown
): string {
  return typeof value === 'string'
    ? value.trim()
    : '';
}

function parseJson(
  value: string
) {
  const cleaned =
    value
      .replace(
        /^```json/i,
        ''
      )
      .replace(
        /^```/i,
        ''
      )
      .replace(
        /```$/i,
        ''
      )
      .trim();

  return JSON.parse(
    cleaned
  );
}

export async function POST(
  request: Request
) {
  try {
    await requireAdmin(
      request
    );

    const body =
      await request.json();

    const page =
      text(body.page);

    const title =
      text(body.pageTitle);

    const incident =
      text(body.incident);

    const prompt = `
You are the customer communications assistant
for Auronix Commerce LLC.

Create a professional website maintenance message.

Never expose:
- internal code
- stack traces
- frameworks
- databases
- APIs
- server names
- developer terminology
- security details

Do not invent a recovery time.

Return JSON only:

{
  "title": "short title",
  "message": "professional visitor-facing message"
}
`;

    const userPrompt = `
Page:
${title}

Path:
${page}

Incident information:
${incident || 'Temporary maintenance.'}
`;

    const raw =
      await generateGroqResponse(
        prompt,
        userPrompt,
        500
      );

    const result =
      parseJson(
        raw
      );

    return NextResponse.json({
      success: true,

      title:
        text(result.title),

      message:
        text(result.message),
    });
  } catch (error) {
    console.error(
      'AI page message generation failed:',
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? userFacingError(error)
            : 'Unable to generate message.',
      },
      { status: 500 }
    );
  }
}
