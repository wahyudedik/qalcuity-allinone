export default function ProjectEditLoading() {
    return (
        <div className="space-y-6">
            {/* Back button skeleton */}
            <div className="h-10 w-48 bg-gray-200 rounded-lg animate-pulse" />

            {/* Page header */}
            <div className="flex items-center justify-between">
                <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
                <div className="flex gap-3">
                    <div className="h-10 w-24 bg-gray-200 rounded-lg animate-pulse" />
                    <div className="h-10 w-32 bg-gray-200 rounded-lg animate-pulse" />
                </div>
            </div>

            {/* Form skeleton */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-6">
                {/* Project name */}
                <div className="space-y-2">
                    <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                    <div className="h-10 w-full bg-gray-200 rounded-lg animate-pulse" />
                </div>

                {/* Description */}
                <div className="space-y-2">
                    <div className="h-4 w-28 bg-gray-200 rounded animate-pulse" />
                    <div className="h-24 w-full bg-gray-200 rounded-lg animate-pulse" />
                </div>

                {/* Date fields */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                        <div className="h-4 w-28 bg-gray-200 rounded animate-pulse" />
                        <div className="h-10 w-full bg-gray-200 rounded-lg animate-pulse" />
                    </div>
                    <div className="space-y-2">
                        <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                        <div className="h-10 w-full bg-gray-200 rounded-lg animate-pulse" />
                    </div>
                </div>

                {/* Status & priority */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                        <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
                        <div className="h-10 w-full bg-gray-200 rounded-lg animate-pulse" />
                    </div>
                    <div className="space-y-2">
                        <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
                        <div className="h-10 w-full bg-gray-200 rounded-lg animate-pulse" />
                    </div>
                </div>

                {/* Team members */}
                <div className="space-y-2">
                    <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                    <div className="flex flex-wrap gap-2">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-8 w-28 bg-gray-200 rounded-full animate-pulse" />
                        ))}
                    </div>
                </div>

                {/* Budget */}
                <div className="space-y-2">
                    <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
                    <div className="h-10 w-48 bg-gray-200 rounded-lg animate-pulse" />
                </div>
            </div>
        </div>
    )
}
