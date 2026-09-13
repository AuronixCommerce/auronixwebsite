import { resolveControls, controlSchedule, maintenanceBypass, maintenancePath } from '@/lib/maintenance-controls';
import { NextResponse } from 'next/server';

import { adminDb } from '@/lib/firebase-admin';

import {
  DEFAULT_GLOBAL_CONTROL,
  DEFAULT_PAGE_CONTROL,
} from '@/lib/page-controls';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  request: Request
) {
  try {
    const url = new URL(
      request.url
    );

    const rawPath =
      url.searchParams.get(
        'path'
      ) || '/';
    const path = rawPath === '/' ? '/' : `/${rawPath.split('?')[0].split('#')[0].replace(/^\/+|\/+$/g, '')}`;

    const snapshot = maintenanceBypass(maintenancePath(path)) ? null : await adminDb.ref('sitePageControls').get();
    const { global, page, pages } = resolveControls(snapshot?.exists() ? snapshot.val() : {}, path);
    const now = Date.now();

    const scheduledPages = Object.values(pages)
      .filter((item: any) => item.path !== path && item.scheduleEnabled && item.scheduleStartAt)
      .filter((item: any) => {
        const start = Number(item.scheduleStartAt);
        const end = item.scheduleEndAt ? Number(item.scheduleEndAt) : null;
        return start > now && (!end || end > start);
      })
      .sort((a: any, b: any) => Number(a.scheduleStartAt) - Number(b.scheduleStartAt))
      .slice(0, 5)
      .map((item: any) => ({
        path: String(item.path || '/'),
        title: String(item.maintenanceTitle || 'Scheduled maintenance'),
        startAt: Number(item.scheduleStartAt),
        endAt: item.scheduleEndAt ? Number(item.scheduleEndAt) : null,
      }));

    // Keep manual flags distinct from schedule activity, as the status API does.
    global.schedule = controlSchedule(global, now);
    page.schedule = controlSchedule(page, now);

    if (
      page.popupUntilAt &&
      now >= page.popupUntilAt
    ) {
      page.popupEnabled = false;
    }

    return NextResponse.json(
      {
        success: true,
        global,
        page,
        scheduledPages,
      },
      {
        headers: {
          'Cache-Control':
            'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (error) {
    console.error(
      'Public page controls failed:',
      error
    );

    return NextResponse.json({
      success: false,
      global:
        DEFAULT_GLOBAL_CONTROL,
      page:
        DEFAULT_PAGE_CONTROL,
    }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
