export default function ProjectBoardLoading() {
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
                    <div className="h-10 w-32 bg-gray-200 rounded-lg animate-pulse" />
                    <div className="h-10 w-28 bg-gray-200 rounded-lg animate-pulse" />
                </div>
            </div>

            {/* Kanban board skeleton */}
            <div className="flex gap-4 overflow-x-auto pb-4">
                {[1, 2, 3, 4].map((col) => (
                    <div key={col} className="flex-shrink-0 w-72">
                        {/* Column header */}
                        <div className="flex items-center justify-between mb-3">
                            <div className="h-5 w-24 bg-gray-200 rounded animate-pulse" />
                            <div className="h-5 w-6 bg-gray-200 rounded animate-pulse" />
                        </div>
                        {/* Column body */}
                        <div className="rounded-xl bg-gray-50 border border-gray-200 p-3 space-y-3 min-h-[200px]">
                            {Array.from({ length: col === 1 ? 3 : col === 2 ? 2 : 1 }).map((_, i) => (
                                <div key={i} className="rounded-lg border border-gray-200 bg-white p-4 space-y-2">
                                    <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
                                    <div className="h-3 w-full bg-gray-200 rounded animate-pulse" />
                                    <div className="flex items-center justify-between mt-2">
                                        <div className="h-5 w-16 bg-gray-200 rounded-full animate-pulse" />
                                        <div className="h-6 w-6 bg-gray-200 rounded-full animate-pulse" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
