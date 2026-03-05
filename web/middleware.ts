import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware: adds a per-request CSP nonce and tightens the Content-Security-Policy.
 *
 * Why: 'unsafe-inline' in next.config.ts allows any inline script to run, defeating XSS
 * protection. A nonce ensures only Next.js-injected scripts (which receive the nonce) execute.
 *
 * The nonce is placed in the `x-csp-nonce` response header so that the root layout
 * can read it via `headers()` and pass it to `<Script nonce={nonce}>` tags.
 */
export function middleware(request: NextRequest) {
    const nonce = crypto.randomUUID().replace(/-/g, '');
    const isProd = process.env.NODE_ENV === 'production';

    const csp = [
        `default-src 'self'`,
        // Next.js needs 'unsafe-eval' in dev for hot-reload; locked down in prod
        `script-src 'self' 'nonce-${nonce}'${isProd ? '' : " 'unsafe-eval'"}`,
        `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
        `font-src 'self' data: https://fonts.gstatic.com`,
        `img-src 'self' data: https:`,
        `connect-src 'self' https: wss:`,
        `frame-ancestors 'none'`,
        `object-src 'none'`,
        `base-uri 'self'`,
        `form-action 'self'`,
    ].join('; ');

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-csp-nonce', nonce);

    const response = NextResponse.next({
        request: { headers: requestHeaders },
    });

    response.headers.set('Content-Security-Policy', csp);
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    response.headers.set('x-csp-nonce', nonce);

    return response;
}

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (Next.js image optimization)
         * - favicon.ico
         * - Public files (images, fonts, etc.)
         */
        '/((?!_next/static|_next/image|favicon.ico|public/|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|woff2?|ttf|csv|json|gz)$).*)',
    ],
};
