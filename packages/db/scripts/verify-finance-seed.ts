/**
 * Verifikasi READ-ONLY data Finance seed (Subtask B — plans/demo-data-enhancement.md).
 *
 * Jalankan: npx tsx scripts/verify-finance-seed.ts  (dari packages/db)
 *
 * Membuktikan:
 *  (a) Jumlah JournalEntry ±150 & tersebar 6 bulan
 *  (b) NOL entry tidak seimbang (totalDebit === totalCredit per entry DAN
 *      jumlah item === header totals)
 *  (c) Bill = 7, Expense = 12, TaxRate & AccountingPeriod terisi
 *  (d) entryNumber unik global & berformat JE-{prefix}-{YYYYMM}-{seq}
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function monthKey(d: Date): string {
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
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

    // ── (a) JournalEntry ─────────────────────────────────────────────────────
    const entries = await prisma.journalEntry.findMany({
        where: { tenantId },
        select: { id: true, entryNumber: true, date: true, status: true, sourceType: true, totalDebit: true, totalCredit: true },
        orderBy: { date: "asc" },
    });
    const items = await prisma.journalEntryItem.findMany({
        where: { tenantId },
        select: { journalEntryId: true, debit: true, credit: true },
    });
    console.log("── JournalEntry ──");
    check("Jumlah entry 100–200 (target ±150)", entries.length >= 100 && entries.length <= 200, `${entries.length} entry`);
    const itemsByEntry = new Map<string, { debit: number; credit: number }>();
    for (const it of items) {
        const agg = itemsByEntry.get(it.journalEntryId) ?? { debit: 0, credit: 0 };
        agg.debit += Number(it.debit);
        agg.credit += Number(it.credit);
        itemsByEntry.set(it.journalEntryId, agg);
    }
    const unbalancedHeader = entries.filter((e) => Math.abs(Number(e.totalDebit) - Number(e.totalCredit)) > 0.005);
    const unbalancedItems = entries.filter((e) => {
        const agg = itemsByEntry.get(e.id);
        if (!agg) return true;
        return (
            Math.abs(agg.debit - agg.credit) > 0.005 ||
            Math.abs(agg.debit - Number(e.totalDebit)) > 0.005 ||
            Math.abs(agg.credit - Number(e.totalCredit)) > 0.005
        );
    });
    check("NOL entry tidak seimbang (header)", unbalancedHeader.length === 0, `seimbang semua`);
    check("NOL entry tidak seimbang (item vs header)", unbalancedItems.length === 0, `${items.length} items diperiksa`);

    const months = new Map<string, number>();
    for (const e of entries) months.set(monthKey(e.date), (months.get(monthKey(e.date)) ?? 0) + 1);
    const monthList = [...months.entries()].sort();
    check("Riwayat ≥ 6 bulan", months.size >= 6, monthList.map(([m, c]) => `${m}:${c}`).join(", "));

    const numbers = entries.map((e) => e.entryNumber);
    check("entryNumber unik global", new Set(numbers).size === numbers.length);
    const fmtOk = numbers.every((n) => /^JE-[A-Z]{2,3}-\d{6}-\d{4}$/.test(n));
    check("Format JE-{prefix}-{YYYYMM}-{seq}", fmtOk, numbers[0]);

    const posted = entries.filter((e) => e.status === "POSTED").length;
    const draft = entries.filter((e) => e.status === "DRAFT").length;
    const bySource = new Map<string, number>();
    for (const e of entries) bySource.set(e.sourceType, (bySource.get(e.sourceType) ?? 0) + 1);
    console.log(`  ℹ️  Status: ${posted} POSTED / ${draft} DRAFT — Sumber: ${[...bySource.entries()].map(([s, c]) => `${s}:${c}`).join(", ")}`);

    // ── (b) Bill & Expense ───────────────────────────────────────────────────
    const billCount = await prisma.bill.count({ where: { tenantId } });
    const expenseCount = await prisma.expense.count({ where: { tenantId } });
    const billByStatus = await prisma.bill.groupBy({ by: ["status"], where: { tenantId }, _count: true });
    const expByStatus = await prisma.expense.groupBy({ by: ["status"], where: { tenantId }, _count: true });
    console.log("\n── Bill & Expense ──");
    check("Bill = 7", billCount === 7, `${billCount} (${billByStatus.map((b) => `${b.status}:${b._count}`).join(", ")})`);
    check("Expense = 12", expenseCount === 12, `${expenseCount} (${expByStatus.map((b) => `${b.status}:${b._count}`).join(", ")})`);

    // ── (c) TaxRate & AccountingPeriod ───────────────────────────────────────
    const taxRates = await prisma.taxRate.findMany({
        where: { tenantId },
        select: { code: true, rate: true, type: true, isDefault: true },
        orderBy: { code: "asc" },
    });
    const financeCodes = ["PPN-KELUARAN", "PPN-MASUKAN", "PPH23", "PPH21", "PPH42"];
    const haveAll = financeCodes.every((c) => taxRates.some((t) => t.code === c));
    console.log("\n── TaxRate & AccountingPeriod ──");
    check("5 tarif Finance tersedia", haveAll, taxRates.map((t) => `${t.code}(${Number(t.rate)}%)`).join(", "));
    const periods = await prisma.accountingPeriod.findMany({
        where: { tenantId },
        select: { name: true, status: true, closeSummary: true },
        orderBy: { startDate: "asc" },
    });
    const closed = periods.filter((p) => p.status === "CLOSED");
    const open = periods.filter((p) => p.status === "OPEN");
    check("6 AccountingPeriod (4 CLOSED + 2 OPEN)", periods.length === 6 && closed.length === 4 && open.length === 2,
        periods.map((p) => `${p.name}:${p.status}`).join(", "));
    check("CLOSED period punya closeSummary", closed.every((p) => p.closeSummary != null));
    const jul = closed.find((p) => p.name.includes("Juli"));
    if (jul?.closeSummary) {
        const s = jul.closeSummary as { totalRevenue: number; totalExpenses: number; netIncome: number };
        console.log(`  ℹ️  Juli 2026 → revenue ${s.totalRevenue}, expenses ${s.totalExpenses}, net ${s.netIncome}`);
    }

    // ── Ringkasan ────────────────────────────────────────────────────────────
    const coaCount = await prisma.coAAccount.count({ where: { tenantId } });
    const invoiceCount = await prisma.invoice.count({ where: { tenantId, deletedAt: null } });
    const paymentCount = await prisma.payment.count({ where: { tenantId, deletedAt: null } });
    console.log("\n── Dokumen lain ──");
    console.log(`  ℹ️  CoAAccount: ${coaCount} | Invoice: ${invoiceCount} | Payment: ${paymentCount}`);

    console.log(`\n${failures === 0 ? "🎉 SEMUA VERIFIKASI LOLOS" : `⚠️  ${failures} pemeriksaan GAGAL`}`);
    process.exitCode = failures === 0 ? 0 : 1;
}

main()
    .catch((e) => {
        console.error(e);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
