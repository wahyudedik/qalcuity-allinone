export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { MSG } from '@/lib/api-messages';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { handleApiError } from '@/lib/api-error';

export async function GET(request: Request) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:timesheet:${ip}`, 100, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { tenantId } = auth;
        const { searchParams } = new URL(request.url);
        const employeeId = searchParams.get('employeeId');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const view = searchParams.get('view') || 'weekly'; // weekly or monthly

        // Default date range: current week or month
        const now = new Date();
        let dateFrom: Date;
        let dateTo: Date;

        if (startDate && endDate) {
            dateFrom = new Date(startDate);
            dateTo = new Date(endDate);
        } else if (view === 'monthly') {
            // Current month
            dateFrom = new Date(now.getFullYear(), now.getMonth(), 1);
            dateTo = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        } else {
            // Current week (Monday to Sunday)
            const dayOfWeek = now.getDay();
            const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
            dateFrom = new Date(now);
            dateFrom.setDate(now.getDate() + mondayOffset);
            dateFrom.setHours(0, 0, 0, 0);
            dateTo = new Date(dateFrom);
            dateTo.setDate(dateFrom.getDate() + 6);
            dateTo.setHours(23, 59, 59, 999);
        }

        const where: Record<string, unknown> = {
            tenantId,
            date: {
                gte: dateFrom,
                lte: dateTo,
            },
        };

        if (employeeId) {
            where.employeeId = employeeId;
        }

        const timeLogs = await prisma.timeLog.findMany({
            where,
            include: {
                task: {
                    select: {
                        id: true,
                        title: true,
                        projectId: true,
                        project: {
                            select: { id: true, name: true },
                        },
                    },
                },
            },
            orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
        });

        // Group by employee
        const groupedByEmployee: Record<string, {
            employeeId: string;
            totalHours: number;
            entries: Array<{
                id: string;
                taskId: string;
                taskTitle: string;
                projectId: string;
                projectName: string;
                date: string;
                hours: number;
                description: string | null;
            }>;
        }> = {};

        for (const log of timeLogs) {
            const empId = log.employeeId;
            if (!groupedByEmployee[empId]) {
                groupedByEmployee[empId] = {
                    employeeId: empId,
                    totalHours: 0,
                    entries: [],
                };
            }
            const hours = Number(log.hours);
            groupedByEmployee[empId].totalHours += hours;
            groupedByEmployee[empId].entries.push({
                id: log.id,
                taskId: log.taskId,
                taskTitle: log.task.title,
                projectId: log.task.projectId,
                projectName: log.task.project.name,
                date: log.date.toISOString(),
                hours,
                description: log.description,
            });
        }

        // Also get a grand total
        const grandTotal = Object.values(groupedByEmployee).reduce(
            (sum, emp) => sum + emp.totalHours,
            0
        );

        return NextResponse.json({
            success: true,
            data: {
                dateFrom: dateFrom.toISOString(),
                dateTo: dateTo.toISOString(),
                view,
                grandTotal,
                employees: Object.values(groupedByEmployee),
            },
        });
    } catch (error) {
        return handleApiError(error);
    }
}
