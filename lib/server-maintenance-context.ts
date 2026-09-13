import { resolveControls, maintenancePath, maintenanceBypass } from '@/lib/maintenance-controls';
import {
  adminDb,
} from '@/lib/firebase-admin';

import {
  isScheduleActive,
  isScheduleUpcoming,
} from '@/lib/page-controls';

function strictBoolean(
  value: unknown
): boolean {
  return (
    value === true ||
    value === 1 ||
    value === '1' ||
    value === 'true' ||
    value === 'TRUE' ||
    value === 'True'
  );
}

function timestamp(
  value: unknown
): number | null {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value)
  ) {
    return null;
  }

  return value;
}

function text(
  value: unknown,
  fallback = ''
): string {
  return typeof value === 'string'
    ? value
    : fallback;
}

export async function getMaintenanceContext(
  pathname = '/'
) {
  const requestedPath = maintenancePath(pathname);
  const snapshot = maintenanceBypass(requestedPath) ? null : await adminDb.ref('sitePageControls').get();
  const { global, page } = resolveControls(snapshot?.exists() ? snapshot.val() : {}, requestedPath);

  const now = Date.now();

  const globalMaintenanceEnabled =
    strictBoolean(
      global.maintenanceEnabled
    );

  const globalScheduleEnabled =
    strictBoolean(
      global.scheduleEnabled
    );

  const pageMaintenanceEnabled =
    strictBoolean(
      page.maintenanceEnabled
    );

  const pageScheduleEnabled =
    strictBoolean(
      page.scheduleEnabled
    );

  const globalAiMaintenanceEnabled =
    strictBoolean(
      global.aiMaintenanceEnabled
    );

  const globalAiScheduleEnabled =
    strictBoolean(
      global.aiScheduleEnabled
    );

  const pageAiMaintenanceEnabled =
    strictBoolean(
      page.aiMaintenanceEnabled
    );

  const pageAiScheduleEnabled =
    strictBoolean(
      page.aiScheduleEnabled
    );

  const globalActive =
    globalMaintenanceEnabled ||
    (
      globalScheduleEnabled &&
      isScheduleActive(
        timestamp(
          global.scheduleStartAt
        ),
        timestamp(
          global.scheduleEndAt
        ),
        now
      )
    );

  const globalUpcoming =
    globalScheduleEnabled &&
    isScheduleUpcoming(
      timestamp(
        global.scheduleStartAt
      ),
      timestamp(
        global.scheduleEndAt
      ),
      now
    );

  const pageActive =
    pageMaintenanceEnabled ||
    (
      pageScheduleEnabled &&
      isScheduleActive(
        timestamp(
          page.scheduleStartAt
        ),
        timestamp(
          page.scheduleEndAt
        ),
        now
      )
    );

  const pageUpcoming =
    pageScheduleEnabled &&
    isScheduleUpcoming(
      timestamp(
        page.scheduleStartAt
      ),
      timestamp(
        page.scheduleEndAt
      ),
      now
    );

  const globalAiActive =
    globalAiMaintenanceEnabled ||
    (
      globalAiScheduleEnabled &&
      isScheduleActive(
        timestamp(
          global.aiScheduleStartAt
        ),
        timestamp(
          global.aiScheduleEndAt
        ),
        now
      )
    );

  const globalAiUpcoming =
    globalAiScheduleEnabled &&
    isScheduleUpcoming(
      timestamp(
        global.aiScheduleStartAt
      ),
      timestamp(
        global.aiScheduleEndAt
      ),
      now
    );

  const pageAiActive =
    pageAiMaintenanceEnabled ||
    (
      pageAiScheduleEnabled &&
      isScheduleActive(
        timestamp(
          page.aiScheduleStartAt
        ),
        timestamp(
          page.aiScheduleEndAt
        ),
        now
      )
    );

  const pageAiUpcoming =
    pageAiScheduleEnabled &&
    isScheduleUpcoming(
      timestamp(
        page.aiScheduleStartAt
      ),
      timestamp(
        page.aiScheduleEndAt
      ),
      now
    );

  return {
    now,

    global: {
      scheduled:
        globalScheduleEnabled,

      upcoming:
        Boolean(globalUpcoming),

      active:
        Boolean(globalActive),

      startAt:
        timestamp(
          global.scheduleStartAt
        ),

      endAt:
        timestamp(
          global.scheduleEndAt
        ),

      title:
        text(
          global.maintenanceTitle,
          'Website Maintenance'
        ),

      message:
        text(
          global.maintenanceMessage,
          'Auronix Commerce is currently undergoing maintenance.'
        ),

      aiMaintenanceEnabled:
        globalAiMaintenanceEnabled,

      aiActive:
        Boolean(
          globalAiActive
        ),

      aiUpcoming:
        Boolean(
          globalAiUpcoming
        ),

      aiStartAt:
        timestamp(
          global.aiScheduleStartAt
        ),

      aiEndAt:
        timestamp(
          global.aiScheduleEndAt
        ),

      aiTitle:
        text(
          global.aiMaintenanceTitle,
          'Auronix AI Maintenance'
        ),

      aiMessage:
        text(
          global.aiMaintenanceMessage,
          'Auronix AI is temporarily under maintenance.'
        ),
    },

    page: {
      path: requestedPath,

      scheduled:
        pageScheduleEnabled,

      upcoming:
        Boolean(pageUpcoming),

      active:
        Boolean(pageActive),

      startAt:
        timestamp(
          page.scheduleStartAt
        ),

      endAt:
        timestamp(
          page.scheduleEndAt
        ),

      title:
        text(
          page.maintenanceTitle,
          'Page Maintenance'
        ),

      message:
        text(
          page.maintenanceMessage,
          `The page ${requestedPath} is currently undergoing maintenance.`
        ),

      aiMaintenanceEnabled:
        pageAiMaintenanceEnabled,

      aiActive:
        Boolean(
          pageAiActive
        ),

      aiUpcoming:
        Boolean(
          pageAiUpcoming
        ),

      aiStartAt:
        timestamp(
          page.aiScheduleStartAt
        ),

      aiEndAt:
        timestamp(
          page.aiScheduleEndAt
        ),

      aiTitle:
        text(
          page.aiMaintenanceTitle,
          'AI Maintenance'
        ),

      aiMessage:
        text(
          page.aiMaintenanceMessage,
          'Auronix AI is temporarily under maintenance.'
        ),
    },
  };
}
