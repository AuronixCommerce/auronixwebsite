import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { sendPasswordResetEmail, sendPasswordResetFallback } from '@/lib/server-mail';
import { protectPublicRequest, publicRequestErrorResponse } from '@/lib/server-protection';
import { reportOperationalError } from '@/lib/server-audit';

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

    const now = Date.now();
    const deliveryRef = adminDb.ref('emailDeliveryLogs').push();
    const requestId = deliveryRef.key || `reset-${now}`;
    const updateDelivery = async (value: Record<string, unknown>) => {
      await deliveryRef.update(value).catch(error => {
        console.error('Auronix password reset delivery logging failed:', error);
      });
    };
    await deliveryRef.set({
      id: requestId,
      recipient: email,
      subject: 'Reset your Auronix Commerce password',
      event: 'password-reset',
      status: 'queued',
      createdAt: now,
      updatedAt: now,
    }).catch(error => {
      console.error('Auronix password reset delivery logging failed:', error);
    });

    const accepted = () => NextResponse.json({
      success: true,
      requestId,
      message:
        'If an account exists for this email, reset instructions have been requested.',
    });

    // Keep the public response identical so account addresses cannot be enumerated.
    let user;
    try {
      user = await adminAuth.getUserByEmail(email);
    } catch (error: any) {
      if (error?.code === 'auth/user-not-found') {
        await updateDelivery({ status: 'accepted', updatedAt: Date.now() });
        return accepted();
      }
      throw error;
    }
    if (!user.email) {
      await updateDelivery({ status: 'accepted', updatedAt: Date.now() });
      return accepted();
    }

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
      try {
        const result: any = await sendPasswordResetEmail({ email: accountEmail, name: user.displayName || '', resetUrl: resetLink });
        await updateDelivery({ status: 'sent', providerMessageId: String(result?.messageId || '').slice(0, 500), updatedAt: Date.now() });
      } catch (primaryError) {
        console.error('Auronix password reset primary delivery failed:', primaryError);
        try {
          const fallback: any = await sendPasswordResetFallback({ email: accountEmail, continueUrl: `${baseUrl}/seller/login` });
          await updateDelivery({ status: 'sent', deliveryChannel: 'account-recovery', providerMessageId: String(fallback?.messageId || '').slice(0, 500), updatedAt: Date.now() });
        } catch (fallbackError) {
          console.error('Auronix password reset recovery delivery failed:', fallbackError);
          await updateDelivery({ status: 'failed', error: 'Password reset delivery failed after both secure delivery attempts.', updatedAt: Date.now() });
          await reportOperationalError('password-reset-delivery', new Error('Password reset delivery failed after both secure delivery attempts.'), { requestId });
        }
      }
    } catch (error) {
      console.error('Auronix password reset generation failed:', error);
      await updateDelivery({ status: 'failed', error: 'A secure password reset link could not be generated.', updatedAt: Date.now() });
      await reportOperationalError('password-reset-generation', new Error('A secure password reset link could not be generated.'), { requestId });
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
