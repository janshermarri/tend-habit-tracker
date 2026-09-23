import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, isSessionValid } from '@/lib/session';

/**
 * Gate every page on a valid PIN session.
 *
 * Only verifies the cookie signature — cheap, stateless crypto. The PIN itself
 * is checked in the `unlock` Server Action; proxy may run detached from the app
 * runtime, so it must not depend on shared modules or globals.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === '/unlock') {
    // Already unlocked? Skip the PIN screen.
    if (isSessionValid(request.cookies.get(SESSION_COOKIE)?.value)) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  if (isSessionValid(request.cookies.get(SESSION_COOKIE)?.value)) {
    return NextResponse.next();
  }

  const url = new URL('/unlock', request.url);
  // Send the user back where they were headed once unlocked.
  if (pathname !== '/') url.searchParams.set('next', pathname);
  return NextResponse.redirect(url);
}

export const config = {
  // Everything except static assets, the manifest and the favicon.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
