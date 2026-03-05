import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware: sets security headers including a compatible Content-Security-Policy.
 *
 * NOTE: A nonce-based script-src requires full Next.js app router nonce integration
 * (reading x-csp-nonce in layout.tsx and passing it to every <Script> tag including
 * the theme-toggle inline script). That wiring is complex. Until it is fully implemented,
 * we use 'unsafe-inline' for scripts — which is what the Next.js default ships with —
 * while still hardening all other directives (HSTS, X-Frame-Options, nosniff, etc.).
 */
export function middleware(request: NextRequest) {
    const isProd = process.env.NODE_ENV === 'production';

    const csp = [
        `default-src 'self'`,
        // 'unsafe-inline' is required by Next.js for its own injected scripts and theme toggles.
        // 'unsafe-eval' is only needed in dev for hot-reload.
        `script-src 'self' 'unsafe-inline'${isProd ? '' : " 'unsafe-eval'"}`,
        `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
        `font-src 'self' data: https://fonts.gstatic.com`,
        `img-src 'self' data: https:`,
        `connect-src 'self' https: wss:`,
        `frame-ancestors 'none'`,
        `object-src 'none'`,
        `base-uri 'self'`,
        `form-action 'self'`,
    ].join('; ');

    const response = NextResponse.next();

    response.headers.set('Content-Security-Policy', csp);
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

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
