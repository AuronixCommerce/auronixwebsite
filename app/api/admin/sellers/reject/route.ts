import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireAdmin } from '@/lib/server-auth';
import { generateGroqResponse } from '@/lib/server-groq';
import { sendSellerRejectionEmail } from '@/lib/server-mail';

export async function POST(request: Request) {
  try {
    await requireAdmin(request);

    const body = await request.json();

    const applicationId = String(body.applicationId || '').trim();
    const reason = String(body.reason || '').trim();

    if (!applicationId || !reason) {
      return NextResponse.json(
        {
          error:
            'Application ID and rejection reason are required.',
        },
        { status: 400 }
      );
    }

    const snapshot = await adminDb
      .ref(`sellerApplications/${applicationId}`)
      .get();

    if (!snapshot.exists()) {
      return NextResponse.json(
        { error: 'Seller application not found.' },
        { status: 404 }
      );
    }

    const application = snapshot.val();

    if (!application.email || !application.fullName) {
      return NextResponse.json(
        {
          error:
            'Seller application does not contain a valid email/name.',
        },
        { status: 400 }
      );
    }

    const system = `
You are the professional communications assistant for Auronix Commerce LLC.

Rewrite an internal seller-application rejection reason into a respectful,
clear, professional email explanation.

Rules:
- Do not be insulting or accusatory.
- Do not invent facts.
- Preserve the actual reason supplied by the administrator.
- Clearly explain what the applicant should improve before applying again.
- Do not guarantee future approval.
- Do not make legal conclusions.
- Encourage the applicant to correct the issue and reapply if appropriate.
`;

    const prompt = `
Applicant name: ${application.fullName}

Business:
${application.businessName || ''}

Administrator's rejection reason:
${reason}

Write a concise professional explanation for the applicant.
`;

    const aiReason = await generateGroqResponse(
      system,
      prompt,
      500
    );

    const applyUrl = `${
      process.env.APP_URL || 'http://localhost:3000'
    }/seller/apply?reapply=true`;

    await sendSellerRejectionEmail(
      application.email,
      application.fullName,
      aiReason,
      applyUrl
    );

    // Delete only after successful email delivery.
    await adminDb
      .ref(`sellerApplications/${applicationId}`)
      .remove();

    return NextResponse.json({
      success: true,
      message:
        'Applicant notified and application removed.',
    });
  } catch (error) {
    console.error('Seller rejection failed:', error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unable to reject seller application.',
      },
      { status: 500 }
    );
  }
}
