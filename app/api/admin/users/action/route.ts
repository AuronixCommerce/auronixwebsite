import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { requireAdmin } from '@/lib/server-auth';

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin(request);
    const body = await request.json();

    const action = String(body.action || '');
    const uid = String(body.uid || '').trim();

    if (!uid) {
      return NextResponse.json(
        { error: 'User UID is required.' },
        { status: 400 }
      );
    }

    if (uid === admin.uid) {
      return NextResponse.json(
        {
          error:
            'You cannot restrict, delete, or reset your own admin account from this page.',
        },
        { status: 400 }
      );
    }

    const userRecord = await adminAuth.getUser(uid);

    switch (action) {
      case 'temporary-ban': {
        const durationMinutes = Number(
          body.durationMinutes
        );

        if (
          !Number.isFinite(durationMinutes) ||
          durationMinutes <= 0
        ) {
          return NextResponse.json(
            { error: 'Invalid temporary-ban duration.' },
            { status: 400 }
          );
        }

        const bannedUntil =
          Date.now() + durationMinutes * 60 * 1000;

        // IMPORTANT:
        // Do NOT disable Firebase Authentication.
        // The application needs the user to sign in so
        // it can display the custom restriction screen.
        await adminDb.ref(`users/${uid}`).update({
          banned: true,
          bannedUntil,
          bannedAt: Date.now(),
          banReason: String(body.reason || '').trim(),
          status: 'temporarily_banned',
          updatedAt: Date.now(),
        });

        return NextResponse.json({
          success: true,
          action,
          bannedUntil,
        });
      }

      case 'permanent-ban': {
        // Do NOT disable Firebase Authentication.
        // Keep login possible so the app can show the
        // custom permanent restriction page.
        await adminDb.ref(`users/${uid}`).update({
          banned: true,
          bannedUntil: null,
          bannedAt: Date.now(),
          banReason: String(body.reason || '').trim(),
          status: 'permanently_banned',
          updatedAt: Date.now(),
        });

        return NextResponse.json({
          success: true,
          action,
        });
      }

      case 'unban': {
        await adminDb.ref(`users/${uid}`).update({
          banned: false,
          bannedUntil: null,
          bannedAt: null,
          banReason: null,
          status: 'active',
          updatedAt: Date.now(),
        });

        return NextResponse.json({
          success: true,
          action,
        });
      }

      case 'delete': {
        await adminAuth.deleteUser(uid);
        await adminDb.ref(`users/${uid}`).remove();

        return NextResponse.json({
          success: true,
          action,
          deletedUid: uid,
        });
      }

      case 'status': {
        const enabled = Boolean(body.enabled);

        await adminDb.ref(`users/${uid}`).update({
          status: enabled ? 'active' : 'disabled',
          updatedAt: Date.now(),
        });

        return NextResponse.json({
          success: true,
          action,
        });
      }

      case 'reset-password': {
        const email = userRecord.email;

        if (!email) {
          return NextResponse.json(
            { error: 'This user has no email address.' },
            { status: 400 }
          );
        }

        const baseUrl = (
          process.env.APP_URL || 'http://localhost:3000'
        ).replace(/\/+$/, '');

        const resetLink =
          await adminAuth.generatePasswordResetLink(
            email,
            {
              url: `${baseUrl}/reset-password`,
              handleCodeInApp: false,
            }
          );

        return NextResponse.json({
          success: true,
          action,
          email,
          resetLink,
        });
      }

      default:
        return NextResponse.json(
          { error: 'Unknown user action.' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Admin user action failed:', error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unable to complete user action.',
      },
      { status: 500 }
    );
  }
}