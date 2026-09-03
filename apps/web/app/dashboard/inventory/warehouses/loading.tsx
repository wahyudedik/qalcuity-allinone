export default function WarehousesLoading() {
    return (
        <div className="space-y-6 p-6">
            <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-48 mb-4" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-24 bg-gray-200 rounded-xl" />
                    ))}
                </div>
                <div className="h-96 bg-gray-200 rounded-xl" />
            </div>
        </div>
    )
}
