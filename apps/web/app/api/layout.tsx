// Force all API routes to be dynamic (opt out of static rendering).
// API routes use session, headers, cookies, or other request-time data,
// so Next.js should never attempt to pre-render them during build.
export const dynamic = 'force-dynamic';
