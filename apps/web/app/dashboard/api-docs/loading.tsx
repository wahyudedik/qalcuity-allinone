/**
 * Loading state for API Documentation page.
 */

export default function ApiDocsLoading() {
    return (
        <div className="p-6">
            <div className="animate-pulse">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-gray-200 rounded-lg h-10 w-10" />
                    <div>
                        <div className="h-8 bg-gray-200 rounded w-48 mb-2" />
                        <div className="h-4 bg-gray-200 rounded w-64" />
                    </div>
                </div>
                <div className="h-12 bg-gray-200 rounded-lg mb-4" />
                <div className="h-96 bg-gray-200 rounded-xl" />
            </div>
        </div>
    );
}
