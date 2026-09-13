import { userFacingError } from '@/lib/user-facing-error';
import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { hashInvitationToken, normalizeEmail } from '@/lib/server-seller-invitations';

const response = (error: string, code: string, status: number) => NextResponse.json({ error, code }, { status });

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const token = String(body.token || '').trim();
    const password = String(body.password || '');
    if (!token) return response('Invitation token is missing.', 'TOKEN_MISSING', 400);
    if (password.length < 8) return response('Password must be at least 8 characters.', 'PASSWORD_TOO_SHORT', 400);

    const tokenHash = hashInvitationToken(token);
    const snapshot = await adminDb.ref('sellerApplications').get();
    const applications = snapshot.exists() ? snapshot.val() as Record<string, any> : {};
    const match = Object.entries(applications).find(([, candidate]) => candidate?.invitationTokenHash === tokenHash);
    if (!match) return response('This invitation is invalid. Use the newest invitation email or ask support to resend it.', 'INVITATION_INVALID', 404);
    const [applicationId, application] = match;
    const expires = Number(application.invitationExpires || 0);
    if (!expires || Date.now() >= expires) return response('This invitation has expired. Ask Auronix to send a new invitation.', 'INVITATION_EXPIRED', 410);
    if (application.invitationUsedAt) return response('This invitation has already been used. Sign in or reset your password.', 'INVITATION_USED', 409);
    if (!['approved', 'invited'].includes(String(application.status))) return response('This application is not eligible for activation.', 'APPLICATION_NOT_ELIGIBLE', 409);

    const accountEmail = normalizeEmail(application.preferredContactEmail || application.businessEmail || application.email || application.personalEmail);
    if (!accountEmail) return response('This invitation has no valid account email. Contact support.', 'INVITATION_EMAIL_MISSING', 422);
    try {
      await adminAuth.getUserByEmail(accountEmail);
      return response('An account already exists for this email. Sign in or reset your password.', 'ACCOUNT_EXISTS', 409);
    } catch (error: any) {
      if (error?.code !== 'auth/user-not-found') throw error;
    }

    const user = await adminAuth.createUser({ email: accountEmail, password, displayName: application.fullName, emailVerified: false });
    try {
      await adminAuth.setCustomUserClaims(user.uid, { role: 'seller' });
      const now = Date.now();
      await adminDb.ref().update({
        [`users/${user.uid}`]: { uid: user.uid, email: accountEmail, emailNormalized: accountEmail, displayName: application.fullName, name: application.fullName, businessName: application.businessName || '', sellerApplicationId: applicationId, role: 'seller', status: 'active', createdAt: now, updatedAt: now },
        [`sellerApplications/${applicationId}/status`]: 'active',
        [`sellerApplications/${applicationId}/accountCreated`]: true,
        [`sellerApplications/${applicationId}/accountCreationStatus`]: 'active',
        [`sellerApplications/${applicationId}/invitationUsedAt`]: now,
        [`sellerApplications/${applicationId}/invitationTokenHash`]: null,
        [`sellerApplications/${applicationId}/invitationExpires`]: null,
        [`sellerApplications/${applicationId}/updatedAt`]: now,
        [`sellerNotifications/${user.uid}/welcome`]: { id: 'welcome', type: 'account', title: 'Seller account activated', message: 'Your approved Auronix seller account is active and connected to your application.', href: '/seller/dashboard', createdAt: now },
      });
    } catch (error) {
      await adminAuth.deleteUser(user.uid).catch(() => undefined);
      throw error;
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Seller activation failed:', error?.code || (error instanceof Error ? userFacingError(error) : 'Unknown error'));
    if (error?.code === 'auth/email-already-exists') return response('An account already exists for this email. Sign in or reset your password.', 'ACCOUNT_EXISTS', 409);
    if (error?.code === 'auth/invalid-password') return response('Choose a stronger password with at least 8 characters.', 'INVALID_PASSWORD', 400);
    return response('Unable to create the seller account right now. Please retry or contact support.', 'ACTIVATION_FAILED', 500);
  }
}
