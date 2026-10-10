/**
 * Verifikasi READ-ONLY data Ops seed — CRM + HR + INVENTORY
 * (Subtask C — plans/demo-data-enhancement.md §6.2).
 *
 * Jalankan: npx tsx scripts/verify-ops-seed.ts  (dari packages/db)
 *
 * Membuktikan:
 *  (a) CRM: Activity = 25 (CALL 6, EMAIL 6, MEETING 5, NOTE 5, TASK 3),
 *      terhubung CONTACT/LEAD/DEAL valid; Contact 23, Lead 14, Deal 14, Category 9
 *  (b) HR: Department 7 + Employee 15 semua ter-link departmentId;
 *      PayrollRecord 90 (6 periode × 15, PAID lama + paidAt, PENDING baru);
 *      Attendance 90 hari kerja unik per employee, TANPA weekend;
 *      Leave 16 mix status (PENDING/APPROVED/REJECTED) + approved → attendance LEAVE
 *  (c) Inventory: Warehouse 2 (1 default), StockMovement 60–80 dengan INVARIAN
 *      Σ(IN + ADJ signed − OUT) === Product.stock per SKU;
 *      StockOpname 2 (1 COMPLETED selisih −2, 1 DRAFT) + item konsisten
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function dateKey(d: Date): string {
    return d.toISOString().slice(0, 10);
}

async function main() {
    const tenant = await prisma.tenant.findUnique({ where: { slug: "qalcuity-demo" } });
    if (!tenant) throw new Error("Tenant qalcuity-demo tidak ditemukan");
    const tenantId = tenant.id;
    console.log(`Tenant: ${tenant.name} (${tenantId})\n`);

    let failures = 0;
    const check = (label: string, ok: boolean, detail = ""): void => {
        console.log(`  ${ok ? "✅" : "❌"} ${label}${detail ? ` — ${detail}` : ""}`);
        if (!ok) failures += 1;
    };

    // ══════════════════════════════════════════════════════════
    // (a) CRM — C1/C2
    // ══════════════════════════════════════════════════════════
    console.log("── CRM ──");
    const [categoryCount, contactCount, supplierCount, leadCount, dealCount] =
        await Promise.all([
            prisma.category.count({ where: { tenantId } }),
            prisma.contact.count({ where: { tenantId } }),
            prisma.supplier.count({ where: { tenantId } }),
            prisma.lead.count({ where: { tenantId } }),
            prisma.deal.count({ where: { tenantId } }),
        ]);
    check("Category = 9", categoryCount === 9, `${categoryCount}`);
    check("Contact = 23", contactCount === 23, `${contactCount}`);
    check("Supplier = 9", supplierCount === 9, `${supplierCount}`);
    check("Lead = 14", leadCount === 14, `${leadCount}`);
    check("Deal = 14", dealCount === 14, `${dealCount}`);

    // ── Activity (C2) ──
    const activities = await prisma.activity.findMany({
        where: { tenantId },
        select: { id: true, entityType: true, entityId: true, type: true, subject: true, createdBy: true },
    });
    check("Activity = 25", activities.length === 25, `${activities.length}`);
    const typeCounts = new Map<string, number>();
    for (const a of activities) typeCounts.set(a.type, (typeCounts.get(a.type) ?? 0) + 1);
    const expected: Record<string, number> = { CALL: 6, EMAIL: 6, MEETING: 5, NOTE: 5, TASK: 3 };
    const distOk = Object.entries(expected).every(([t, n]) => typeCounts.get(t) === n);
    check(
        "Distribusi Activity CALL 6 / EMAIL 6 / MEETING 5 / NOTE 5 / TASK 3",
        distOk && typeCounts.size === 5,
        [...typeCounts.entries()].map(([t, c]) => `${t}:${c}`).join(", ")
    );

    // entityId harus merujuk entitas CRM yang ada
    const [contactIds, leadIds, dealIds] = await Promise.all([
        prisma.contact.findMany({ where: { tenantId }, select: { id: true } }),
        prisma.lead.findMany({ where: { tenantId }, select: { id: true } }),
        prisma.deal.findMany({ where: { tenantId }, select: { id: true } }),
    ]);
    const idSet = (rows: { id: string }[]) => new Set(rows.map((r) => r.id));
    const validByType: Record<string, Set<string>> = {
        CONTACT: idSet(contactIds),
        LEAD: idSet(leadIds),
        DEAL: idSet(dealIds),
    };
    const orphan = activities.filter((a) => !validByType[a.entityType]?.has(a.entityId));
    check("Setiap Activity terhubung entitas CONTACT/LEAD/DEAL valid", orphan.length === 0,
        orphan.length > 0 ? `${orphan.length} orphan` : "semua terhubung");
    const entityTypes = new Set(activities.map((a) => a.entityType));
    check("Activity mencakup CONTACT + LEAD + DEAL", entityTypes.size === 3,
        [...entityTypes].join(", "));

    // ══════════════════════════════════════════════════════════
    // (b) HR — C3/C7/C8/C9
    // ══════════════════════════════════════════════════════════
    console.log("\n── HR ──");
    const departments = await prisma.department.findMany({
        where: { tenantId },
        select: { id: true, name: true },
    });
    check("Department = 7", departments.length === 7, departments.map((d) => d.name).join(", "));

    const employees = await prisma.employee.findMany({
        where: { tenantId, deletedAt: null },
        select: { id: true, employeeId: true, departmentId: true, status: true },
        orderBy: { employeeId: "asc" },
    });
    check("Employee = 15", employees.length === 15, `${employees.length}`);
    const unlinked = employees.filter((e) => e.departmentId == null);
    check("SEMUA Employee ter-link departmentId (C3)", unlinked.length === 0,
        unlinked.length > 0 ? `${unlinked.length} tanpa department` : "15/15 terhubung");

    // ── Payroll (C7) ──
    const payrolls = await prisma.payrollRecord.findMany({
        where: { tenantId },
        select: {
            period: true, status: true, paidAt: true, employeeId: true,
            baseSalary: true, allowances: true, deductions: true, bonus: true, netSalary: true,
        },
    });
    check("PayrollRecord ≥ 90 (6 periode × 15 karyawan)", payrolls.length >= 90, `${payrolls.length} record`);
    const payrollPeriods = new Set(payrolls.map((p) => p.period));
    check("Payroll mencakup 6 periode 2026-05..2026-10", payrollPeriods.size === 6,
        [...payrollPeriods].sort().join(", "));
    const paidRecs = payrolls.filter((p) => p.status === "PAID");
    const pendingRecs = payrolls.filter((p) => p.status === "PENDING");
    check("Payroll mix: 60 PAID (periode lama) + 30 PENDING (periode baru)",
        paidRecs.length === 60 && pendingRecs.length === 30,
        `PAID:${paidRecs.length}, PENDING:${pendingRecs.length}`);
    check("Semua PAID punya paidAt", paidRecs.every((p) => p.paidAt != null));
    const badNet = payrolls.filter((p) => {
        const expected =
            Number(p.baseSalary) + Number(p.allowances) - Number(p.deductions) + Number(p.bonus);
        return Math.abs(expected - Number(p.netSalary)) > 0.005;
    });
    check("netSalary = base + allowances − deductions + bonus (semua record)", badNet.length === 0,
        badNet.length > 0 ? `${badNet.length} tidak konsisten` : `${payrolls.length} konsisten`);

    // ── Attendance (C8) ──
    const attendance = await prisma.attendanceRecord.findMany({
        where: { tenantId },
        select: { employeeId: true, date: true, status: true },
    });
    const perEmployee = new Map<string, number>();
    const dateSet = new Set<string>();
    let weekendCount = 0;
    for (const rec of attendance) {
        perEmployee.set(rec.employeeId, (perEmployee.get(rec.employeeId) ?? 0) + 1);
        dateSet.add(dateKey(rec.date));
        const wd = rec.date.getUTCDay();
        if (wd === 0 || wd === 6) weekendCount += 1;
    }
    check("Attendance untuk 15 employee, masing-masing 90 hari kerja",
        perEmployee.size === 15 && [...perEmployee.values()].every((c) => c === 90),
        [...perEmployee.entries()].map(([e, c]) => `${e.slice(-6)}:${c}`).join(", "));
    check("90 tanggal unik TANPA weekend (C8)", dateSet.size === 90 && weekendCount === 0,
        `${dateSet.size} tanggal unik, ${weekendCount} weekend`);
    const dateList = [...dateSet].sort();
    check("Attendance berakhir ≤ 2026-10-09 (anchor 2026-10-10 = Sabtu)",
        dateList[dateList.length - 1] <= "2026-10-09",
        `${dateList[0]} … ${dateList[dateList.length - 1]}`);

    // ── Leave (C9) ──
    const leaves = await prisma.leaveRequest.findMany({
        where: { tenantId },
        select: { id: true, employeeId: true, type: true, status: true, startDate: true, endDate: true },
    });
    check("LeaveRequest = 16", leaves.length === 16, `${leaves.length}`);
    const leaveStatuses = new Set(leaves.map((l) => l.status));
    check("Leave mix 3 status (PENDING/APPROVED/REJECTED)", leaveStatuses.size === 3,
        [...leaveStatuses].join(", "));
    const leaveTypes = new Set(leaves.map((l) => l.type));
    check("Leave mix ≥ 4 tipe", leaveTypes.size >= 4, [...leaveTypes].join(", "));

    // Approved leave → tanggal cuti (weekday) berstatus LEAVE di attendance
    const attendanceByKey = new Map<string, string>();
    for (const rec of attendance) {
        attendanceByKey.set(`${rec.employeeId}|${dateKey(rec.date)}`, rec.status);
    }
    let overlapChecked = 0;
    const overlapBad: string[] = [];
    for (const lv of leaves.filter((l) => l.status === "APPROVED")) {
        let cursor = new Date(lv.startDate.getTime());
        const endMs = lv.endDate.getTime();
        while (cursor.getTime() <= endMs) {
            const wd = cursor.getUTCDay();
            if (wd !== 0 && wd !== 6) {
                const key = `${lv.employeeId}|${dateKey(cursor)}`;
                const status = attendanceByKey.get(key);
                if (status !== undefined) {
                    overlapChecked += 1;
                    if (status !== "LEAVE") overlapBad.push(`${key}:${status}`);
                }
            }
            cursor = new Date(cursor.getTime() + 86400000);
        }
    }
    check("Tanggal cuti APPROVED (weekday, dalam window) → attendance LEAVE",
        overlapChecked > 0 && overlapBad.length === 0,
        `${overlapChecked} hari diperiksa${overlapBad.length > 0 ? `, ${overlapBad.length} salah: ${overlapBad.slice(0, 3).join(", ")}` : ""}`);

    // ══════════════════════════════════════════════════════════
    // (c) INVENTORY — C4/C5/C6
    // ══════════════════════════════════════════════════════════
    console.log("\n── Inventory ──");
    const warehouses = await prisma.warehouse.findMany({
        where: { tenantId },
        select: { code: true, isDefault: true },
    });
    check("Warehouse = 2 (GUDANG-PUSAT + GUDANG-CABANG)", warehouses.length === 2,
        warehouses.map((w) => w.code).join(", "));
    const defaultWh = warehouses.filter((w) => w.isDefault);
    check("Tepat 1 warehouse default (GUDANG-PUSAT)",
        defaultWh.length === 1 && defaultWh[0].code === "GUDANG-PUSAT",
        defaultWh.map((w) => w.code).join(", "));

    const products = await prisma.product.findMany({
        where: { tenantId, deletedAt: null },
        select: { id: true, sku: true, stock: true, warehouseId: true },
    });
    check("Product = 23", products.length === 23, `${products.length}`);
    const linkedWh = products.filter((p) => p.warehouseId != null).length;
    check("Setengah produk terhubung warehouseId (≥ 10)", linkedWh >= 10, `${linkedWh}/23`);

    // ── StockMovement + INVARIAN KUNCI (C5) ──
    const movements = await prisma.stockMovement.findMany({
        where: { tenantId },
        select: { productId: true, type: true, quantity: true, reference: true },
    });
    check("StockMovement 60–80 gerakan", movements.length >= 60 && movements.length <= 80,
        `${movements.length} gerakan`);

    const productById = new Map(products.map((p) => [p.id, p]));
    const netByProduct = new Map<string, number>();
    for (const m of movements) {
        const delta = m.type === "OUT" ? -m.quantity : m.quantity; // ADJUSTMENT signed
        netByProduct.set(m.productId, (netByProduct.get(m.productId) ?? 0) + delta);
    }
    // INVARIAN: stok akhir gerakan (termasuk OPENING sebagai IN) === Product.stock
    const inconsistent: string[] = [];
    for (const p of products) {
        const net = netByProduct.get(p.id);
        if (net === undefined) continue; // tanpa gerakan (mis. produk layanan)
        if (net !== p.stock) inconsistent.push(`${p.sku}: gerakan=${net} vs stock=${p.stock}`);
    }
    check("INVARIAN C5: Σ(IN + ADJ − OUT) === Product.stock untuk SEMUA SKU bergerak",
        inconsistent.length === 0,
        inconsistent.length > 0 ? inconsistent.slice(0, 5).join("; ") : `${netByProduct.size} SKU konsisten`);
    const noMovement = products.filter((p) => !netByProduct.has(p.id));
    check("Produk tanpa gerakan hanya produk layanan (≤ 2)",
        noMovement.length <= 2,
        noMovement.length > 0 ? `tanpa gerakan: ${noMovement.map((p) => p.sku).join(", ")}` : "semua bergerak");

    // ── StockOpname (C6) ──
    const opnames = await prisma.stockOpname.findMany({
        where: { tenantId },
        select: {
            opnameNumber: true, status: true, totalDifference: true,
            items: { select: { systemQuantity: true, physicalQuantity: true, difference: true } },
        },
        orderBy: { opnameNumber: "asc" },
    });
    check("StockOpname = 2 (1 COMPLETED + 1 DRAFT)", opnames.length === 2,
        opnames.map((o) => `${o.opnameNumber}:${o.status}`).join(", "));
    const completed = opnames.find((o) => o.status === "COMPLETED");
    check("1 opname COMPLETED dengan totalDifference −2",
        completed != null && completed.totalDifference === -2,
        completed ? `totalDifference=${completed.totalDifference}` : "tidak ada COMPLETED");
    const totalItems = opnames.reduce((sum, o) => sum + o.items.length, 0);
    check("StockOpnameItem ≥ 5 item", totalItems >= 5, `${totalItems} item`);
    const badItem = opnames.flatMap((o) =>
        o.items.filter((i) => i.physicalQuantity - i.systemQuantity !== i.difference)
    );
    check("Setiap item: physical − system === difference", badItem.length === 0,
        badItem.length > 0 ? `${badItem.length} tidak konsisten` : "semua konsisten");

    // ── Ringkasan ──
    console.log(`\n${failures === 0 ? "🎉 SEMUA VERIFIKASI OPS LOLOS" : `⚠️  ${failures} pemeriksaan GAGAL`}`);
    process.exitCode = failures === 0 ? 0 : 1;
}

main()
    .catch((e) => {
        console.error(e);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
