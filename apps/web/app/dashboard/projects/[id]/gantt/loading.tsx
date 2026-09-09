export default function ProjectGanttLoading() {
    return (
        <div className="space-y-6">
            {/* Back button skeleton */}
            <div className="h-10 w-48 bg-gray-200 rounded-lg animate-pulse" />

            {/* Project header skeleton */}
            <div className="flex items-center justify-between">
                <div className="space-y-2">
                    <div className="h-8 w-56 bg-gray-200 rounded animate-pulse" />
                    <div className="h-4 w-40 bg-gray-200 rounded animate-pulse" />
                </div>
                <div className="flex gap-3">
                    <div className="h-10 w-28 bg-gray-200 rounded-lg animate-pulse" />
                    <div className="h-10 w-36 bg-gray-200 rounded-lg animate-pulse" />
                </div>
            </div>

            {/* Timeline controls skeleton */}
            <div className="flex items-center gap-4">
                <div className="h-10 w-24 bg-gray-200 rounded-lg animate-pulse" />
                <div className="h-10 w-24 bg-gray-200 rounded-lg animate-pulse" />
                <div className="h-10 w-24 bg-gray-200 rounded-lg animate-pulse" />
            </div>

            {/* Gantt chart skeleton */}
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                {/* Timeline header */}
                <div className="flex border-b border-gray-200 bg-gray-50">
                    <div className="w-48 flex-shrink-0 px-4 py-3">
                        <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                    </div>
                    <div className="flex-1 flex">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="flex-1 px-2 py-3 border-l border-gray-200">
                                <div className="h-3 w-12 bg-gray-200 rounded animate-pulse mx-auto" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Task rows with bars */}
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex border-b border-gray-100 last:border-b-0">
                        <div className="w-48 flex-shrink-0 px-4 py-3">
                            <div className="h-4 bg-gray-200 rounded animate-pulse" style={{ width: `${50 + (i * 13) % 50}%` }} />
                        </div>
                        <div className="flex-1 flex items-center px-2 py-3">
                            <div
                                className="h-6 bg-gray-200 rounded animate-pulse"
                                style={{
                                    marginLeft: `${(i * 17) % 40}%`,
                                    width: `${20 + (i * 11) % 40}%`,
                                }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
