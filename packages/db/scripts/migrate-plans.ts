/**
 * ══════════════════════════════════════════════════════════════════════════════
 * MIGRATE PLANS — Sinkronisasi Plan Pricing ke Struktur Pasar Indonesia
 * (Session 70)
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Struktur plan TUJUAN (slugs lowercase):
 *   free       — Free,        Rp 0
 *   starter    — Starter,     Rp 299.000
 *   growth     — Growth,      Rp 799.000 (atau harga grandfathered)
 *   business   — Business,    Rp 1.999.000
 *   enterprise — Enterprise,  custom (priceMonthly 0 + isCustom derived)
 *
 * GRANDFATHER PRICING MAPPING (harga existing TIDAK pernah diubah):
 *   - old 'pro' (Rp 299.000)        → rename ke 'starter'  (harga tetap 299.000)
 *   - old 'enterprise' (Rp 999.000) → rename ke 'growth'   (harga tetap 999.000,
 *     TIDAK diturunkan ke 799.000)
 *   - 'business' @ Rp 1.999.000     → INSERT baru
 *   - 'free' @ Rp 0                 → ensure ada
 *   - 'enterprise' custom (Rp 0)    → ensure ada (baru, priceMonthly 0)
 *
 * ATURAN:
 *   - Idempotent — aman dijalankan berkali-kali
 *   - Rename HANYA mengubah slug/name/description — priceMonthly/priceYearly
 *     TIDAK PERNAH disentuh pada row yang sudah ada
 *   - TIDAK PERNAH menghapus plan apa pun
 *   - Row legacy yang tidak bisa di-rename (mis. duplicate slug) dibiarkan
 *     apa adanya + logged sebagai warning
 *
 * USAGE:
 *   cd packages/db && npm run migrate-plans
 *
 *   Dry run (lihat rencana aksi tanpa menulis ke DB):
 *   cd packages/db && DRY_RUN=true npm run migrate-plans
 *
 *   Catatan: script ini BELUM boleh dijalankan terhadap production DB
 *   sebelum deployment code baru (API/seed sudah sinkron ke 5 plan).
 * ══════════════════════════════════════════════════════════════════════════════
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DRY_RUN = process.env.DRY_RUN === "true";

/** Canonical plan definitions — sinkron dengan DEFAULT_PLANS + seed.ts */
const CANONICAL_PLANS = [
    { slug: "free", name: "Free", sortOrder: 0, priceMonthly: 0 },
    { slug: "starter", name: "Starter", sortOrder: 1, priceMonthly: 299000 },
    { slug: "growth", name: "Growth", sortOrder: 2, priceMonthly: 799000 },
    { slug: "business", name: "Business", sortOrder: 3, priceMonthly: 1999000 },
    { slug: "enterprise", name: "Enterprise", sortOrder: 4, priceMonthly: 0 },
] as const;

function log(action: string, detail: string): void {
    const prefix = DRY_RUN ? "[DRY RUN]" : "[APPLY]";
    console.log(`${prefix} ${action}: ${detail}`);
}

async function main(): Promise<void> {
    console.log("🔄 Migrasi Plan Pricing ke Struktur Pasar Indonesia (Session 70)");
    console.log(`   Mode: ${DRY_RUN ? "DRY RUN (tidak menulis ke DB)" : "APPLY"}`);
    console.log("");

    // ═══════════════════════════════════════════════════════════
    // STEP 1: Rename legacy 'pro' → 'starter' (grandfather: harga tetap 299K)
    // ═══════════════════════════════════════════════════════════
    const legacyPro = await prisma.plan.findUnique({ where: { slug: "pro" } });
    const existingStarter = await prisma.plan.findUnique({ where: { slug: "starter" } });

    if (legacyPro && !existingStarter) {
        log("RENAME", `'pro' (harga tetap ${legacyPro.priceMonthly}) → 'starter'`);
        if (!DRY_RUN) {
            await prisma.plan.update({
                where: { slug: "pro" },
                data: {
                    slug: "starter",
                    name: "Starter",
                    description: "Cocok untuk bisnis kecil yang baru mulai",
                    sortOrder: 1,
                },
            });
        }
    } else if (legacyPro && existingStarter) {
        console.warn(
            `⚠️  SKIP rename 'pro' → 'starter': keduanya sudah ada. ` +
            `Row 'pro' (id=${legacyPro.id}) dibiarkan sebagai legacy — jalankan manual review.`
        );
    } else if (!legacyPro) {
        log("OK", "'pro' tidak ditemukan (sudah pernah di-migrate atau memang tidak ada)");
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 2: Rename legacy 'enterprise' (Rp 999K) → 'growth'
    //   Grandfather: harga TIDAK diturunkan ke 799K — tetap 999K
    // ═══════════════════════════════════════════════════════════
    const legacyEnterprise = await prisma.plan.findUnique({ where: { slug: "enterprise" } });
    const existingGrowth = await prisma.plan.findUnique({ where: { slug: "growth" } });

    if (legacyEnterprise && !existingGrowth) {
        log(
            "RENAME",
            `'enterprise' (harga tetap ${legacyEnterprise.priceMonthly}, TIDAK diturunkan ke 799000) → 'growth'`
        );
        if (!DRY_RUN) {
            await prisma.plan.update({
                where: { slug: "enterprise" },
                data: {
                    slug: "growth",
                    name: "Growth",
                    description: "Untuk bisnis yang berkembang dengan kebutuhan lengkap",
                    sortOrder: 2,
                },
            });
        }
    } else if (legacyEnterprise && existingGrowth) {
        console.warn(
            `⚠️  SKIP rename 'enterprise' → 'growth': keduanya sudah ada. ` +
            `Row 'enterprise' (id=${legacyEnterprise.id}, harga=${legacyEnterprise.priceMonthly}) ` +
            `dibiarkan sebagai legacy — jalankan manual review.`
        );
    } else if (!legacyEnterprise) {
        log("OK", "'enterprise' legacy tidak ditemukan (sudah pernah di-migrate atau memang tidak ada)");
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 3: Ensure 'free' (Rp 0) — wajib ada (ensureEntitlement fallback)
    // ═══════════════════════════════════════════════════════════
    const existingFree = await prisma.plan.findUnique({ where: { slug: "free" } });
    if (!existingFree) {
        log("INSERT", "'free' @ Rp 0");
        if (!DRY_RUN) {
            await prisma.plan.create({
                data: {
                    name: "Free",
                    slug: "free",
                    description: "Cocok untuk bisnis kecil yang baru memulai",
                    priceMonthly: 0,
                    priceYearly: 0,
                    maxUsers: 3,
                    maxStorage: 500,
                    sortOrder: 0,
                },
            });
        }
    } else {
        log("OK", "'free' sudah ada");
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 4: Ensure 'business' @ Rp 1.999.000 (plan baru)
    // ═══════════════════════════════════════════════════════════
    const existingBusiness = await prisma.plan.findUnique({ where: { slug: "business" } });
    if (!existingBusiness) {
        log("INSERT", "'business' @ Rp 1.999.000");
        if (!DRY_RUN) {
            await prisma.plan.create({
                data: {
                    name: "Business",
                    slug: "business",
                    description: "Untuk bisnis skala besar dengan kebutuhan advanced",
                    priceMonthly: 1999000,
                    priceYearly: 19990000,
                    maxUsers: -1,
                    maxStorage: null,
                    sortOrder: 3,
                },
            });
        }
    } else {
        log("OK", "'business' sudah ada");
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 5: Ensure 'enterprise' custom (Rp 0 — isCustom derived di API)
    //   Dijalankan SETELAH step 2 (rename legacy enterprise → growth),
    //   sehingga slug 'enterprise' bebas untuk plan custom baru.
    // ═══════════════════════════════════════════════════════════
    const newEnterprise = await prisma.plan.findUnique({ where: { slug: "enterprise" } });
    if (!newEnterprise) {
        log("INSERT", "'enterprise' custom @ Rp 0 (isCustom derived di API response)");
        if (!DRY_RUN) {
            await prisma.plan.create({
                data: {
                    name: "Enterprise",
                    slug: "enterprise",
                    description: "Solusi custom untuk kebutuhan enterprise — Hubungi Kami",
                    priceMonthly: 0,
                    priceYearly: 0,
                    maxUsers: -1,
                    maxStorage: null,
                    sortOrder: 4,
                },
            });
        }
    } else {
        log("OK", "'enterprise' sudah ada (custom atau legacy — harga tidak diubah)");
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 6: Sync metadata canonical (name/sortOrder) — HARGA TIDAK DISENTUH
    // ═══════════════════════════════════════════════════════════
    for (const canonical of CANONICAL_PLANS) {
        const plan = await prisma.plan.findUnique({ where: { slug: canonical.slug } });
        if (!plan) continue;

        const needsUpdate = plan.name !== canonical.name || plan.sortOrder !== canonical.sortOrder;
        if (needsUpdate) {
            log(
                "SYNC META",
                `'${canonical.slug}': name '${plan.name}'→'${canonical.name}', ` +
                `sortOrder ${plan.sortOrder}→${canonical.sortOrder} (harga TIDAK diubah: ${plan.priceMonthly})`
            );
            if (!DRY_RUN) {
                await prisma.plan.update({
                    where: { slug: canonical.slug },
                    data: { name: canonical.name, sortOrder: canonical.sortOrder },
                });
            }
        }
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 7: Sync PlanTenantLimit ke lowercase names
    //   checkPlanTenantLimit() exact-match case-sensitive terhadap
    //   planName yang dikirim register route ('starter').
    // ═══════════════════════════════════════════════════════════
    const planLimits = [
        { planName: "free", maxTenants: 10 },
        { planName: "starter", maxTenants: 50 },
        { planName: "growth", maxTenants: 100 },
        { planName: "business", maxTenants: 500 },
        { planName: "enterprise", maxTenants: 9999 },
    ];
    for (const limit of planLimits) {
        log("UPSERT LIMIT", `PlanTenantLimit '${limit.planName}' → maxTenants ${limit.maxTenants}`);
        if (!DRY_RUN) {
            await prisma.planTenantLimit.upsert({
                where: { planName: limit.planName },
                update: { maxTenants: limit.maxTenants },
                create: limit,
            });
        }
    }

    // ═══════════════════════════════════════════════════════════
    // RINGKASAN
    // ═══════════════════════════════════════════════════════════
    console.log("");
    console.log("📊 Ringkasan state plan setelah migrasi:");
    const allPlans = await prisma.plan.findMany({ orderBy: { sortOrder: "asc" } });
    for (const plan of allPlans) {
        const price = plan.slug === "enterprise" && Number(plan.priceMonthly) === 0
            ? "custom (Rp 0)"
            : `Rp ${Number(plan.priceMonthly)}`;
        console.log(`   - ${plan.slug.padEnd(12)} ${plan.name.padEnd(12)} ${price}`);
    }

    console.log("");
    console.log(
        DRY_RUN
            ? "✅ Dry run selesai — TIDAK ada perubahan yang ditulis ke DB."
            : "✅ Migrasi plan selesai."
    );
    console.log(
        "   Catatan grandfather: tenant dengan plan lama mempertahankan harga existing. " +
        "Harga baru hanya berlaku untuk tenant baru."
    );
}

main()
    .catch((e) => {
        console.error("❌ Migrasi gagal:", e);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
