export const dynamic = 'force-dynamic';

const textResponse = (body: string, status: number) =>
  new Response(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });

export async function GET(request: Request) {
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN?.trim();
  const params = new URL(request.url).searchParams;
  const mode = params.get('hub.mode');
  const token = params.get('hub.verify_token');
  const challenge = params.get('hub.challenge');

  if (
    verifyToken &&
    mode === 'subscribe' &&
    token === verifyToken &&
    challenge
  ) {
    return textResponse(challenge, 200);
  }

  return textResponse('Forbidden', 403);
}

export async function POST() {
  return textResponse('EVENT_RECEIVED', 200);
}
