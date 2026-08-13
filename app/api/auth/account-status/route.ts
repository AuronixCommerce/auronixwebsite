import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const uid = String(body.uid || '').trim();

    if (!uid) {
      return NextResponse.json(
        { error: 'UID is required.' },
        { status: 400 }
      );
    }

    const [authUser, profileSnapshot] = await Promise.all([
      adminAuth.getUser(uid),
      adminDb.ref(`users/${uid}`).get(),
    ]);

    const profile = profileSnapshot.exists()
      ? profileSnapshot.val()
      : null;

    const banned = Boolean(profile?.banned);

    const temporary =
      banned &&
      Boolean(profile?.bannedUntil) &&
      Number(profile.bannedUntil) > Date.now();

    const permanent =
      banned &&
      !profile?.bannedUntil;

    return NextResponse.json({
      disabled: Boolean(authUser.disabled),
      banned,
      temporary,
      permanent,
      bannedUntil: profile?.bannedUntil || null,
      banReason: profile?.banReason || '',
      status: profile?.status || '',
    });
  } catch (error) {
    console.error('Account status check failed:', error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unable to check account status.',
      },
      { status: 500 }
    );
  }
}
