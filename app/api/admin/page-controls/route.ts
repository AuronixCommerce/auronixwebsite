import { userFacingError } from '@/lib/user-facing-error';
import { resolveControls, maintenanceFlag } from '@/lib/maintenance-controls';
export const dynamic = 'force-dynamic';
import {
  NextResponse,
} from 'next/server';

import {
  adminDb,
} from '@/lib/firebase-admin';

import {
  requireAdmin,
} from '@/lib/server-auth';

import {
  DEFAULT_GLOBAL_CONTROL,
  DEFAULT_PAGE_CONTROL,
} from '@/lib/page-controls';

function text(
  value: unknown
): string {
  return typeof value ===
    'string'
    ? value.trim()
    : '';
}

function bool(
  value: unknown
): boolean {
  return maintenanceFlag(value);
}

function numberOrNull(
  value: unknown
): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return null;
  }

  const parsed =
    Number(
      value
    );

  return Number.isFinite(
    parsed
  )
    ? parsed
    : null;
}

function encodePath(
  path: string
): string {
  const normalized = normalizePath(path);
  return (
    normalized
      .replace(/^\/+/, '')
      .replace(/\//g, '__') ||
    'home'
  );
}

function normalizePath(path: string): string {
  const value = String(path || '/').trim().split('?')[0].split('#')[0];
  if (!value || value === '/') return '/';
  return `/${value.replace(/^\/+|\/+$/g, '')}`;
}

async function audit(
  action: string,
  path: string,
  details: Record<string, unknown>
) {
  const id =
    `${Date.now()}_${Math.random()
      .toString(36)
      .slice(2)}`;

  await adminDb
    .ref(
      `siteOperationsAudit/${id}`
    )
    .set({
      action,
      path,
      details,
      createdAt:
        Date.now(),
    });
}

export async function GET(
  request: Request
) {
  try {
    await requireAdmin(
      request
    );

    const snapshot =
      await adminDb
        .ref(
          'sitePageControls'
        )
        .get();

    const data =
      snapshot.exists()
        ? snapshot.val()
        : {};

    return NextResponse.json({
      success:
        true,

      global: resolveControls(data, '/').global,
      pages: resolveControls(data, '/').pages,
    });
  } catch (
    error
  ) {
    console.error(
      'Admin page controls GET failed:',
      error
    );

    return NextResponse.json(
      {
        success:
          false,

        error:
          error instanceof Error
            ? userFacingError(error)
            : 'Unable to load controls.',
      },
      {
        status: 500,
      }
    );
  }
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

    const action =
      text(
        body.action
      );

    if (action === 'disable-all') {
      const snapshot = await adminDb.ref('sitePageControls').get();
      const stored = snapshot.exists() ? snapshot.val() : {};
      const updates: Record<string, unknown> = {
        'global/maintenanceEnabled': false,
        'global/scheduleEnabled': false,
        'global/scheduleStartAt': null,
        'global/scheduleEndAt': null,
        'global/automaticFullSiteShutdown': false,
        'global/updatedAt': Date.now(),
        'global/updatedBy': 'admin-emergency-off',
      };
      for (const key of Object.keys(stored?.pages || {})) {
        updates[`pages/${key}/maintenanceEnabled`] = false;
        updates[`pages/${key}/scheduleEnabled`] = false;
        updates[`pages/${key}/scheduleStartAt`] = null;
        updates[`pages/${key}/scheduleEndAt`] = null;
        updates[`pages/${key}/automaticMaintenanceEnabled`] = false;
        updates[`pages/${key}/healthStatus`] = 'healthy';
        updates[`pages/${key}/healthScore`] = 100;
        updates[`pages/${key}/consecutiveFailures`] = 0;
        updates[`pages/${key}/lastError`] = '';
        updates[`pages/${key}/updatedAt`] = Date.now();
        updates[`pages/${key}/updatedBy`] = 'admin-emergency-off';
      }
      await adminDb.ref('sitePageControls').update(updates);
      await audit('ALL_MAINTENANCE_DISABLED', '*', { pageCount: Object.keys(stored?.pages || {}).length });
      return NextResponse.json({ success: true });
    }

    if (
      action ===
      'global'
    ) {
      const oldSnapshot =
        await adminDb
          .ref(
            'sitePageControls/global'
          )
          .get();

      const oldValue =
        oldSnapshot.exists()
          ? oldSnapshot.val()
          : {};

      const input = { ...oldValue, ...body };
      const payload = {
        ...DEFAULT_GLOBAL_CONTROL,
        ...oldValue,

        maintenanceEnabled:
          bool(
            input.maintenanceEnabled
          ),

        maintenanceTitle:
          text(
            input.maintenanceTitle
          ) ||
          DEFAULT_GLOBAL_CONTROL.maintenanceTitle,

        maintenanceMessage:
          text(
            input.maintenanceMessage
          ) ||
          DEFAULT_GLOBAL_CONTROL.maintenanceMessage,

        scheduleEnabled:
          bool(
            input.scheduleEnabled
          ),

        scheduleStartAt:
          numberOrNull(
            input.scheduleStartAt
          ),

        scheduleEndAt:
          numberOrNull(
            input.scheduleEndAt
          ),

        automaticFullSiteShutdown:
          bool(
            input.automaticFullSiteShutdown
          ),

        automaticRecovery:
          bool(
            input.automaticRecovery
          ),

        aiMaintenanceEnabled: 'aiMaintenanceEnabled' in body ? bool(input.aiMaintenanceEnabled) : bool(oldValue.aiMaintenanceEnabled),
        aiMaintenanceTitle: 'aiMaintenanceTitle' in body ? text(input.aiMaintenanceTitle) : text(oldValue.aiMaintenanceTitle),
        aiMaintenanceMessage: 'aiMaintenanceMessage' in body ? text(input.aiMaintenanceMessage) : text(oldValue.aiMaintenanceMessage),
        aiScheduleEnabled: 'aiScheduleEnabled' in body ? bool(input.aiScheduleEnabled) : bool(oldValue.aiScheduleEnabled),
        aiScheduleStartAt: numberOrNull('aiScheduleStartAt' in body ? input.aiScheduleStartAt : oldValue.aiScheduleStartAt),
        aiScheduleEndAt: numberOrNull('aiScheduleEndAt' in body ? input.aiScheduleEndAt : oldValue.aiScheduleEndAt),

        updatedAt:
          Date.now(),

        updatedBy:
          'admin',
      };

      await adminDb
        .ref(
          'sitePageControls/global'
        )
        .set(
          payload
        );

      await audit(
        'GLOBAL_SCHEDULE_UPDATED',
        '*',
        payload
      );

      return NextResponse.json({
        success:
          true,

        global:
          payload,
      });
    }

    if (
      action ===
      'page'
    ) {
      const path = normalizePath(
        text(
          body.path
        )
      );

      if (
        !path
      ) {
        return NextResponse.json(
          {
            success:
              false,

            error:
              'Page path is required.',
          },
          {
            status: 400,
          }
        );
      }

      const key =
        encodePath(
          path
        );

      const oldSnapshot =
        await adminDb
          .ref(
            `sitePageControls/pages/${key}`
          )
          .get();

      const oldValue =
        oldSnapshot.exists()
          ? oldSnapshot.val()
          : {};

      const input = { ...oldValue, ...body };
      const payload = {
        ...DEFAULT_PAGE_CONTROL,
        ...oldValue,

        path,

        maintenanceEnabled:
          bool(
            input.maintenanceEnabled
          ),

        maintenanceTitle:
          text(
            input.maintenanceTitle
          ) ||
          DEFAULT_PAGE_CONTROL.maintenanceTitle,

        maintenanceMessage:
          text(
            input.maintenanceMessage
          ) ||
          DEFAULT_PAGE_CONTROL.maintenanceMessage,

        scheduleEnabled:
          bool(
            input.scheduleEnabled
          ),

        scheduleStartAt:
          numberOrNull(
            input.scheduleStartAt
          ),

        scheduleEndAt:
          numberOrNull(
            input.scheduleEndAt
          ),

        popupEnabled:
          bool(
            input.popupEnabled
          ),

        popupTitle:
          text(
            input.popupTitle
          ) ||
          DEFAULT_PAGE_CONTROL.popupTitle,

        popupMessage:
          text(
            input.popupMessage
          ),

        popupButtonText:
          text(
            input.popupButtonText
          ) ||
          DEFAULT_PAGE_CONTROL.popupButtonText,

        popupButtonUrl:
          text(
            input.popupButtonUrl
          ),

        popupFrequency:
          input.popupFrequency ===
            'once' ||
          input.popupFrequency ===
            'always'
            ? input.popupFrequency
            : 'session',

        popupUntilAt:
          numberOrNull(
            input.popupUntilAt
          ),

        automaticMaintenanceEnabled:
          bool(input.automaticMaintenanceEnabled),

        automaticRecoveryEnabled:
          bool(
            input.automaticRecoveryEnabled
          ),

        failureThreshold:
          Math.max(
            1,
            Math.min(
              10,
              Number(
                input.failureThreshold
              ) ||
                3
            )
          ),

        adminBypassEnabled:
          input.adminBypassEnabled !==
          false,

        aiMaintenanceEnabled: 'aiMaintenanceEnabled' in body ? bool(input.aiMaintenanceEnabled) : bool(oldValue.aiMaintenanceEnabled),
        aiMaintenanceTitle: 'aiMaintenanceTitle' in body ? text(input.aiMaintenanceTitle) : text(oldValue.aiMaintenanceTitle),
        aiMaintenanceMessage: 'aiMaintenanceMessage' in body ? text(input.aiMaintenanceMessage) : text(oldValue.aiMaintenanceMessage),
        aiScheduleEnabled: 'aiScheduleEnabled' in body ? bool(input.aiScheduleEnabled) : bool(oldValue.aiScheduleEnabled),
        aiScheduleStartAt: numberOrNull('aiScheduleStartAt' in body ? input.aiScheduleStartAt : oldValue.aiScheduleStartAt),
        aiScheduleEndAt: numberOrNull('aiScheduleEndAt' in body ? input.aiScheduleEndAt : oldValue.aiScheduleEndAt),

        updatedAt:
          Date.now(),

        updatedBy:
          'admin',
      };

      await adminDb
        .ref(
          `sitePageControls/pages/${key}`
        )
        .set(
          payload
        );

      await audit(
        'PAGE_SCHEDULE_UPDATED',
        path,
        payload
      );

      return NextResponse.json({
        success:
          true,

        page:
          payload,
      });
    }

    return NextResponse.json(
      {
        success:
          false,

        error:
          'Invalid action.',
      },
      {
        status: 400,
      }
    );
  } catch (
    error
  ) {
    console.error(
      'Admin page controls POST failed:',
      error
    );

    return NextResponse.json(
      {
        success:
          false,

        error:
          error instanceof Error
            ? userFacingError(error)
            : 'Unable to update controls.',
      },
      {
        status: 500,
      }
    );
  }
}
