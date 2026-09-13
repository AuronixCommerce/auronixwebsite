import { userFacingError } from '@/lib/user-facing-error';
import { maintenanceFlag } from '@/lib/maintenance-controls';
import { NextResponse } from 'next/server';

import { adminDb } from '@/lib/firebase-admin';
import { reportOperationalError } from '@/lib/server-audit';

import { generateGroqResponse } from '@/lib/server-groq';

import {
  SITE_PAGES,
} from '@/lib/site-pages';

import {
  DEFAULT_PAGE_CONTROL,
} from '@/lib/page-controls';

function encodePath(
  path: string
): string {
  return (
    path
      .replace(/^\/+/, '')
      .replace(/\//g, '__') ||
    'home'
  );
}

function text(
  value: unknown
): string {
  return typeof value === 'string'
    ? value.trim()
    : '';
}

function parseJson(
  value: string
) {
  const cleaned =
    value
      .replace(
        /^```json/i,
        ''
      )
      .replace(
        /^```/i,
        ''
      )
      .replace(
        /```$/i,
        ''
      )
      .trim();

  return JSON.parse(
    cleaned
  );
}

async function verifyIncidentWithAI(
  pageTitle: string,
  path: string,
  status: number,
  errorText: string,
  failures: number
) {
  try {
    const raw =
      await generateGroqResponse(
        `
You are the incident verification assistant for Auronix Commerce LLC.

Determine whether a website page appears to have a real
technical outage based on health-check evidence.

Do NOT diagnose internal systems.
Do NOT invent facts.
Return JSON only:

{
  "incidentConfirmed": true,
  "confidence": 0,
  "reason": ""
}
`,
        `
Page:
${pageTitle}

Path:
${path}

HTTP status:
${status}

Error:
${errorText || 'none'}

Consecutive failed checks:
${failures}
`,
        500
      );

    const result =
      parseJson(
        raw
      );

    return {
      confirmed:
        result.incidentConfirmed ===
        true,

      confidence:
        Math.max(
          0,
          Math.min(
            100,
            Number(
              result.confidence
            ) || 0
          )
        ),

      reason:
        text(
          result.reason
        ),
    };
  } catch (
    error
  ) {
    console.error(
      'AI incident verification failed:',
      error
    );

    return {
      confirmed:
        false,

      confidence:
        0,

      reason:
        'AI verification unavailable.',
    };
  }
}

async function generateMaintenanceMessage(
  pageTitle: string,
  path: string,
  reason: string
) {
  try {
    const raw =
      await generateGroqResponse(
        `
Create a professional customer-facing maintenance message
for Auronix Commerce LLC.

Never mention code, servers, APIs, databases, frameworks,
stack traces, or internal implementation.

Do not invent recovery times.

Return JSON only:

{
  "title": "",
  "message": ""
}
`,
        `
Page:
${pageTitle}

Path:
${path}

Incident:
${reason}
`,
        500
      );

    const result =
      parseJson(
        raw
      );

    return {
      title:
        text(
          result.title
        ) ||
        DEFAULT_PAGE_CONTROL.maintenanceTitle,

      message:
        text(
          result.message
        ) ||
        DEFAULT_PAGE_CONTROL.maintenanceMessage,
    };
  } catch {
    return {
      title:
        'This page is temporarily unavailable',

      message:
        'We are currently making improvements to this page. Please check back shortly.',
    };
  }
}

async function main() {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.VERCEL_URL
      ? process.env.VERCEL_URL?.startsWith(
          'http'
        )
        ? process.env.VERCEL_URL
        : `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';

  let maintenanceCount =
    0;

  for (
    const page of SITE_PAGES
  ) {
    const key =
      encodePath(
        page.path
      );

    const controlSnapshot =
      await adminDb
        .ref(
          `sitePageControls/pages/${key}`
        )
        .get();

    const current =
      controlSnapshot.exists()
        ? {
            ...DEFAULT_PAGE_CONTROL,
            ...controlSnapshot.val(),
            path:
              page.path,
          }
        : {
            ...DEFAULT_PAGE_CONTROL,
            path:
              page.path,
          };

    const started =
      Date.now();

    let status = 0;
    let errorText = '';
    let success = false;

    try {
      const response =
        await fetch(
          `${baseUrl}${page.path}?__healthCheck=${Date.now()}`,
          {
            method:
              'GET',

            redirect:
              'manual',

            cache:
              'no-store',

            signal:
              AbortSignal.timeout(
                15000
              ),
          }
        );

      status =
        response.status;

      success =
        status >= 200 &&
        status < 400;

      if (!success) {
        errorText =
          `HTTP ${status}`;
      }
    } catch (
      error
    ) {
      errorText =
        error instanceof Error
          ? userFacingError(error)
          : 'Health request failed.';
    }

    const checkedAt =
      Date.now();

    let consecutiveFailures =
      success
        ? 0
        : Number(
            current.consecutiveFailures ||
              0
          ) + 1;

    let healthScore =
      success
        ? Math.min(
            100,
            Number(
              current.healthScore ||
                95
            ) + 2
          )
        : Math.max(
            0,
            Number(
              current.healthScore ||
                100
            ) - 25
          );

    let healthStatus =
      success
        ? 'healthy'
        : 'degraded';

    if (
      !success &&
      consecutiveFailures >=
        Number(
          current.failureThreshold ||
            3
        )
    ) {
      healthStatus =
        'down';

      const ai =
        await verifyIncidentWithAI(
          page.title,
          page.path,
          status,
          errorText,
          consecutiveFailures
        );

      const incidentId =
        `${Date.now()}_${Math.random()
          .toString(36)
          .slice(2)}`;

      await adminDb
        .ref(
          `siteOperationsIncidents/${incidentId}`
        )
        .set({
          pagePath:
            page.path,

          pageTitle:
            page.title,

          status:
            'open',

          httpStatus:
            status,

          error:
            errorText,

          consecutiveFailures,

          aiConfirmed:
            ai.confirmed,

          aiConfidence:
            ai.confidence,

          aiReason:
            ai.reason,

          createdAt:
            Date.now(),
        });

      if (
        maintenanceFlag(current.automaticMaintenanceEnabled) &&
        ai.confirmed
      ) {
        const generated =
          await generateMaintenanceMessage(
            page.title,
            page.path,
            ai.reason ||
              errorText
          );

        const activation = await adminDb
          .ref(
            `sitePageControls/pages/${key}`
          )
          .transaction((latest) => latest && maintenanceFlag(latest.automaticMaintenanceEnabled) ? {
            ...latest,
            maintenanceEnabled:
              true,

            maintenanceTitle:
              generated.title,

            maintenanceMessage:
              generated.message,

            healthStatus:
              'maintenance',

            healthScore:
              Math.max(
                0,
                Math.min(
                  20,
                  healthScore
                )
              ),

            lastCheckedAt:
              checkedAt,

            lastFailureAt:
              checkedAt,

            lastError:
              errorText,

            consecutiveFailures,

            updatedAt:
              checkedAt,

            updatedBy:
              'automatic-health-monitor',
          } : undefined);
        if (!activation.committed) continue;

        await adminDb
          .ref(
            `siteOperationsAudit/${incidentId}`
          )
          .set({
            action:
              'AUTO_MAINTENANCE_ACTIVATED',

            path:
              page.path,

            reason:
              ai.reason ||
              errorText,

            aiConfidence:
              ai.confidence,

            createdAt:
              Date.now(),
          });

        maintenanceCount += 1;

        await reportOperationalError('page-health-incident', new Error(ai.reason || errorText || `HTTP ${status}`), { path: page.path, status, consecutiveFailures, automaticMaintenance: true });

        continue;
      }
    }

    if (
      success &&
      current.maintenanceEnabled &&
      maintenanceFlag(current.automaticRecoveryEnabled) &&
      current.updatedBy === 'automatic-health-monitor'
    ) {
      const recovery = await adminDb
        .ref(
          `sitePageControls/pages/${key}`
        )
        .transaction(latest => latest && latest.updatedBy === 'automatic-health-monitor' && maintenanceFlag(latest.automaticRecoveryEnabled) ? {
          ...latest,
          maintenanceEnabled:
            false,

          healthStatus:
            'healthy',

          healthScore:
            100,

          consecutiveFailures:
            0,

          lastCheckedAt:
            checkedAt,

          lastSuccessAt:
            checkedAt,

          lastError:
            '',

          updatedAt:
            checkedAt,

          updatedBy:
            'automatic-health-recovery',
        } : undefined);
      if (!recovery.committed) continue;

      await adminDb
        .ref(
          `siteOperationsAudit/${Date.now()}_${Math.random()
            .toString(36)
            .slice(2)}`
        )
        .set({
          action:
            'AUTO_MAINTENANCE_RECOVERED',

          path:
            page.path,

          createdAt:
            Date.now(),
        });

      continue;
    }

    await adminDb
      .ref(
        `sitePageControls/pages/${key}`
      )
      .update({
        healthStatus:
          current.maintenanceEnabled
            ? 'maintenance'
            : healthStatus,

        healthScore,

        consecutiveFailures,

        lastCheckedAt:
          checkedAt,

        lastSuccessAt:
          success
            ? checkedAt
            : current.lastSuccessAt,

        lastFailureAt:
          success
            ? current.lastFailureAt
            : checkedAt,

        lastError:
          errorText,

        updatedAt:
          checkedAt,
      });

    void started;
  }

  return {
    maintenanceCount,
    checked:
      SITE_PAGES.length,
  };
}

export async function GET(
  request: Request
) {
  const expected =
    process.env.CRON_SECRET;

  const authHeader =
    request.headers.get(
      'authorization'
    );

  if (
    !expected ||
    authHeader !==
      `Bearer ${expected}`
  ) {
    return NextResponse.json(
      {
        success:
          false,

        error:
          'Unauthorized.',
      },
      {
        status: 401,
      }
    );
  }

  try {
    const result =
      await main();

    return NextResponse.json({
      success:
        true,

      ...result,
    });
  } catch (
    error
  ) {
    console.error(
      'Page health cron failed:',
      error
    );

    return NextResponse.json(
      {
        success:
          false,

        error:
          error instanceof Error
            ? userFacingError(error)
            : 'Health monitor failed.',
      },
      {
        status: 500,
      }
    );
  }
}
