'use client';

/**
 * Gantt Chart Page — Visual timeline untuk project tasks
 *
 * Menampilkan Gantt chart dengan task dependencies, progress bars,
 * dan today marker. Menggunakan GanttChart component.
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, BarChart3, RefreshCw, AlertCircle } from 'lucide-react';
import { GanttChart, type GanttData } from '@/components/operations/gantt-chart';
import { ProjectTimeline, type TimelineData } from '@/components/operations/project-timeline';

export default function GanttPage() {
    const params = useParams();
    const router = useRouter();
    const projectId = params?.id as string;

    const [ganttData, setGanttData] = useState<GanttData | null>(null);
    const [timelineData, setTimelineData] = useState<TimelineData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const fetchGanttData = useCallback(async () => {
        try {
            setError(null);
            const response = await fetch(`/api/projects/${projectId}/gantt`);
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || 'Gagal memuat data Gantt');
            }
            const data = await response.json();
            setGanttData(data);

            // Build timeline data from gantt data
            if (data.project) {
                setTimelineData({
                    project: data.project,
                    tasks: (data.tasks || []).map((t: GanttData['tasks'][0]) => ({
                        id: t.id,
                        title: t.title,
                        status: t.status,
                        startDate: t.startDate,
                        endDate: t.endDate,
                        dueDate: t.dueDate,
                        progress: t.progress,
                        priority: t.priority,
                    })),
                });
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [projectId]);

    useEffect(() => {
        if (projectId) {
            void fetchGanttData();
        }
    }, [projectId, fetchGanttData]);

    const handleRefresh = () => {
        setRefreshing(true);
        void fetchGanttData();
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.push(`/dashboard/projects/${projectId}`)}
                        className="rounded-lg border border-gray-300 p-2 text-gray-500 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <BarChart3 className="h-6 w-6 text-blue-600" />
                            Gantt Chart
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Timeline visual project tasks
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
                    >
                        <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Error State */}
            {error && !ganttData && (
                <div className="flex flex-col items-center justify-center min-h-[400px] rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                    <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">{error}</p>
                    <button
                        onClick={handleRefresh}
                        className="mt-4 text-sm text-blue-600 hover:text-blue-700"
                    >
                        Coba lagi
                    </button>
                </div>
            )}

            {/* Project Timeline */}
            {!error && (
                <ProjectTimeline data={timelineData} loading={loading} />
            )}

            {/* Gantt Chart */}
            {!error && (
                <GanttChart data={ganttData} loading={loading} />
            )}
        </div>
    );
}
