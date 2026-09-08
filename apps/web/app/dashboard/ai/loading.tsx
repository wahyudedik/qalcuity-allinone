export default function AILoading() {
    return (
        <div className="space-y-6">
            <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-4 w-96 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
                ))}
            </div>
        </div>
    );
}
