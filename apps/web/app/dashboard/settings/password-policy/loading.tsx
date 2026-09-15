export default function PasswordPolicyLoading() {
    return (
        <div className="p-6">
            <div className="animate-pulse space-y-4">
                <div className="h-8 bg-gray-200 rounded w-64"></div>
                <div className="h-4 bg-gray-200 rounded w-96"></div>
                <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                    <div className="h-6 bg-gray-200 rounded w-48"></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="h-10 bg-gray-200 rounded"></div>
                        <div className="h-10 bg-gray-200 rounded"></div>
                    </div>
                    <div className="space-y-3">
                        <div className="h-10 bg-gray-200 rounded"></div>
                        <div className="h-10 bg-gray-200 rounded"></div>
                        <div className="h-10 bg-gray-200 rounded"></div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                    <div className="h-6 bg-gray-200 rounded w-48"></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="h-10 bg-gray-200 rounded"></div>
                        <div className="h-10 bg-gray-200 rounded"></div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                    <div className="h-6 bg-gray-200 rounded w-48"></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="h-10 bg-gray-200 rounded"></div>
                        <div className="h-10 bg-gray-200 rounded"></div>
                    </div>
                </div>
            </div>
        </div>
    )
}
