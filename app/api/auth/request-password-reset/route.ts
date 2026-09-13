import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { sendPasswordResetEmail } from '@/lib/server-mail';
import { protectPublicRequest, publicRequestErrorResponse } from '@/lib/server-protection';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    await protectPublicRequest(request, 'password-reset', body, { limit: 5, windowMs: 30 * 60_000 });
    const email = String(body.email || '').trim().toLowerCase();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required.' },
        { status: 400 }
      );
    }

    const accepted = () => NextResponse.json({
      success: true,
      message:
        'If an account exists for this email, reset instructions have been requested.',
    });

    // Keep the public response identical so account addresses cannot be enumerated.
    let user;
    try {
      user = await adminAuth.getUserByEmail(email);
    } catch (error: any) {
      if (error?.code === 'auth/user-not-found') return accepted();
      throw error;
    }
    if (!user.email) return accepted();

    try {
      const baseUrl = (
        process.env.NEXT_PUBLIC_SITE_URL || process.env.APP_URL || 'https://auronixcommerce.com'
      ).replace(/\/+$/, '');
      const accountEmail = user.email;
      const generatedLink = await adminAuth.generatePasswordResetLink(accountEmail, {
        url: `${baseUrl}/reset-password`,
        handleCodeInApp: false,
      });
      const actionUrl = new URL(generatedLink);
      const resetCode = actionUrl.searchParams.get('oobCode');
      if (!resetCode) throw new Error('Auronix Auth returned an invalid password-reset link.');
      const resetLink = `${baseUrl}/reset-password?oobCode=${encodeURIComponent(resetCode)}`;
      await sendPasswordResetEmail({ email: accountEmail, name: user.displayName || '', resetUrl: resetLink });
    } catch (error) {
      // Log operational delivery failures without exposing whether the account exists.
      console.error('Auronix password reset delivery failed:', error);
    }

    return accepted();
  } catch (error) {
    const protectedError = publicRequestErrorResponse(error);
    if (protectedError) return NextResponse.json(protectedError.body, { status: protectedError.status });
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
