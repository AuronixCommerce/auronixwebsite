import { userFacingError } from '@/lib/user-facing-error';
import { NextResponse } from 'next/server';

import { requireAdmin } from '@/lib/server-auth';
import { adminDb } from '@/lib/firebase-admin';
import { sendSellerInvitationEmail } from '@/lib/server-mail';
import { issueSellerInvitation, normalizeEmail } from '@/lib/server-seller-invitations';
import { appendDealRoomTimeline, ensureDealRoom } from '@/lib/deal-room';
import { writeAuditLog } from '@/lib/server-audit';

function text(
  value: unknown
): string {
  if (
    typeof value === 'string' ||
    typeof value === 'number'
  ) {
    return String(value).trim();
  }

  return '';
}

function getApplicantName(
  application: Record<string, unknown>
): string {
  return (
    text(
      application.fullName
    ) ||
    text(
      application.name
    ) ||
    text(
      application.applicantName
    )
  );
}

function getBusinessName(
  application: Record<string, unknown>
): string {
  return (
    text(
      application.businessName
    ) ||
    text(
      application.companyName
    ) ||
    text(
      application.company
    )
  );
}

function getBusinessEmail(
  application: Record<string, unknown>
): string {
  return (
    text(
      application.businessEmail
    ) ||
    text(
      application.email
    )
  );
}

function getPersonalEmail(
  application: Record<string, unknown>
): string {
  return text(
    application.personalEmail
  );
}

function getPreferredContactType(
  application: Record<string, unknown>
): 'business' | 'personal' | '' {
  const value =
    text(
      application.preferredContactType
    ).toLowerCase();

  if (
    value ===
    'personal'
  ) {
    return 'personal';
  }

  if (
    value ===
    'business'
  ) {
    return 'business';
  }

  return '';
}

function getPreferredEmail(
  application: Record<string, unknown>
): string {
  const explicit =
    text(
      application.preferredContactEmail
    );

  if (
    explicit
  ) {
    return normalizeEmail(explicit);
  }

  const type =
    getPreferredContactType(
      application
    );

  if (
    type ===
    'personal'
  ) {
    return normalizeEmail(
      getPersonalEmail(
        application
      ) ||
      getBusinessEmail(
        application
      )
    );
  }

  return normalizeEmail(
    getBusinessEmail(
      application
    ) ||
    getPersonalEmail(
      application
    )
  );
}

function isValidEmail(
  value: string
): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    value
  );
}

export async function POST(
  request: Request
) {
  try {
    const admin = await requireAdmin(
      request
    );

    const body =
      await request.json();

    const applicationId =
      text(
        body.applicationId
      );

    if (
      !applicationId
    ) {
      return NextResponse.json(
        {
          error:
            'Seller application ID is required.',
        },
        {
          status: 400,
        }
      );
    }

    const applicationRef =
      adminDb.ref(
        `sellerApplications/${applicationId}`
      );

    const snapshot =
      await applicationRef.get();

    if (
      !snapshot.exists()
    ) {
      return NextResponse.json(
        {
          error:
            'Seller application was not found.',
        },
        {
          status: 404,
        }
      );
    }

    const application =
      snapshot.val() as Record<
        string,
        unknown
      >;

    const fullName =
      getApplicantName(
        application
      );

    const businessName =
      getBusinessName(
        application
      );

    const businessEmail =
      getBusinessEmail(
        application
      );

    const personalEmail =
      getPersonalEmail(
        application
      );

    const preferredType =
      getPreferredContactType(
        application
      );

    const preferredEmail =
      getPreferredEmail(
        application
      );

    /*
     * New schema requires a valid applicant name
     * and at least one valid email.
     */
    if (
      !fullName
    ) {
      return NextResponse.json(
        {
          error:
            'Application is missing the applicant name.',
        },
        {
          status: 400,
        }
      );
    }

    if (
      !preferredEmail ||
      !isValidEmail(
        preferredEmail
      )
    ) {
      return NextResponse.json(
        {
          error:
            'Application is missing a valid seller contact email.',
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Prevent accidental duplicate approval.
     */
    if (
      text(
        application.status
      ).toLowerCase() ===
        'approved' &&
      application.invitationSentAt
    ) {
      return NextResponse.json({
        success: true,

        alreadyApproved:
          true,

        invitationSent:
          true,

        email:
          preferredEmail,
      });
    }

    const now =
      Date.now();

    const { invitationUrl, expiresAt } = await issueSellerInvitation(applicationId);

    /*
     * Preserve both emails and record exactly
     * which email was selected for the seller.
     */
    await applicationRef.update({
      status:
        'invited',

      approvedAt:
        now,

      approvedBy:
        'admin',

      accountCreated:
        false,

      accountCreationStatus:
        'invitation_pending',

      preferredContactEmail:
        preferredEmail,

      preferredContactType:
        preferredType ||
        (
          preferredEmail ===
          personalEmail
            ? 'personal'
            : 'business'
        ),

      invitationUrl,

      updatedAt:
        now,
    });
    await ensureDealRoom(applicationId, { ...application, status: 'invited', preferredContactEmail: preferredEmail });
    await appendDealRoomTimeline(applicationId, { type: 'status', title: 'Application approved', description: 'The application passed review and a secure account invitation was prepared.', actorRole: 'admin', actorEmail: admin.email || '', createdAt: now });

    try {
      await sendSellerInvitationEmail({
        email:
          preferredEmail,

        name:
          fullName,
invitationUrl,
        expiresAt,
      });

      await applicationRef.update({
        invitationSentAt:
          Date.now(),

        invitationSentBy:
          'admin',

        invitationDestination:
          preferredEmail,

        invitationDestinationType:
          preferredType ||
          (
            preferredEmail ===
            personalEmail
              ? 'personal'
              : 'business'
          ),

        accountCreationStatus:
          'invitation_sent',

        updatedAt:
          Date.now(),
      });
      const logRef = adminDb.ref('emailDeliveryLogs').push();
      await logRef.set({ id: logRef.key, applicationId, recipient: preferredEmail, subject: 'Create your Auronix Commerce seller account', event: 'seller-invitation', status: 'sent', createdAt: Date.now(), updatedAt: Date.now() });
      await writeAuditLog({ actorUid: admin.uid, actorEmail: admin.email, action: 'SELLER_APPLICATION_APPROVED', targetType: 'sellerApplication', targetId: applicationId, summary: 'Application approved and invitation sent.', request });

      return NextResponse.json({
        success: true,

        approved:
          true,

        invitationSent:
          true,

        email:
          preferredEmail,
      });
    } catch (
      emailError
    ) {
      await applicationRef.update({
        accountCreationStatus:
          'invitation_failed',

        invitationError:
          emailError instanceof Error
            ? userFacingError(emailError)
            : 'Seller invitation email failed.',

        updatedAt:
          Date.now(),
      });

      throw emailError;
    }
  } catch (
    error
  ) {
    console.error(
      'Seller approval failed:',
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? userFacingError(error)
            : 'Unable to approve seller application.',
      },
      {
        status: 500,
      }
    );
  }
}
