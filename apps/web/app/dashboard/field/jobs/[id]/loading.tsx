export default function FieldJobDetailLoading() {
    return (
        <div className="space-y-6 p-6">
            <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
            <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-4">
                    <div className="h-32 bg-gray-200 rounded-xl animate-pulse" />
                    <div className="h-24 bg-gray-200 rounded-xl animate-pulse" />
                    <div className="h-48 bg-gray-200 rounded-xl animate-pulse" />
                </div>
                <div className="space-y-4">
                    <div className="h-32 bg-gray-200 rounded-xl animate-pulse" />
                    <div className="h-48 bg-gray-200 rounded-xl animate-pulse" />
                    <div className="h-24 bg-gray-200 rounded-xl animate-pulse" />
                </div>
            </div>
        </div>
    );
}
