export default function POSTerminalLoading() {
    return (
        <div className="flex h-[calc(100vh-12rem)] animate-pulse">
            {/* Left side - Product grid */}
            <div className="flex-1 p-4 space-y-4">
                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg w-full" />
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {Array.from({ length: 12 }).map((_, i) => (
                        <div key={i} className="h-28 bg-gray-200 dark:bg-gray-700 rounded-lg" />
                    ))}
                </div>
            </div>
            {/* Right side - Cart */}
            <div className="w-96 border-l border-gray-200 dark:border-gray-700 p-4 space-y-4">
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-32" />
                <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg" />
                    ))}
                </div>
                <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded-lg mt-4" />
                <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg" />
            </div>
        </div>
    )
}
