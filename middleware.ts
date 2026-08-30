import {
  NextResponse,
} from 'next/server';

import type {
  NextRequest,
} from 'next/server';

export function middleware(
  request: NextRequest
) {
  const pathname =
    request.nextUrl.pathname;

  /* Preserve the original pathname for the server root layout. */
  const requestHeaders =
    new Headers(
      request.headers
    );

  requestHeaders.set(
    'x-auronix-pathname',
    pathname
  );

  /*
   * Admin, API and internal routes
   * are not public maintenance targets.
   */
  if (
    pathname === '/admin' ||
    pathname.startsWith('/admin/') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/')
  ) {
    return NextResponse.next({
      request: {
        headers:
          requestHeaders,
      },
    });
  }

  /*
   * Static files also pass normally.
   */
  if (
    pathname === '/favicon.ico' ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.jpeg') ||
    pathname.endsWith('.webp') ||
    pathname.endsWith('.gif') ||
    pathname.endsWith('.ico') ||
    pathname.endsWith('.css') ||
    pathname.endsWith('.js') ||
    pathname.endsWith('.map')
  ) {
    return NextResponse.next({
      request: {
        headers:
          requestHeaders,
      },
    });
  }

  return NextResponse.next({
    request: {
      headers:
        requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
