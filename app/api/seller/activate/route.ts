import { createHash } from 'crypto';
import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

function hashToken(token: string) {
  return createHash('sha256')
    .update(token.trim())
    .digest('hex');
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const rawToken = String(body.token || '');
    const token = decodeURIComponent(rawToken).trim();
    const password = String(body.password || '');

    if (!token) {
      return NextResponse.json(
        { error: 'Invitation token is missing.' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters.' },
        { status: 400 }
      );
    }

    const tokenHash = hashToken(token);

    const snapshot = await adminDb
      .ref('sellerApplications')
      .get();

    if (!snapshot.exists()) {
      return NextResponse.json(
        { error: 'No seller applications found.' },
        { status: 404 }
      );
    }

    const applications = snapshot.val();

    let applicationId: string | null = null;
    let application: any = null;

    for (const [id, value] of Object.entries(applications)) {
      const candidate = value as any;

      if (
        candidate?.invitationTokenHash &&
        String(candidate.invitationTokenHash) === tokenHash
      ) {
        applicationId = id;
        application = candidate;
        break;
      }
    }

    if (!applicationId || !application) {
      return NextResponse.json(
        {
          error:
            'Invalid invitation. Please use the newest invitation email.',
        },
        { status: 400 }
      );
    }

    const expires = Number(application.invitationExpires || 0);

    if (!expires) {
      return NextResponse.json(
        { error: 'This invitation has no valid expiration.' },
        { status: 400 }
      );
    }

    if (Date.now() >= expires) {
      return NextResponse.json(
        {
          error:
            'This invitation has expired. Please ask Auronix to send a new invitation.',
        },
        { status: 400 }
      );
    }

    if (application.invitationUsedAt) {
      return NextResponse.json(
        { error: 'This invitation has already been used.' },
        { status: 400 }
      );
    }

    if (
      application.status !== 'approved' &&
      application.status !== 'invited'
    ) {
      return NextResponse.json(
        {
          error:
            'This seller application is not currently eligible for activation.',
        },
        { status: 400 }
      );
    }

    // Make sure a Firebase Auth account doesn't already exist.
    try {
      await adminAuth.getUserByEmail(application.email);

      return NextResponse.json(
        {
          error:
            'An account already exists for this email. Please use Seller Login.',
        },
        { status: 409 }
      );
    } catch (error: any) {
      if (error?.code !== 'auth/user-not-found') {
        throw error;
      }
    }

    const user = await adminAuth.createUser({
      email: application.email,
      password,
      displayName: application.fullName,
      emailVerified: false,
    });

    await adminAuth.setCustomUserClaims(user.uid, {
      role: 'seller',
    });

    const now = Date.now();

    await adminDb.ref(`users/${user.uid}`).set({
      uid: user.uid,
      email: application.email,
      displayName: application.fullName,
      name: application.fullName,
      businessName: application.businessName || '',
      sellerApplicationId: applicationId,
      role: 'seller',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    });

    await adminDb
      .ref(`sellerApplications/${applicationId}`)
      .update({
        status: 'active',
        invitationUsedAt: now,
        invitationTokenHash: null,
        invitationExpires: null,
        updatedAt: now,
      });

    return NextResponse.json({
      success: true,
      uid: user.uid,
    });
  } catch (error) {
    console.error('Seller activation failed:', error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unable to create seller account.',
      },
      { status: 500 }
    );
  }
}