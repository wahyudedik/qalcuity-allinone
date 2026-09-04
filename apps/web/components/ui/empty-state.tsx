'use client'

import type { LucideIcon } from 'lucide-react'
import { Inbox } from 'lucide-react'

interface EmptyStateProps {
    icon?: LucideIcon
    title: string
    description?: string
    actionLabel?: string
    onAction?: () => void
}

export function EmptyState({
    icon: Icon = Inbox,
    title,
    description,
    actionLabel,
    onAction,
}: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white px-6 py-12 text-center dark:border-gray-700 dark:bg-gray-800">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
                <Icon className="h-7 w-7 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-gray-900 dark:text-gray-100">
                {title}
            </h3>
            {description && (
                <p className="mt-1.5 max-w-sm text-sm text-gray-500 dark:text-gray-400">
                    {description}
                </p>
            )}
            {actionLabel && onAction && (
                <button
                    onClick={onAction}
                    className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                    {actionLabel}
                </button>
            )}
        </div>
    )
}
