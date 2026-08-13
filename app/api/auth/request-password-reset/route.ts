import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { sendPasswordResetEmail } from '@/lib/server-mail';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email || '').trim().toLowerCase();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required.' },
        { status: 400 }
      );
    }

    // Always return the same public response so we do not
    // reveal whether an account exists.
    try {
      const user = await adminAuth.getUserByEmail(email);

      if (user.email) {
        const baseUrl = (
          process.env.APP_URL || 'http://localhost:3000'
        ).replace(/\/+$/, '');

        const resetLink =
          await adminAuth.generatePasswordResetLink(
            user.email,
            {
              url: `${baseUrl}/reset-password`,
              handleCodeInApp: false,
            }
          );

        await sendPasswordResetEmail(
          user.email,
          user.displayName || '',
          resetLink
        );
      }
    } catch (error: any) {
      if (error?.code !== 'auth/user-not-found') {
        console.error(
          'Password reset generation error:',
          error
        );
      }
    }

    return NextResponse.json({
      success: true,
      message:
        'If an account exists for this email, reset instructions have been sent.',
    });
  } catch (error) {
    console.error(
      'Password reset request failed:',
      error
    );

    return NextResponse.json(
      {
        error:
          'Unable to process the password reset request.',
      },
      { status: 500 }
    );
  }
}
