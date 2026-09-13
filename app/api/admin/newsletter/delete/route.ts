import { userFacingError } from '@/lib/user-facing-error';
import {
  NextResponse,
} from 'next/server';

import {
  adminDb,
} from '@/lib/firebase-admin';

import {
  requireAdmin,
} from '@/lib/server-auth';

function clean(
  value: unknown
): string {
  return typeof value === 'string'
    ? value.trim()
    : '';
}

async function deleteLinkedAiPages(
  campaignId: string | null
) {
  if (!campaignId) {
    return 0;
  }

  const snapshot =
    await adminDb
      .ref(
        'aiGeneratedNewsletterPages'
      )
      .get();

  if (!snapshot.exists()) {
    return 0;
  }

  const raw =
    snapshot.val();

  if (
    !raw ||
    typeof raw !== 'object'
  ) {
    return 0;
  }

  const updates: Record<
    string,
    null
  > = {};

  let deleted = 0;

  for (
    const entry of Object.entries(
      raw as Record<string, any>
    )
  ) {
    const token =
      entry[0];

    const page =
      entry[1];

    if (
      !page ||
      typeof page !== 'object'
    ) {
      continue;
    }

    const pageCampaignId =
      clean(
        page.campaignId
      );

    if (
      pageCampaignId ===
      campaignId
    ) {
      updates[
        'aiGeneratedNewsletterPages/' +
        token
      ] = null;

      updates[
        'newsletterLinks/' +
        token
      ] = null;

      deleted += 1;
    }
  }

  if (
    Object.keys(
      updates
    ).length > 0
  ) {
    await adminDb
      .ref()
      .update(
        updates
      );
  }

  return deleted;
}

export async function POST(
  request: Request
) {
  try {
    await requireAdmin(
      request
    );

    const body =
      await request.json();

    const mode =
      clean(
        body?.mode
      );

    if (
      mode ===
      'single'
    ) {
      const campaignId =
        clean(
          body?.campaignId
        );

      if (
        !campaignId
      ) {
        return NextResponse.json(
          {
            success:
              false,

            error:
              'Campaign ID is required.',
          },
          {
            status:
              400,
          }
        );
      }

      const campaignRef =
        adminDb.ref(
          'newsletterCampaigns/' +
          campaignId
        );

      const snapshot =
        await campaignRef.get();

      if (
        !snapshot.exists()
      ) {
        return NextResponse.json(
          {
            success:
              false,

            error:
              'Newsletter campaign not found.',
          },
          {
            status:
              404,
          }
        );
      }

      const campaign =
        snapshot.val();

      const linkedIds =
        new Set<string>();

      linkedIds.add(
        campaignId
      );

      const storedCampaignId =
        clean(
          campaign?.campaignId
        );

      if (
        storedCampaignId
      ) {
        linkedIds.add(
          storedCampaignId
        );
      }

      const aiPagesSnapshot =
        await adminDb
          .ref(
            'aiGeneratedNewsletterPages'
          )
          .get();

      const updates: Record<
        string,
        null
      > = {};

      updates[
        'newsletterCampaigns/' +
        campaignId
      ] = null;

      let aiPagesDeleted =
        0;

      if (
        aiPagesSnapshot.exists()
      ) {
        const aiPages =
          aiPagesSnapshot.val();

        if (
          aiPages &&
          typeof aiPages ===
            'object'
        ) {
          for (
            const entry of Object.entries(
              aiPages as Record<
                string,
                any
              >
            )
          ) {
            const token =
              entry[0];

            const page =
              entry[1];

            if (
              !page ||
              typeof page !==
                'object'
            ) {
              continue;
            }

            const pageCampaignId =
              clean(
                page.campaignId
              );

            if (
              pageCampaignId &&
              linkedIds.has(
                pageCampaignId
              )
            ) {
              updates[
                'aiGeneratedNewsletterPages/' +
                token
              ] = null;

              updates[
                'newsletterLinks/' +
                token
              ] = null;

              aiPagesDeleted +=
                1;
            }
          }
        }
      }

      await adminDb
        .ref()
        .update(
          updates
        );

      return NextResponse.json({
        success:
          true,

        campaignsDeleted:
          1,

        aiPagesDeleted,
      });
    }

    if (
      mode ===
      'all'
    ) {
      const campaignsRef =
        adminDb.ref(
          'newsletterCampaigns'
        );

      const aiPagesRef =
        adminDb.ref(
          'aiGeneratedNewsletterPages'
        );

      const campaignsSnapshot =
        await campaignsRef.get();

      const aiPagesSnapshot =
        await aiPagesRef.get();

      let campaignsDeleted =
        0;

      let aiPagesDeleted =
        0;

      if (
        campaignsSnapshot.exists()
      ) {
        const campaigns =
          campaignsSnapshot.val();

        if (
          campaigns &&
          typeof campaigns ===
            'object'
        ) {
          campaignsDeleted =
            Object.keys(
              campaigns
            ).length;
        }
      }

      if (
        aiPagesSnapshot.exists()
      ) {
        const aiPages =
          aiPagesSnapshot.val();

        if (
          aiPages &&
          typeof aiPages ===
            'object'
        ) {
          aiPagesDeleted =
            Object.keys(
              aiPages
            ).length;
        }
      }

      const updates: Record<
        string,
        null
      > = {};

      updates[
        'newsletterCampaigns'
      ] = null;

      updates[
        'aiGeneratedNewsletterPages'
      ] = null;

      updates[
        'newsletterLinks'
      ] = null;

      await adminDb
        .ref()
        .update(
          updates
        );

      return NextResponse.json({
        success:
          true,

        campaignsDeleted,

        aiPagesDeleted,
      });
    }

    if (
      mode ===
      'page'
    ) {
      const token =
        clean(
          body?.token
        ).toUpperCase();

      if (
        !token
      ) {
        return NextResponse.json(
          {
            success:
              false,

            error:
              'AI page token is required.',
          },
          {
            status:
              400,
          }
        );
      }

      const pageRef =
        adminDb.ref(
          'aiGeneratedNewsletterPages/' +
          token
        );

      const linkRef =
        adminDb.ref(
          'newsletterLinks/' +
          token
        );

      const pageSnapshot =
        await pageRef.get();

      const linkSnapshot =
        await linkRef.get();

      if (
        !pageSnapshot.exists() &&
        !linkSnapshot.exists()
      ) {
        return NextResponse.json(
          {
            success:
              false,

            error:
              'AI generated page not found.',
          },
          {
            status:
              404,
          }
        );
      }

      const updates:
        Record<
          string,
          null
        > = {};

      updates[
        'aiGeneratedNewsletterPages/' +
        token
      ] = null;

      updates[
        'newsletterLinks/' +
        token
      ] = null;

      await adminDb
        .ref()
        .update(
          updates
        );

      return NextResponse.json({
        success:
          true,

        deleted:
          true,

        token,
      });
    }

    return NextResponse.json(
      {
        success:
          false,

        error:
          'Invalid delete mode.',
      },
      {
        status:
          400,
      }
    );
  } catch (
    error
  ) {
    console.error(
      '[Newsletter Delete API]',
      error
    );

    return NextResponse.json(
      {
        success:
          false,

        error:
          error instanceof Error
            ? userFacingError(error)
            : 'Unable to delete newsletter data.',
      },
      {
        status:
          500,
      }
    );
  }
}