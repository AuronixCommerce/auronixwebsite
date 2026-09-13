import { userFacingError } from '@/lib/user-facing-error';
import { NextResponse } from 'next/server';

import { adminDb } from '@/lib/firebase-admin';
import { requireAdmin } from '@/lib/server-auth';

function text(value: unknown): string {
  return typeof value === 'string'
    ? value.trim()
    : '';
}

export async function GET(
  request: Request
) {
  try {
    await requireAdmin(request);

    const snapshot =
      await adminDb
        .ref('siteChangelog')
        .get();

    if (!snapshot.exists()) {
      return NextResponse.json([]);
    }

    const value =
      snapshot.val();

    const entries =
      Object.entries(value || {}).map(
        ([id, item]) => ({
          id,
          ...(item as object),
        })
      );

    entries.sort(
      (a: any, b: any) =>
        Number(
          b.releaseDate ||
          b.createdAt ||
          0
        ) -
        Number(
          a.releaseDate ||
          a.createdAt ||
          0
        )
    );

    return NextResponse.json(
      entries
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? userFacingError(error)
            : 'Unable to load changelog.',
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
    const admin =
      await requireAdmin(request);

    const body =
      await request.json();

    const version =
      text(body.version);

    const title =
      text(body.title);

    const summary =
      text(body.summary);

    if (
      !version ||
      !title ||
      !summary
    ) {
      return NextResponse.json(
        {
          error:
            'Version, title, and summary are required.',
        },
        {
          status: 400,
        }
      );
    }

    const features =
      Array.isArray(body.features)
        ? body.features
            .filter(
              (item: unknown) =>
                typeof item === 'string'
            )
            .map(
              (item: string) =>
                item.trim()
            )
            .filter(Boolean)
            .slice(0, 30)
        : [];

    const fixes =
      Array.isArray(body.fixes)
        ? body.fixes
            .filter(
              (item: unknown) =>
                typeof item === 'string'
            )
            .map(
              (item: string) =>
                item.trim()
            )
            .filter(Boolean)
            .slice(0, 30)
        : [];

    const improvements =
      Array.isArray(
        body.improvements
      )
        ? body.improvements
            .filter(
              (item: unknown) =>
                typeof item === 'string'
            )
            .map(
              (item: string) =>
                item.trim()
            )
            .filter(Boolean)
            .slice(0, 30)
        : [];

    const data = {
      version,
      title,
      summary,
      releaseDate:
        Number(
          body.releaseDate
        ) || Date.now(),
      features,
      fixes,
      improvements,
      published:
        body.published !== false,
      createdAt:
        Date.now(),
      createdBy:
        admin.uid,
    };

    const newRef =
      adminDb
        .ref('siteChangelog')
        .push();

    await newRef.set(data);

    return NextResponse.json({
      success: true,
      id: newRef.key,
      ...data,
    });
  } catch (error) {
    console.error(
      'Admin changelog POST failed:',
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? userFacingError(error)
            : 'Unable to create release.',
      },
      {
        status: 500,
      }
    );
  }
}

export async function DELETE(
  request: Request
) {
  try {
    await requireAdmin(request);

    const body =
      await request.json();

    const id =
      text(body.id);

    if (!id) {
      return NextResponse.json(
        {
          error:
            'Release ID is required.',
        },
        {
          status: 400,
        }
      );
    }

    await adminDb
      .ref(`siteChangelog/${id}`)
      .remove();

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? userFacingError(error)
            : 'Unable to delete release.',
      },
      {
        status: 500,
      }
    );
  }
}
