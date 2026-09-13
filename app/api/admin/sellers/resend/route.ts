import { userFacingError } from '@/lib/user-facing-error';
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireAdmin } from '@/lib/server-auth';
import { sendSellerInvitationEmail } from '@/lib/server-mail';
import { issueSellerInvitation, normalizeEmail } from '@/lib/server-seller-invitations';

export async function POST(request: Request) {
  try {
    await requireAdmin(request);
    const applicationId = String((await request.json()).applicationId || '').trim();
    if (!applicationId) return NextResponse.json({ error: 'Application ID is required.', code: 'APPLICATION_ID_REQUIRED' }, { status: 400 });
    const snapshot = await adminDb.ref(`sellerApplications/${applicationId}`).get();
    if (!snapshot.exists()) return NextResponse.json({ error: 'Seller application not found.', code: 'APPLICATION_NOT_FOUND' }, { status: 404 });
    const application = snapshot.val();
    if (application.status === 'active' || application.accountCreated) return NextResponse.json({ error: 'This seller account is already active. Use account management instead.', code: 'ACCOUNT_ALREADY_ACTIVE' }, { status: 409 });
    const email = normalizeEmail(application.preferredContactEmail || application.businessEmail || application.email || application.personalEmail);
    if (!email || !application.fullName) return NextResponse.json({ error: 'The application does not contain a valid name and email.', code: 'APPLICATION_INCOMPLETE' }, { status: 422 });
    const { invitationUrl, expiresAt } = await issueSellerInvitation(applicationId);
    await sendSellerInvitationEmail({ email, name: application.fullName, invitationUrl, expiresAt });
    await adminDb.ref(`sellerApplications/${applicationId}`).update({ invitationSentAt: Date.now(), invitationSentBy: 'admin', invitationDestination: email, accountCreationStatus: 'invitation_sent', invitationError: null });
    return NextResponse.json({ success: true, expiresAt });
  } catch (error) {
    console.error('Invitation resend failed:', error instanceof Error ? userFacingError(error) : 'Unknown error');
    return NextResponse.json({ error: 'Unable to resend the invitation right now. Please retry.', code: 'INVITATION_SEND_FAILED' }, { status: 500 });
  }
}
