'use client';

/**
 * Kitchen Display System — Order Timer Component
 *
 * Timer yang menampilkan elapsed time dengan auto-update setiap detik.
 * Warna berubah berdasarkan persentase waktu yang tersisa:
 * - Hijau: < 50% waktu terpakai
 * - Kuning: 50-100% waktu terpakai
 * - Merah: > 100% waktu (overdue)
 *
 * Ref: plans/pos-kitchen-display-architecture.md Section 5.1.4
 */

import { useState, useEffect } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

interface KitchenOrderTimerProps {
    /** ISO timestamp when the order started being prepared */
    startTime: string | null;
    /** Estimated preparation time in minutes (null = no estimate) */
    estimatedMinutes: number | null;
    /** Whether the order is in a terminal state (served/cancelled) */
    isTerminal?: boolean;
    /** Size variant */
    size?: 'sm' | 'md' | 'lg';
}

// =============================================================================
// Helpers
// =============================================================================

function formatElapsed(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
}

function getTimerColor(elapsedSeconds: number, estimatedMinutes: number | null): {
    textClass: string;
    bgClass: string;
    isOverdue: boolean;
} {
    if (!estimatedMinutes) {
        return {
            textClass: 'text-gray-700',
            bgClass: 'bg-gray-100',
            isOverdue: false,
        };
    }

    const estimatedSeconds = estimatedMinutes * 60;
    const ratio = elapsedSeconds / estimatedSeconds;

    if (ratio < 0.5) {
        return {
            textClass: 'text-green-700',
            bgClass: 'bg-green-100',
            isOverdue: false,
        };
    }
    if (ratio <= 1.0) {
        return {
            textClass: 'text-yellow-700',
            bgClass: 'bg-yellow-100',
            isOverdue: false,
        };
    }
    return {
        textClass: 'text-red-700',
        bgClass: 'bg-red-100',
        isOverdue: true,
    };
}

// =============================================================================
// Component
// =============================================================================

/**
 * Real-time timer showing elapsed preparation time.
 *
 * - Auto-updates every second when order is actively being prepared
 * - Color-coded: green < 50%, yellow 50-100%, red > 100%
 * - Shows estimated time if available
 */
export function KitchenOrderTimer({
    startTime,
    estimatedMinutes,
    isTerminal = false,
    size = 'md',
}: KitchenOrderTimerProps) {
    const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

    // Calculate initial elapsed
    useEffect(() => {
        if (!startTime || isTerminal) {
            setElapsedSeconds(0);
            return;
        }

        const startMs = new Date(startTime).getTime();
        const initialElapsed = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
        setElapsedSeconds(initialElapsed);
    }, [startTime, isTerminal]);

    // Auto-update every second (only for active orders)
    useEffect(() => {
        if (!startTime || isTerminal) return;

        const interval = setInterval(() => {
            const startMs = new Date(startTime).getTime();
            const elapsed = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
            setElapsedSeconds(elapsed);
        }, 1000);

        return () => clearInterval(interval);
    }, [startTime, isTerminal]);

    // Don't render if no start time
    if (!startTime) {
        return (
            <div className={`inline-flex items-center gap-1.5 text-gray-400 ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
                <Clock className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />
                <span>Belum dimulai</span>
            </div>
        );
    }

    const { textClass, bgClass, isOverdue } = getTimerColor(elapsedSeconds, estimatedMinutes);

    const sizeClasses = {
        sm: 'text-xs px-1.5 py-0.5',
        md: 'text-sm px-2 py-1',
        lg: 'text-base px-3 py-1.5 font-semibold',
    };

    return (
        <div className="flex items-center gap-2">
            <span
                className={`inline-flex items-center gap-1.5 rounded-md font-mono ${textClass} ${bgClass} ${sizeClasses[size]}`}
            >
                {isOverdue ? (
                    <AlertTriangle className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />
                ) : (
                    <Clock className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />
                )}
                {formatElapsed(elapsedSeconds)}
            </span>
            {estimatedMinutes && (
                <span className="text-gray-400">
                    / {estimatedMinutes}:00
                </span>
            )}
        </div>
    );
}
