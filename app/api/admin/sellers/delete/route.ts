import { userFacingError } from '@/lib/user-facing-error';
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireAdmin } from '@/lib/server-auth';
import { writeAuditLog } from '@/lib/server-audit';

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin(request);

    const body = await request.json();
    const applicationId = String(
      body.applicationId || ''
    ).trim();

    if (!applicationId) {
      return NextResponse.json(
        { error: 'Application ID is required.' },
        { status: 400 }
      );
    }

    const applicationRef = adminDb.ref(
      `sellerApplications/${applicationId}`
    );

    const snapshot = await applicationRef.get();

    if (!snapshot.exists()) {
      return NextResponse.json(
        { error: 'Application not found.' },
        { status: 404 }
      );
    }

    await applicationRef.remove();

    await writeAuditLog({ actorUid: admin.uid, actorEmail: admin.email || '', action: 'SELLER_APPLICATION_DELETED', targetType: 'sellerApplication', targetId: applicationId, summary: 'Seller application permanently deleted.', request });

    return NextResponse.json({
      success: true,
      message: 'Seller application deleted.',
    });
  } catch (error) {
    console.error(
      'Seller application deletion failed:',
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? userFacingError(error)
            : 'Unable to delete application.',
      },
      { status: 500 }
    );
  }
}
