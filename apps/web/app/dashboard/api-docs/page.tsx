'use client';

/**
 * API Documentation Page — Swagger UI via CDN
 *
 * Renders Swagger UI from CDN, fetching the OpenAPI spec from /api/docs.
 * Accessible to ADMIN users from the Settings sidebar.
 *
 * @see apps/web/app/api/docs/route.ts — OpenAPI spec endpoint
 * @see apps/web/lib/api-docs/openapi-spec.ts — Spec generator
 */

import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';
import { usePermission } from '@/lib/use-permission';
import { FileCode, ExternalLink, Loader2 } from 'lucide-react';

export default function ApiDocsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const { t } = useTranslation();
    const { hasPermission } = usePermission();
    const swaggerRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Permission check: user harus memiliki system:view permission
    useEffect(() => {
        if (status === 'loading') return;
        if (!hasPermission('system:view')) {
            router.push('/dashboard');
        }
    }, [session, status, router, hasPermission]);

    useEffect(() => {
        if (status === 'loading' || !swaggerRef.current) return;

        const loadSwaggerUI = async () => {
            try {
                // Load Swagger UI CSS
                if (!document.querySelector('link[href*="swagger-ui"]')) {
                    const link = document.createElement('link');
                    link.rel = 'stylesheet';
                    link.href = 'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.18.2/swagger-ui.css';
                    document.head.appendChild(link);
                }

                // Load Swagger UI JS
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const win = window as any;
                if (!win.SwaggerUIBundle) {
                    await new Promise<void>((resolve, reject) => {
                        const script = document.createElement('script');
                        script.src = 'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.18.2/swagger-ui-bundle.js';
                        script.onload = () => resolve();
                        script.onerror = () => reject(new Error('Failed to load Swagger UI'));
                        document.body.appendChild(script);
                    });
                }

                // Clear previous instance
                if (swaggerRef.current) {
                    swaggerRef.current.innerHTML = '';
                }

                // Initialize Swagger UI
                if (win.SwaggerUIBundle && swaggerRef.current) {
                    win.SwaggerUIBundle({
                        url: '/api/docs',
                        domNode: swaggerRef.current,
                        presets: [
                            win.SwaggerUIBundle.presets?.Apis,
                            win.SwaggerUIBundle.presets?.standalone,
                        ].filter(Boolean),
                        layout: 'StandaloneLayout',
                        deepLinking: true,
                        docExpansion: 'list',
                        defaultModelsExpandDepth: -1,
                        defaultModelExpandDepth: 1,
                        filter: true,
                        tryItOutEnabled: true,
                    });
                }

                setLoading(false);
            } catch (err) {
                console.error('Failed to load Swagger UI:', err);
                setError('Failed to load API documentation. Please try again later.');
                setLoading(false);
            }
        };

        loadSwaggerUI();
    }, [status]);

    if (status === 'loading') {
        return (
            <div className="p-6">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-48 mb-4" />
                    <div className="h-96 bg-gray-200 rounded-xl" />
                </div>
            </div>
        );
    }

    if (!hasPermission('system:view')) {
        return null;
    }

    return (
        <div className="p-6">
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-blue-100 rounded-lg">
                        <FileCode className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            {t('apiDocs.title') || 'API Documentation'}
                        </h1>
                        <p className="text-gray-600 mt-1">
                            {t('apiDocs.subtitle') || 'Interactive API reference for Qalcuity REST API'}
                        </p>
                    </div>
                </div>

                {/* Quick links */}
                <div className="flex gap-3 mt-4">
                    <a
                        href="/api/docs"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        <ExternalLink className="h-4 w-4" />
                        {t('apiDocs.viewRawSpec') || 'View Raw Spec (JSON)'}
                    </a>
                </div>
            </div>

            {/* Error state */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                    <p className="text-red-700">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
                    >
                        {t('common.refresh') || 'Retry'}
                    </button>
                </div>
            )}

            {/* Loading state */}
            {loading && !error && (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
                    <span className="ml-3 text-gray-600">
                        {t('apiDocs.loading') || 'Loading API documentation...'}
                    </span>
                </div>
            )}

            {/* Swagger UI container */}
            <div
                ref={swaggerRef}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden"
                style={{ minHeight: '600px' }}
            />

            {/* Info footer */}
            <div className="mt-6 bg-gray-50 rounded-xl p-4 border border-gray-200">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">
                    {t('apiDocs.quickStart') || 'Quick Start'}
                </h3>
                <div className="text-sm text-gray-600 space-y-1">
                    <p>
                        <strong>{t('apiDocs.authStep') || '1. Authenticate:'}</strong>{' '}
                        <code className="bg-gray-200 px-1.5 py-0.5 rounded text-xs">
                            POST /api/auth/login
                        </code>{' '}
                        {t('apiDocs.authStepDesc') || '— Get your JWT token'}
                    </p>
                    <p>
                        <strong>{t('apiDocs.authorizeStep') || '2. Authorize:'}</strong>{' '}
                        {t('apiDocs.authorizeStepDesc') || 'Click the "Authorize" button above and enter your token'}
                    </p>
                    <p>
                        <strong>{t('apiDocs.exploreStep') || '3. Explore:'}</strong>{' '}
                        {t('apiDocs.exploreStepDesc') || 'Browse endpoints by module, try requests directly from the browser'}
                    </p>
                </div>
            </div>
        </div>
    );
}
