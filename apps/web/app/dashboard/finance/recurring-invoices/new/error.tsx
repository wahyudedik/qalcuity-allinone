'use client';

import { ModuleError } from '@/components/ui/error-boundary';

export default function NewRecurringInvoiceError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <ModuleError
            error={error}
            reset={reset}
            title="Failed to Create Recurring Invoice"
            description="An error occurred while loading the new recurring invoice form. Please try again."
        />
    );
}
