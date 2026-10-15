export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { sanitizeInput } from '@/lib/sanitize';
import { logAudit, toAuditPayload } from '@/lib/audit';
import { createEmployeeSchema, updateEmployeeSchema, formatZodError } from '@/lib/validation-schemas';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { MSG } from '@/lib/api-messages';
import { handleApiError } from '@/lib/api-error';
import { optimisticUpdateRaw } from '@/lib/optimistic-lock';

// ─── GET /api/hr/employees/[id] ────────────────────────────────────────────────
// Ambil detail SATU employee berdasarkan ID (termasuk attendance, leaves, payroll).
// Catatan: sebelumnya handler ini adalah copy-paste dari list handler (mengabaikan
// params.id dan mengembalikan array) — diperbaiki 2026-10-15.

export async function GET(request: Request, { params }: { params: { id: string } }) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { tenantId } = auth;
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:employees:${ip}`, 100, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json({ error: MSG.TOO_MANY_REQUESTS, code: 'TOO_MANY_REQUESTS' }, { status: 429 });
        }

        const employee = await prisma.employee.findFirst({
            where: { id: params.id, tenantId, deletedAt: null },
            include: {
                attendanceRecords: {
                    orderBy: { date: 'desc' },
                    take: 30,
                    select: {
                        id: true,
                        date: true,
                        clockIn: true,
                        clockOut: true,
                        status: true,
                        workHours: true,
                    },
                },
                leaveRequests: {
                    orderBy: { startDate: 'desc' },
                    take: 30,
                    select: {
                        id: true,
                        type: true,
                        startDate: true,
                        endDate: true,
                        days: true,
                        reason: true,
                        status: true,
                        appliedDate: true,
                    },
                },
                payrollRecords: {
                    orderBy: { createdAt: 'desc' },
                    take: 12,
                    select: {
                        id: true,
                        period: true,
                        baseSalary: true,
                        allowances: true,
                        deductions: true,
                        netSalary: true,
                        status: true,
                    },
                },
            },
        });

        if (!employee) {
            return NextResponse.json(
                { success: false, error: MSG.EMPLOYEE_NOT_FOUND, code: 'EMPLOYEE_NOT_FOUND' },
                { status: 404 }
            );
        }

        const data = {
            id: employee.id,
            employeeId: employee.employeeId,
            name: employee.name,
            email: employee.email,
            phone: employee.phone || '',
            position: employee.position,
            department: employee.department || '',
            joinDate: employee.joinDate.toISOString(),
            salary: Number(employee.salary),
            status: employee.status,
            version: employee.version,
            createdAt: employee.createdAt.toISOString(),
            attendance: employee.attendanceRecords.map((a) => ({
                id: a.id,
                date: a.date.toISOString(),
                clockIn: a.clockIn?.toISOString() || null,
                clockOut: a.clockOut?.toISOString() || null,
                status: a.status,
                workHours: Number(a.workHours),
            })),
            leaves: employee.leaveRequests.map((l) => ({
                id: l.id,
                type: l.type,
                startDate: l.startDate.toISOString(),
                endDate: l.endDate.toISOString(),
                days: l.days,
                reason: l.reason || '',
                status: l.status,
                appliedDate: l.appliedDate.toISOString(),
            })),
            payroll: employee.payrollRecords.map((p) => ({
                id: p.id,
                period: p.period,
                baseSalary: Number(p.baseSalary),
                allowances: Number(p.allowances),
                deductions: Number(p.deductions),
                netSalary: Number(p.netSalary),
                status: p.status,
            })),
        };

        return NextResponse.json({ success: true, data });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function POST(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:employees:POST:${ip}`, 30, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json({ error: MSG.TOO_MANY_REQUESTS, code: 'TOO_MANY_REQUESTS' }, { status: 429 });
        }
        const body = await request.json();

        const validation = createEmployeeSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const validatedData = validation.data;

        // Sanitize text inputs
        const sanitizedName = sanitizeInput(validatedData.name);
        const sanitizedEmail = sanitizeInput(validatedData.email);
        const sanitizedPhone = validatedData.phone ? sanitizeInput(validatedData.phone) : null;
        const sanitizedPosition = sanitizeInput(validatedData.position);
        const sanitizedDepartment = sanitizeInput(validatedData.department);

        // Check duplicate email within tenant
        const existingEmployee = await prisma.employee.findFirst({
            where: { email: sanitizedEmail, tenantId },
        });

        if (existingEmployee) {
            return NextResponse.json(
                { success: false, error: MSG.EMPLOYEE_EMAIL_DUPLICATE, code: 'EMPLOYEE_EMAIL_DUPLICATE' },
                { status: 409 }
            );
        }

        // Generate employee ID using timestamp-based approach to avoid race condition
        // EMP-YYYYMMDD-XXXX where XXXX is random suffix
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
        const employeeId = `EMP-${dateStr}-${randomSuffix}`;

        const employee = await prisma.employee.create({
            data: {
                tenantId,
                employeeId,
                name: sanitizedName,
                email: sanitizedEmail,
                phone: sanitizedPhone,
                position: sanitizedPosition,
                department: sanitizedDepartment,
                joinDate: new Date(validatedData.joinDate),
                salary: validatedData.salary || 0,
                status: validatedData.status || 'ACTIVE',
            },
        });

        // Audit logging non-blocking
        void logAudit({ userId, tenantId, action: 'CREATE', entity: 'Employee', entityId: employee.id, newValues: { name: employee.name, email: employee.email, position: employee.position } as Record<string, unknown>, request });

        return NextResponse.json({ success: true, data: employee }, { status: 201 });
    } catch (error) {
        return handleApiError(error);
    }
}

// ─── PUT /api/hr/employees/[id] ────────────────────────────────────────────────
// Update employee. ID diambil dari URL params (bukan body) — backward compatible:
// `version` bersifat opsional; jika tidak dikirim, gunakan versi terkini dari DB.

export async function PUT(request: Request, { params }: { params: { id: string } }) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;
        const id = params.id;
        const body = await request.json();
        const { version, id: _bodyId, ...updateData } = body;

        const validation = updateEmployeeSchema.safeParse(updateData);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const validatedData = validation.data;

        const existing = await prisma.employee.findFirst({
            where: { id, tenantId, deletedAt: null },
        });

        if (!existing) {
            return NextResponse.json(
                { success: false, error: MSG.EMPLOYEE_NOT_FOUND, code: 'EMPLOYEE_NOT_FOUND' },
                { status: 404 }
            );
        }

        // Jika client tidak mengirim version, gunakan versi terkini (tetap lewat
        // jalur optimistic update agar bump version dilakukan secara konsisten).
        const expectedVersion = version === undefined || version === null ? existing.version : version;

        // Build SET clauses for optimistic update (with sanitization)
        const setClauses: string[] = [];
        const values: unknown[] = [];
        let paramIndex = 4; // $1=id, $2=tenantId, $3=version, $4+=values

        if (validatedData.name !== undefined) { setClauses.push(`name = $${paramIndex}`); values.push(sanitizeInput(validatedData.name)); paramIndex++; }
        if (validatedData.email !== undefined) { setClauses.push(`email = $${paramIndex}`); values.push(sanitizeInput(validatedData.email)); paramIndex++; }
        if (validatedData.phone !== undefined) { setClauses.push(`phone = $${paramIndex}`); values.push(validatedData.phone ? sanitizeInput(validatedData.phone) : null); paramIndex++; }
        if (validatedData.position !== undefined) { setClauses.push(`position = $${paramIndex}`); values.push(sanitizeInput(validatedData.position)); paramIndex++; }
        if (validatedData.department !== undefined) { setClauses.push(`department = $${paramIndex}`); values.push(sanitizeInput(validatedData.department)); paramIndex++; }
        if (validatedData.salary !== undefined) { setClauses.push(`salary = $${paramIndex}`); values.push(validatedData.salary); paramIndex++; }
        if (validatedData.status !== undefined) { setClauses.push(`status = $${paramIndex}`); values.push(validatedData.status); paramIndex++; }
        if (validatedData.joinDate !== undefined) { setClauses.push(`"joinDate" = $${paramIndex}`); values.push(new Date(validatedData.joinDate)); paramIndex++; }

        if (setClauses.length === 0) {
            return NextResponse.json(
                { success: false, error: 'No fields to update', code: 'VALIDATION_ERROR' },
                { status: 400 }
            );
        }

        await optimisticUpdateRaw('Employee', id, tenantId, expectedVersion as number, setClauses.join(', '), values);

        const employee = await prisma.employee.findUnique({ where: { id } });

        void logAudit({ userId, tenantId, action: 'UPDATE', entity: 'Employee', entityId: id, newValues: updateData as Record<string, unknown>, request });

        return NextResponse.json({ success: true, data: employee });
    } catch (error) {
        return handleApiError(error);
    }
}

// ─── DELETE /api/hr/employees/[id] ──────────────────────────────────────────────
// Hapus employee berdasarkan ID dari URL params (sebelumnya membaca searchParams).

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;
        const id = params.id;

        const existing = await prisma.employee.findFirst({
            where: { id, tenantId, deletedAt: null },
        });

        if (!existing) {
            return NextResponse.json(
                { success: false, error: MSG.EMPLOYEE_NOT_FOUND, code: 'EMPLOYEE_NOT_FOUND' },
                { status: 404 }
            );
        }

        // Use deleteMany with tenantId filter for defense-in-depth (TOCTOU protection)
        const deleteResult = await prisma.employee.deleteMany({ where: { id, tenantId } });
        if (deleteResult.count === 0) {
            return NextResponse.json(
                { success: false, error: MSG.EMPLOYEE_ACCESS_DENIED, code: 'EMPLOYEE_ACCESS_DENIED' },
                { status: 404 }
            );
        }

        // Audit logging non-blocking
        void logAudit({ userId, tenantId, action: 'DELETE', entity: 'Employee', entityId: id, oldValues: toAuditPayload(existing), request });

        return NextResponse.json({ success: true, data: null });
    } catch (error) {
        return handleApiError(error);
    }
}
