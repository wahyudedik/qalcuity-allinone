export default function StockOpnameLoading() {
    return (
        <div className="space-y-6 p-6">
            <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-48 mb-4" />
                <div className="flex gap-2 mb-6">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="h-10 bg-gray-200 rounded-lg w-24" />
                    ))}
                </div>
                <div className="h-96 bg-gray-200 rounded-xl" />
            </div>
        </div>
    )
}
