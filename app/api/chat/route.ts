import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { generateGroqResponse } from '@/lib/server-groq';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const messages = Array.isArray(body.messages)
      ? body.messages
      : [];

    if (messages.length === 0) {
      return NextResponse.json(
        { error: 'No messages provided.' },
        { status: 400 }
      );
    }

    const limited = messages
      .slice(-12)
      .map((message: any) => ({
        role:
          message.role === 'assistant'
            ? 'assistant'
            : 'user',
        content: String(message.content || '').slice(0, 3000),
      }));

    const [companySnapshot, faqSnapshot] = await Promise.all([
      adminDb.ref('site/settings/company').get(),
      adminDb.ref('faqs').get(),
    ]);

    const company = companySnapshot.exists()
      ? companySnapshot.val()
      : {};

    const faqs = faqSnapshot.exists()
      ? faqSnapshot.val()
      : {};

    const faqContext = Object.values(faqs)
      .slice(0, 30)
      .map((faq: any) => (
        `Q: ${faq.question}\nA: ${faq.answer}`
      ))
      .join('\n\n');

    const system = `
You are the Auronix Commerce LLC website assistant.

Company:
${company.companyName || 'Auronix Commerce LLC'}

Tagline:
${company.tagline || ''}

Approved FAQ information:
${faqContext}

Rules:
- Use only approved information.
- Never invent company facts.
- Never invent statistics.
- Never claim official Amazon, Walmart, eBay, or brand authorization unless explicitly provided.
- Never approve or reject a seller.
- Never make legal, tax, financial, or regulatory decisions.
- If you do not know something, say so.
- Be concise, professional, and helpful.
- When a visitor needs a human response, suggest contacting Auronix support.
`;

    const result = await generateGroqResponse(
      system,
      JSON.stringify(limited),
      700
    );

    return NextResponse.json({
      success: true,
      response: result,
    });
  } catch (error) {
    console.error('Chat API failed:', error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unable to respond.',
      },
      { status: 500 }
    );
  }
}
