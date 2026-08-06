import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

export async function getSession() {
    return await getServerSession(authOptions);
}

export async function requireAuth() {
    const session = await getSession();
    if (!session?.user?.tenantId) {
        throw new Error("Unauthorized");
    }
    return {
        userId: session.user.id,
        tenantId: session.user.tenantId,
        role: session.user.role,
    };
}
