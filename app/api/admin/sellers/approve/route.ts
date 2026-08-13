import { randomBytes, createHash } from 'crypto';
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireAdmin } from '@/lib/server-auth';
import { sendSellerInvitationEmail } from '@/lib/server-mail';

function hashToken(token: string) {
  return createHash('sha256')
    .update(token.trim())
    .digest('hex');
}

export async function POST(request: Request) {
  try {
    await requireAdmin(request);

    const body = await request.json();
    const applicationId = String(body.applicationId || '').trim();

    if (!applicationId) {
      return NextResponse.json(
        { error: 'Application ID is required.' },
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
        { error: 'Application is missing seller contact information.' },
        { status: 400 }
      );
    }

    // Generate a fresh token every time.
    const token = randomBytes(32).toString('hex');
    const tokenHash = hashToken(token);

    const expiresAt = Date.now() + 48 * 60 * 60 * 1000;

    await adminDb
      .ref(`sellerApplications/${applicationId}`)
      .update({
        status: 'invited',
        invitationTokenHash: tokenHash,
        invitationExpires: expiresAt,
        invitationUsedAt: null,
        updatedAt: Date.now(),
      });

    const baseUrl = (
      process.env.APP_URL || 'http://localhost:3000'
    ).replace(/\/+$/, '');

    const invitationUrl =
      `${baseUrl}/seller/activate?token=${token}`;

    await sendSellerInvitationEmail(
      application.email,
      application.fullName,
      invitationUrl
    );

    return NextResponse.json({
      success: true,
      invitationUrl,
      expiresAt,
    });
  } catch (error) {
    console.error('Seller invitation error:', error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unable to send seller invitation.',
      },
      { status: 500 }
    );
  }
}