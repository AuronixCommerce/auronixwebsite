import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireAdmin } from '@/lib/server-auth';

export async function GET(request: Request) {
  try {
    await requireAdmin(request);

    const snapshot = await adminDb
      .ref('settings/adminAvailability')
      .get();

    const value = snapshot.exists()
      ? snapshot.val()
      : {
          online: true,
          updatedAt: Date.now(),
        };

    return NextResponse.json({
      online: value?.online !== false,
      updatedAt: value?.updatedAt || null,
      updatedBy: value?.updatedBy || null,
    });
  } catch (error) {
    console.error(
      'Admin availability GET failed:',
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unable to load admin availability.',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin(request);

    const body = await request.json();
    const online = Boolean(body.online);

    const record = {
      online,
      updatedAt: Date.now(),
      updatedBy: admin.uid,
    };

    await adminDb
      .ref('settings/adminAvailability')
      .set(record);

    return NextResponse.json({
      success: true,
      ...record,
    });
  } catch (error) {
    console.error(
      'Admin availability POST failed:',
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unable to update admin availability.',
      },
      { status: 500 }
    );
  }
}
