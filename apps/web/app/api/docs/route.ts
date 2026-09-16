/**
 * GET /api/docs — Serves the OpenAPI 3.0 specification as JSON.
 *
 * Public endpoint (no auth required) for developer experience.
 * Rate limited to 30 requests per 60 seconds.
 *
 * @see apps/web/lib/api-docs/openapi-spec.ts
 * @see apps/web/app/dashboard/api-docs/page.tsx
 */

import { NextResponse } from 'next/server';
import { generateOpenApiSpec } from '@/lib/api-docs/openapi-spec';
import { withRateLimit } from '@/lib/with-rate-limit';

export async function GET(req: Request) {
    // Rate limit: 30 requests per 60 seconds for docs endpoint
    const rlResponse = await withRateLimit(req, {
        skip: false,
    });
    if (rlResponse) return rlResponse;

    try {
        const spec = generateOpenApiSpec();

        return NextResponse.json(spec, {
            status: 200,
            headers: {
                'Cache-Control': 'public, max-age=3600, s-maxage=3600',
                'Content-Type': 'application/json; charset=utf-8',
            },
        });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: 'Failed to generate API specification' },
            { status: 500 }
        );
    }
}
