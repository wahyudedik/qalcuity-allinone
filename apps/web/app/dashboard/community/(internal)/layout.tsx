import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserPermissions } from '@/lib/permissions'

/**
 * Server-side permission guard untuk area internal komunitas.
 * User tanpa community:view/manage/finance (mis. WARGA dengan community:portal saja)
 * diarahkan ke portal warga.
 */
export default async function CommunityInternalLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const session = await getServerSession(authOptions)

    if (!session) {
        redirect('/auth/login')
    }

    const permissions = await getUserPermissions(session)
    const canAccessInternal =
        permissions.includes('community:view') ||
        permissions.includes('community:manage') ||
        permissions.includes('community:finance')

    if (!canAccessInternal) {
        redirect('/dashboard/community/portal')
    }

    return <>{children}</>
}
