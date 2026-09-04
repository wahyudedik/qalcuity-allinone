import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { calculatePayrollSchema, formatZodError } from '@/lib/validation-schemas';
import { calculatePPh21 } from '@/lib/pph21';
import { calculateBPJS } from '@/lib/bpjs';
import type { StatusKawin } from '@/lib/pph21';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { handleApiError } from '@/lib/api-error';

interface PayrollCalculationResult {
    employeeId: string;
    employeeName: string;
    employeeCode: string;
    period: string;
    baseSalary: number;
    allowances: {
        transport: number;
        meal: number;
        other: number;
        total: number;
    };
    deductions: {
        late: number;
        absent: number;
        other: number;
        total: number;
    };
    bonus: number;
    grossSalary: number;
    pph21: {
        statusKawin: StatusKawin;
        ptkpYearly: number;
        pkpYearly: number;
        pph21Yearly: number;
        pph21Monthly: number;
        effectiveRate: number;
    };
    bpjs: {
        kesehatan: {
            employee: number;
            employer: number;
        };
        ketenagakerjaan: {
            jkk: number;
            jkm: number;
            jhtEmployee: number;
            jhtEmployer: number;
            jpEmployee: number;
            jpEmployer: number;
            totalEmployee: number;
            totalEmployer: number;
        };
        totalEmployee: number;
        totalEmployer: number;
    };
    totalDeductions: number;
    totalAllowances: number;
    netSalary: number;
}

export async function POST(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:payroll:calculate:${ip}`, 30, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json({ error: 'Terlalu banyak request. Silakan coba lagi.' }, { status: 429 });
        }

        const body = await request.json();
        const validation = calculatePayrollSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const data = validation.data;

        // Validate employee belongs to tenant
        const employee = await prisma.employee.findFirst({
            where: { id: data.employeeId, tenantId },
            select: { id: true, name: true, employeeId: true, salary: true },
        });
        if (!employee) {
            return NextResponse.json(
                { success: false, error: 'Karyawan tidak ditemukan' },
                { status: 404 }
            );
        }

        // Calculate allowances breakdown
        const transportAllowance = data.transportAllowance || 0;
        const mealAllowance = data.mealAllowance || 0;
        const otherAllowance = data.otherAllowance || 0;
        const totalAllowances = transportAllowance + mealAllowance + otherAllowance + (data.allowances || 0);

        // Calculate deductions breakdown
        const lateDeduction = data.lateDeduction || 0;
        const absentDeduction = data.absentDeduction || 0;
        const otherDeduction = data.otherDeduction || 0;
        const totalDeductions = lateDeduction + absentDeduction + otherDeduction + (data.deductions || 0);

        // Gross salary = base salary + allowances
        const grossSalary = data.baseSalary + totalAllowances;

        // Calculate PPh21 based on gross salary
        const pph21Result = calculatePPh21({
            grossSalaryMonthly: grossSalary,
            statusKawin: data.statusKawin as StatusKawin,
        });

        // Calculate BPJS based on base salary
        const bpjsResult = calculateBPJS({
            grossSalary: data.baseSalary,
            jkkRiskLevel: data.jkkRiskLevel || 'low',
        });

        // Total deductions = custom deductions + PPh21 + BPJS employee
        const totalAllDeductions = totalDeductions + pph21Result.pph21Monthly + bpjsResult.totalEmployee;

        // Net salary = gross salary - all deductions + bonus
        const netSalary = grossSalary - totalAllDeductions + (data.bonus || 0);

        const result: PayrollCalculationResult = {
            employeeId: employee.id,
            employeeName: employee.name,
            employeeCode: employee.employeeId,
            period: data.period,
            baseSalary: data.baseSalary,
            allowances: {
                transport: transportAllowance,
                meal: mealAllowance,
                other: otherAllowance,
                total: totalAllowances,
            },
            deductions: {
                late: lateDeduction,
                absent: absentDeduction,
                other: otherDeduction,
                total: totalDeductions,
            },
            bonus: data.bonus || 0,
            grossSalary,
            pph21: {
                statusKawin: pph21Result.statusKawin,
                ptkpYearly: pph21Result.ptkpYearly,
                pkpYearly: pph21Result.pkpYearly,
                pph21Yearly: pph21Result.pph21Yearly,
                pph21Monthly: pph21Result.pph21Monthly,
                effectiveRate: pph21Result.effectiveRate,
            },
            bpjs: {
                kesehatan: {
                    employee: bpjsResult.kesehatan.employee,
                    employer: bpjsResult.kesehatan.employer,
                },
                ketenagakerjaan: {
                    jkk: bpjsResult.ketenagakerjaan.jkk.employer,
                    jkm: bpjsResult.ketenagakerjaan.jkm.employer,
                    jhtEmployee: bpjsResult.ketenagakerjaan.jht.employee,
                    jhtEmployer: bpjsResult.ketenagakerjaan.jht.employer,
                    jpEmployee: bpjsResult.ketenagakerjaan.jp.employee,
                    jpEmployer: bpjsResult.ketenagakerjaan.jp.employer,
                    totalEmployee: bpjsResult.ketenagakerjaan.totalEmployee,
                    totalEmployer: bpjsResult.ketenagakerjaan.totalEmployer,
                },
                totalEmployee: bpjsResult.totalEmployee,
                totalEmployer: bpjsResult.totalEmployer,
            },
            totalDeductions: totalAllDeductions,
            totalAllowances,
            netSalary: Math.max(0, netSalary),
        };

        // Log audit
        void logAudit({
            userId,
            tenantId,
            action: 'CALCULATE',
            entity: 'Payroll',
            entityId: employee.id,
            newValues: {
                period: data.period,
                baseSalary: data.baseSalary,
                pph21: pph21Result.pph21Monthly,
                bpjsEmployee: bpjsResult.totalEmployee,
                netSalary: result.netSalary,
            } as Record<string, unknown>,
            request,
        });

        return NextResponse.json({ success: true, data: result });
    } catch (error) {
        return handleApiError(error);
    }
}
