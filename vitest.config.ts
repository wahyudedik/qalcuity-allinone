import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: [
            'packages/*/src/**/*.test.ts',
            'apps/web/__tests__/**/*.test.ts',
        ],
        exclude: [
            'apps/web/__tests__/e2e-test.ts', // Existing integration test, not unit test
            'node_modules',
            'dist',
        ],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html'],
            include: [
                'packages/*/src/**/*.ts',
                'apps/web/lib/**/*.ts',
            ],
            exclude: [
                '**/*.test.ts',
                '**/*.d.ts',
                '**/index.ts',
            ],
        },
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'apps/web'),
            '@qalcuity/permissions': path.resolve(__dirname, 'packages/permissions/src'),
            '@qalcuity/workflow': path.resolve(__dirname, 'packages/workflow/src'),
            '@qalcuity/analytics': path.resolve(__dirname, 'packages/analytics/src'),
            '@qalcuity/industry-config': path.resolve(__dirname, 'packages/industry-config/src'),
            '@qalcuity/config': path.resolve(__dirname, 'packages/config/src'),
            '@qalcuity/types': path.resolve(__dirname, 'packages/types/src'),
            '@qalcuity/utils': path.resolve(__dirname, 'packages/utils/src'),
        },
    },
});
