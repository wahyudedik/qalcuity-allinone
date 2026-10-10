import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { seedFinanceData } from "../../../apps/web/lib/seed-data/finance";
import { seedCrmData } from "../../../apps/web/lib/seed-data/crm";
import { seedInventoryData } from "../../../apps/web/lib/seed-data/inventory";
import { seedHrData } from "../../../apps/web/lib/seed-data/hr";

const prisma = new PrismaClient();

/**
 * Seed script yang aman untuk production.
 *
 * Core data (Tenant, SuperAdmin, Plans, Settings) SELALU di-seed setiap migrate fresh.
 * Demo data (Contacts, Products, Invoices, dll) hanya di-load jika SEED_DEMO=true.
 *
 * Usage:
 *   SEED_DEMO=false npx prisma db seed  (production — core only)
 *   SEED_DEMO=true  npx prisma db seed  (development — full)
 */

const SEED_DEMO = process.env.SEED_DEMO === 'true';

async function main() {
  console.log("🌱 Seeding database...");
  console.log(`   Mode: ${SEED_DEMO ? 'FULL (core + demo)' : 'CORE ONLY'}`);

  // ═══════════════════════════════════════════════════════════
  // CORE DATA — Selalu dijalankan setiap migrate fresh
  // ═══════════════════════════════════════════════════════════

  // ============================================
  // TENANT (upsert berdasarkan slug — aman untuk re-run)
  // ============================================
  const tenant = await prisma.tenant.upsert({
    where: { slug: "qalcuity-demo" },
    update: {
      name: "PT Qalcuity Demo",
      email: "demo@qalcuity.com",
      phone: "021-1234567",
      address: "Jl. Sudirman No. 123, Jakarta Selatan",
    },
    create: {
      name: "PT Qalcuity Demo",
      slug: "qalcuity-demo",
      email: "demo@qalcuity.com",
      phone: "021-1234567",
      address: "Jl. Sudirman No. 123, Jakarta Selatan",
    },
  });
  console.log("✅ Tenant:", tenant.name);

  // ============================================
  // SUPERADMIN USER (upsert berdasarkan email)
  // ============================================
  const superadminPasswordHash = await bcrypt.hash("Wahyu123456789@", 10);
  const superadmin = await prisma.user.upsert({
    where: { email: "info@qalcuity.com" },
    update: {
      name: "Super Admin",
      passwordHash: superadminPasswordHash,
      role: "SUPERADMIN",
    },
    create: {
      email: "info@qalcuity.com",
      name: "Super Admin",
      passwordHash: superadminPasswordHash,
      role: "SUPERADMIN",
      tenantId: tenant.id,
    },
  });
  console.log("✅ SuperAdmin:", superadmin.email);

  // ============================================
  // PLANS (Entitlement Engine) — upsert berdasarkan slug
  // ============================================
  // Struktur plan pasar Indonesia (Session 70):
  //   free(0) → starter(299K) → growth(799K) → business(1.999K) → enterprise(custom/0)
  // Sinkron dengan DEFAULT_PLANS di apps/web/lib/entitlements-config.ts.
  //
  // GRANDFATHER PRICING: jika slug sudah ada di DB, HANYA name/description/sortOrder
  // yang di-update. priceMonthly/priceYearly/features TIDAK PERNAH diubah —
  // harga existing (mis. pro@299K, enterprise@999K) dipertahankan.
  // Untuk rename slug legacy (pro→starter, enterprise-lama→growth), jalankan
  // script migrasi: cd packages/db && npm run migrate-plans
  const planData = [
    {
      name: "Free",
      slug: "free",
      description: "Cocok untuk bisnis kecil yang baru memulai",
      priceMonthly: 0,
      priceYearly: 0,
      maxUsers: 3,
      maxStorage: 500,
      sortOrder: 0,
      features: [
        { featureKey: "finance.invoices", enabled: true, limit: 50 },
        { featureKey: "finance.payments", enabled: true, limit: 50 },
        { featureKey: "finance.purchase-orders", enabled: false, limit: null },
        { featureKey: "finance.journal-entries", enabled: false, limit: null },
        { featureKey: "finance.reports", enabled: false, limit: null },
        { featureKey: "finance.reconciliation", enabled: false, limit: null },
        { featureKey: "crm.contacts", enabled: true, limit: 100 },
        { featureKey: "crm.leads", enabled: true, limit: 20 },
        { featureKey: "crm.deals", enabled: false, limit: null },
        { featureKey: "crm.pipeline", enabled: false, limit: null },
        { featureKey: "inventory.products", enabled: true, limit: 50 },
        { featureKey: "inventory.stock", enabled: true, limit: null },
        { featureKey: "inventory.suppliers", enabled: false, limit: null },
        { featureKey: "inventory.categories", enabled: true, limit: 10 },
        { featureKey: "hr.employees", enabled: false, limit: null },
        { featureKey: "hr.attendance", enabled: false, limit: null },
        { featureKey: "hr.leaves", enabled: false, limit: null },
        { featureKey: "hr.payroll", enabled: false, limit: null },
        { featureKey: "ai.chat", enabled: false, limit: null },
        { featureKey: "ai.document-extraction", enabled: false, limit: null },
        { featureKey: "ai.predictions", enabled: false, limit: null },
        { featureKey: "integration.whatsapp", enabled: false, limit: null },
        { featureKey: "integration.email", enabled: false, limit: null },
        { featureKey: "integration.payment", enabled: false, limit: null },
        { featureKey: "platform.admin", enabled: false, limit: null },
        { featureKey: "platform.billing", enabled: false, limit: null },
        { featureKey: "platform.monitoring", enabled: false, limit: null },
      ],
    },
    {
      name: "Starter",
      slug: "starter",
      description: "Cocok untuk bisnis kecil yang baru mulai",
      priceMonthly: 299000,
      priceYearly: 2990000,
      maxUsers: 20,
      maxStorage: 5000,
      sortOrder: 1,
      features: [
        { featureKey: "finance.invoices", enabled: true, limit: 50 },
        { featureKey: "finance.payments", enabled: true, limit: 50 },
        { featureKey: "finance.purchase-orders", enabled: false, limit: null },
        { featureKey: "finance.journal-entries", enabled: false, limit: null },
        { featureKey: "finance.reports", enabled: false, limit: null },
        { featureKey: "finance.reconciliation", enabled: false, limit: null },
        { featureKey: "crm.contacts", enabled: true, limit: 100 },
        { featureKey: "crm.leads", enabled: true, limit: 20 },
        { featureKey: "crm.deals", enabled: false, limit: null },
        { featureKey: "crm.pipeline", enabled: false, limit: null },
        { featureKey: "inventory.products", enabled: true, limit: 50 },
        { featureKey: "inventory.stock", enabled: true, limit: null },
        { featureKey: "inventory.suppliers", enabled: false, limit: null },
        { featureKey: "inventory.categories", enabled: true, limit: 10 },
        { featureKey: "hr.employees", enabled: false, limit: null },
        { featureKey: "hr.attendance", enabled: false, limit: null },
        { featureKey: "hr.leaves", enabled: false, limit: null },
        { featureKey: "hr.payroll", enabled: false, limit: null },
        { featureKey: "ai.chat", enabled: false, limit: null },
        { featureKey: "ai.document-extraction", enabled: false, limit: null },
        { featureKey: "ai.predictions", enabled: false, limit: null },
        { featureKey: "integration.whatsapp", enabled: false, limit: null },
        { featureKey: "integration.email", enabled: false, limit: null },
        { featureKey: "integration.payment", enabled: false, limit: null },
        { featureKey: "platform.admin", enabled: false, limit: null },
        { featureKey: "platform.billing", enabled: false, limit: null },
        { featureKey: "platform.monitoring", enabled: false, limit: null },
      ],
    },
    {
      name: "Growth",
      slug: "growth",
      description: "Untuk bisnis yang berkembang dengan kebutuhan lengkap",
      priceMonthly: 799000,
      priceYearly: 7990000,
      maxUsers: 50,
      maxStorage: 20000,
      sortOrder: 2,
      features: [
        { featureKey: "finance.invoices", enabled: true, limit: null },
        { featureKey: "finance.payments", enabled: true, limit: null },
        { featureKey: "finance.purchase-orders", enabled: true, limit: null },
        { featureKey: "finance.journal-entries", enabled: true, limit: null },
        { featureKey: "finance.reports", enabled: true, limit: null },
        { featureKey: "finance.reconciliation", enabled: true, limit: null },
        { featureKey: "crm.contacts", enabled: true, limit: null },
        { featureKey: "crm.leads", enabled: true, limit: null },
        { featureKey: "crm.deals", enabled: true, limit: null },
        { featureKey: "crm.pipeline", enabled: true, limit: null },
        { featureKey: "inventory.products", enabled: true, limit: null },
        { featureKey: "inventory.stock", enabled: true, limit: null },
        { featureKey: "inventory.suppliers", enabled: true, limit: null },
        { featureKey: "inventory.categories", enabled: true, limit: null },
        { featureKey: "hr.employees", enabled: true, limit: null },
        { featureKey: "hr.attendance", enabled: true, limit: null },
        { featureKey: "hr.leaves", enabled: true, limit: null },
        { featureKey: "hr.payroll", enabled: false, limit: null },
        { featureKey: "ai.chat", enabled: true, limit: 100 },
        { featureKey: "ai.document-extraction", enabled: true, limit: 50 },
        { featureKey: "ai.predictions", enabled: false, limit: null },
        { featureKey: "integration.whatsapp", enabled: true, limit: null },
        { featureKey: "integration.email", enabled: true, limit: null },
        { featureKey: "integration.payment", enabled: false, limit: null },
        { featureKey: "platform.admin", enabled: false, limit: null },
        { featureKey: "platform.billing", enabled: true, limit: null },
        { featureKey: "platform.monitoring", enabled: false, limit: null },
      ],
    },
    {
      name: "Business",
      slug: "business",
      description: "Untuk bisnis skala besar dengan kebutuhan advanced",
      priceMonthly: 1999000,
      priceYearly: 19990000,
      maxUsers: -1,
      maxStorage: null,
      sortOrder: 3,
      features: [
        { featureKey: "finance.invoices", enabled: true, limit: null },
        { featureKey: "finance.payments", enabled: true, limit: null },
        { featureKey: "finance.purchase-orders", enabled: true, limit: null },
        { featureKey: "finance.journal-entries", enabled: true, limit: null },
        { featureKey: "finance.reports", enabled: true, limit: null },
        { featureKey: "finance.reconciliation", enabled: true, limit: null },
        { featureKey: "crm.contacts", enabled: true, limit: null },
        { featureKey: "crm.leads", enabled: true, limit: null },
        { featureKey: "crm.deals", enabled: true, limit: null },
        { featureKey: "crm.pipeline", enabled: true, limit: null },
        { featureKey: "inventory.products", enabled: true, limit: null },
        { featureKey: "inventory.stock", enabled: true, limit: null },
        { featureKey: "inventory.suppliers", enabled: true, limit: null },
        { featureKey: "inventory.categories", enabled: true, limit: null },
        { featureKey: "hr.employees", enabled: true, limit: null },
        { featureKey: "hr.attendance", enabled: true, limit: null },
        { featureKey: "hr.leaves", enabled: true, limit: null },
        { featureKey: "hr.payroll", enabled: true, limit: null },
        { featureKey: "ai.chat", enabled: true, limit: null },
        { featureKey: "ai.document-extraction", enabled: true, limit: null },
        { featureKey: "ai.predictions", enabled: true, limit: null },
        { featureKey: "integration.whatsapp", enabled: true, limit: null },
        { featureKey: "integration.email", enabled: true, limit: null },
        { featureKey: "integration.payment", enabled: true, limit: null },
        { featureKey: "platform.admin", enabled: true, limit: null },
        { featureKey: "platform.billing", enabled: true, limit: null },
        { featureKey: "platform.monitoring", enabled: true, limit: null },
      ],
    },
    {
      name: "Enterprise",
      slug: "enterprise",
      description: "Solusi custom untuk kebutuhan enterprise — Hubungi Kami",
      // Harga custom: priceMonthly 0 + isCustom derived di API (schema tanpa flag column)
      priceMonthly: 0,
      priceYearly: 0,
      maxUsers: -1,
      maxStorage: null,
      sortOrder: 4,
      features: [
        { featureKey: "finance.invoices", enabled: true, limit: null },
        { featureKey: "finance.payments", enabled: true, limit: null },
        { featureKey: "finance.purchase-orders", enabled: true, limit: null },
        { featureKey: "finance.journal-entries", enabled: true, limit: null },
        { featureKey: "finance.reports", enabled: true, limit: null },
        { featureKey: "finance.reconciliation", enabled: true, limit: null },
        { featureKey: "crm.contacts", enabled: true, limit: null },
        { featureKey: "crm.leads", enabled: true, limit: null },
        { featureKey: "crm.deals", enabled: true, limit: null },
        { featureKey: "crm.pipeline", enabled: true, limit: null },
        { featureKey: "inventory.products", enabled: true, limit: null },
        { featureKey: "inventory.stock", enabled: true, limit: null },
        { featureKey: "inventory.suppliers", enabled: true, limit: null },
        { featureKey: "inventory.categories", enabled: true, limit: null },
        { featureKey: "hr.employees", enabled: true, limit: null },
        { featureKey: "hr.attendance", enabled: true, limit: null },
        { featureKey: "hr.leaves", enabled: true, limit: null },
        { featureKey: "hr.payroll", enabled: true, limit: null },
        { featureKey: "ai.chat", enabled: true, limit: null },
        { featureKey: "ai.document-extraction", enabled: true, limit: null },
        { featureKey: "ai.predictions", enabled: true, limit: null },
        { featureKey: "integration.whatsapp", enabled: true, limit: null },
        { featureKey: "integration.email", enabled: true, limit: null },
        { featureKey: "integration.payment", enabled: true, limit: null },
        { featureKey: "platform.admin", enabled: true, limit: null },
        { featureKey: "platform.billing", enabled: true, limit: null },
        { featureKey: "platform.monitoring", enabled: true, limit: null },
      ],
    },
  ];

  for (const planDef of planData) {
    const existingPlan = await prisma.plan.findUnique({
      where: { slug: planDef.slug },
    });

    if (!existingPlan) {
      await prisma.plan.create({
        data: {
          name: planDef.name,
          slug: planDef.slug,
          description: planDef.description,
          priceMonthly: planDef.priceMonthly,
          priceYearly: planDef.priceYearly,
          maxUsers: planDef.maxUsers,
          maxStorage: planDef.maxStorage,
          sortOrder: planDef.sortOrder,
          features: {
            create: planDef.features.map((f) => ({
              featureKey: f.featureKey,
              enabled: f.enabled,
              limit: f.limit,
            })),
          },
        },
      });
      console.log(`✅ Plan created: ${planDef.name}`);
    } else {
      // Grandfather pricing: update HANYA metadata (name/description/sortOrder).
      // priceMonthly/priceYearly/features TIDAK diubah agar harga existing tetap.
      await prisma.plan.update({
        where: { slug: planDef.slug },
        data: {
          name: planDef.name,
          description: planDef.description,
          sortOrder: planDef.sortOrder,
        },
      });
      console.log(`✅ Plan already exists (metadata synced, prices preserved): ${planDef.name}`);
    }
  }

  // ============================================
  // TENANT ENTITLEMENT — ensure demo tenant has Free plan
  // ============================================
  const freePlan = await prisma.plan.findUnique({ where: { slug: "free" } });
  if (freePlan) {
    const existingEntitlement = await prisma.tenantEntitlement.findUnique({
      where: { tenantId: tenant.id },
    });

    if (!existingEntitlement) {
      const now = new Date();
      await prisma.tenantEntitlement.create({
        data: {
          tenantId: tenant.id,
          planId: freePlan.id,
          billingCycle: "monthly",
          status: "trial",
          trialEndsAt: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
          currentPeriodStart: now,
          currentPeriodEnd: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
        },
      });
      console.log("✅ Tenant Entitlement: Free plan (trial) assigned to demo tenant");
    } else {
      console.log("✅ Tenant Entitlement: already exists for demo tenant");
    }
  }

  // ============================================
  // TAX RATES — Default tax rates untuk Indonesia
  // ============================================
  const taxRateData = [
    {
      code: "PPN",
      name: "PPN 11%",
      rate: 11.00,
      type: "VAT",
      isDefault: true,
    },
    {
      code: "PPH23",
      name: "PPh 23 2%",
      rate: 2.00,
      type: "INCOME_TAX",
      isDefault: true,
    },
    {
      code: "PPH21",
      name: "PPh 21 (Bervariasi)",
      rate: 0.00,
      type: "INCOME_TAX",
      isDefault: false,
    },
  ];

  for (const tr of taxRateData) {
    const existingTaxRate = await prisma.taxRate.findUnique({
      where: { tenantId_code: { tenantId: tenant.id, code: tr.code } },
    });

    if (!existingTaxRate) {
      await prisma.taxRate.create({
        data: {
          tenantId: tenant.id,
          code: tr.code,
          name: tr.name,
          rate: tr.rate,
          type: tr.type,
          isDefault: tr.isDefault,
          isActive: true,
        },
      });
      console.log(`✅ Tax Rate created: ${tr.name}`);
    } else {
      console.log(`✅ Tax Rate already exists: ${tr.name}`);
    }
  }

  // ============================================
  // PLATFORM SETTINGS (Global, non-tenant)
  // ============================================
  const existingPlatformSetting = await prisma.platformSetting.findFirst();
  if (!existingPlatformSetting) {
    await prisma.platformSetting.create({
      data: {
        platformName: 'Qalcuity',
        supportEmail: 'support@qalcuity.com',
        defaultTrialDays: 14,
        maintenanceMode: false,
        allowRegistration: true,
        emailNotifications: true,
        securityAlerts: true,
      },
    });
    console.log("✅ Platform Settings created with defaults");
  } else {
    console.log("✅ Platform Settings already exists");
  }

  // Plan Tenant Limits
  // Nama harus lowercase & exact-match dengan planName yang dikirim register route ('starter').
  // checkPlanTenantLimit() melakukan findUnique({ where: { planName } }) — case-sensitive.
  const planLimits = [
    { planName: 'free', maxTenants: 10 },
    { planName: 'starter', maxTenants: 50 },
    { planName: 'growth', maxTenants: 100 },
    { planName: 'business', maxTenants: 500 },
    { planName: 'enterprise', maxTenants: 9999 },
  ];
  for (const limit of planLimits) {
    await prisma.planTenantLimit.upsert({
      where: { planName: limit.planName },
      update: {},
      create: limit,
    });
  }
  console.log("✅ Plan Tenant Limits seeded");

  console.log("\n✅ Core data seeded (Tenant, SuperAdmin, Plans, Settings, TaxRates, Entitlement)");

  // ═══════════════════════════════════════════════════════════
  // DEMO DATA — Hanya dijalankan jika SEED_DEMO=true
  // ═══════════════════════════════════════════════════════════

  if (SEED_DEMO) {

    // ============================================
    // USERS (upsert berdasarkan email — aman untuk re-run)
    // ============================================
    // --- ADMIN ---
    const adminPasswordHash = await bcrypt.hash("admin123", 10);
    const admin = await prisma.user.upsert({
      where: { email: "admin@qalcuity.com" },
      update: {
        name: "Admin User",
        passwordHash: adminPasswordHash,
        role: "ADMIN",
      },
      create: {
        email: "admin@qalcuity.com",
        name: "Admin User",
        passwordHash: adminPasswordHash,
        role: "ADMIN",
        tenantId: tenant.id,
      },
    });
    console.log("✅ Admin:", admin.email);

    // --- DEMO (for Try Demo feature) ---
    const demoPasswordHash = await bcrypt.hash("demo123", 10);
    const demo = await prisma.user.upsert({
      where: { email: "demo@qalcuity.com" },
      update: {
        name: "Demo User",
        passwordHash: demoPasswordHash,
        role: "ADMIN",
      },
      create: {
        email: "demo@qalcuity.com",
        name: "Demo User",
        passwordHash: demoPasswordHash,
        role: "ADMIN",
        tenantId: tenant.id,
      },
    });
    console.log("✅ Demo:", demo.email);

    // --- MEMBER ---
    const memberPasswordHash = await bcrypt.hash("member123", 10);
    const member = await prisma.user.upsert({
      where: { email: "member@qalcuity.com" },
      update: {
        name: "Member User",
        passwordHash: memberPasswordHash,
        role: "MEMBER",
      },
      create: {
        email: "member@qalcuity.com",
        name: "Member User",
        passwordHash: memberPasswordHash,
        role: "MEMBER",
        tenantId: tenant.id,
      },
    });
    console.log("✅ Member:", member.email);

    // --- VIEWER ---
    const viewerPasswordHash = await bcrypt.hash("viewer123", 10);
    const viewer = await prisma.user.upsert({
      where: { email: "viewer@qalcuity.com" },
      update: {
        name: "Viewer User",
        passwordHash: viewerPasswordHash,
        role: "VIEWER",
      },
      create: {
        email: "viewer@qalcuity.com",
        name: "Viewer User",
        passwordHash: viewerPasswordHash,
        role: "VIEWER",
        tenantId: tenant.id,
      },
    });
    console.log("✅ Viewer:", viewer.email);

    // --- USER (legacy) ---
    const userPasswordHash = await bcrypt.hash("user123", 10);
    const user = await prisma.user.upsert({
      where: { email: "user@qalcuity.com" },
      update: {
        name: "User Demo",
        passwordHash: userPasswordHash,
        role: "USER",
      },
      create: {
        email: "user@qalcuity.com",
        name: "User Demo",
        passwordHash: userPasswordHash,
        role: "USER",
        tenantId: tenant.id,
      },
    });
    console.log("✅ User:", user.email);

    // ═══════════════════════════════════════════════════════════
    // OPS DATASETS — shared modules (CRM → Inventory → HR)
    // Kanonik: apps/web/lib/seed-data/{crm,inventory,hr}.ts
    // Idempotent, deterministik (tanpa Math.random), tenant-scoped.
    // Panggil SEBELUM dokumen (invoices/quotes/PO) & seedFinanceData.
    // ═══════════════════════════════════════════════════════════
    const crm = await seedCrmData(prisma, {
      tenantId: tenant.id,
      createdBy: admin.id,
      anchorDate: "2026-10-10",
    });
    console.log(
      `✅ CRM: ${crm.counts.categories} categories, ${crm.counts.contacts} contacts, ${crm.counts.suppliers} suppliers, ${crm.counts.leads} leads, ${crm.counts.deals} deals, ${crm.counts.activities} activities`,
    );

    const inv = await seedInventoryData(prisma, {
      tenantId: tenant.id,
      categories: crm.categories,
      anchorDate: "2026-10-10",
    });
    console.log(
      `✅ Inventory: ${inv.counts.warehouses} warehouses, ${inv.counts.products} products, ${inv.counts.movements} movements, ${inv.counts.opnames} stock opnames`,
    );

    const hr = await seedHrData(prisma, {
      tenantId: tenant.id,
      anchorDate: "2026-10-10",
    });
    console.log(
      `✅ HR: ${hr.counts.departments} departments, ${hr.counts.employees} employees, ${hr.counts.payroll} payroll, ${hr.counts.attendance} attendance, ${hr.counts.leaves} leaves`,
    );

    // Refs untuk blok dokumen berikutnya (invoices / quotations / PO / audit)
    const contacts = crm.contacts;
    const suppliers = crm.suppliers;
    const products = inv.products;
    const deals = crm.deals;

    // Contacts (23) kini di-seed via seedCrmData() — refs: crm.contacts

    // Suppliers (9) kini di-seed via seedCrmData() — refs: crm.suppliers

    // Products (23 SKU) + StockMovements (60, konsisten: opening + IN − OUT + ADJ = Product.stock)
    // kini di-seed via seedInventoryData() — refs: inv.products

    // ============================================
    // INVOICES (upsert berdasarkan invoiceNumber)
    // ============================================
    const invoiceData = [
      {
        invoiceNumber: "INV-2026-001", status: "SENT", dueDate: new Date("2026-08-30"), notes: "Pembayaran via transfer bank",
        subtotal: 7500000, taxRate: 11, taxAmount: 825000, total: 8325000, contactIdx: 0,
        items: [{ description: "Widget A x50", quantity: 50, unitPrice: 150000, total: 7500000 }],
      },
      {
        invoiceNumber: "INV-2026-002", status: "PAID", dueDate: new Date("2026-07-31"), notes: "Sudah dibayar lunas",
        subtotal: 3750000, taxRate: 11, taxAmount: 412500, total: 4162500, contactIdx: 1,
        items: [{ description: "Part B x15", quantity: 15, unitPrice: 250000, total: 3750000 }],
      },
      {
        invoiceNumber: "INV-2026-003", status: "OVERDUE", dueDate: new Date("2026-07-30"), notes: "Pembayaran terlambat",
        subtotal: 23000000, taxRate: 11, taxAmount: 2530000, total: 25530000, contactIdx: 2,
        items: [{ description: "Widget Pro x92", quantity: 92, unitPrice: 250000, total: 23000000 }],
      },
      {
        invoiceNumber: "INV-2026-004", status: "DRAFT", dueDate: new Date("2026-09-15"), notes: "Draft invoice",
        subtotal: 7500000, taxRate: 11, taxAmount: 825000, total: 8325000, contactIdx: 3,
        items: [{ description: "Service C x15 jam", quantity: 15, unitPrice: 500000, total: 7500000 }],
      },
    ];

    const invoices = [];
    for (const inv of invoiceData) {
      const existing = await prisma.invoice.findFirst({
        where: { invoiceNumber: inv.invoiceNumber, tenantId: tenant.id },
      });
      if (existing) {
        invoices.push(existing);
      } else {
        const created = await prisma.invoice.create({
          data: {
            invoiceNumber: inv.invoiceNumber,
            status: inv.status,
            dueDate: inv.dueDate,
            notes: inv.notes,
            subtotal: inv.subtotal,
            taxRate: inv.taxRate,
            taxAmount: inv.taxAmount,
            total: inv.total,
            tenantId: tenant.id,
            contactId: contacts[inv.contactIdx].id,
            items: { create: inv.items },
          },
        });
        invoices.push(created);
      }
    }
    console.log("✅ Invoices:", invoices.length);

    // ============================================
    // ADDITIONAL INVOICES (CANCELLED + OVERDUE lama)
    // ============================================
    const additionalInvoiceData = [
      {
        invoiceNumber: "INV-2026-005", status: "CANCELLED", dueDate: new Date("2026-07-15"), notes: "Dibatalkan atas permintaan customer",
        subtotal: 5000000, taxRate: 0, taxAmount: 0, total: 5000000, contactIdx: 0,
        items: [{ description: "Service Konsultasi", quantity: 1, unitPrice: 5000000, total: 5000000 }],
      },
      {
        invoiceNumber: "INV-2026-006", status: "OVERDUE", dueDate: new Date("2026-06-30"), notes: "Invoice overdue lama — perlu follow-up",
        subtotal: 30000000, taxRate: 0, taxAmount: 0, total: 30000000, contactIdx: 2,
        items: [{ description: "Widget Pro Pack", quantity: 10, unitPrice: 3000000, total: 30000000 }],
      },
      // === More invoices (realistic Indonesian scenarios) ===
      {
        invoiceNumber: "INV-2026-007", status: "PAID", dueDate: new Date("2026-08-15"), notes: "Pembayaran laptop ASUS untuk PT Telkom",
        subtotal: 75000000, taxRate: 11, taxAmount: 8250000, total: 83250000, contactIdx: 5,
        items: [{ description: "Laptop ASUS VivoBook 14 x10", quantity: 10, unitPrice: 7500000, total: 75000000 }],
      },
      {
        invoiceNumber: "INV-2026-008", status: "SENT", dueDate: new Date("2026-09-10"), notes: "Monitor untuk PT Astra",
        subtotal: 44000000, taxRate: 11, taxAmount: 4840000, total: 48840000, contactIdx: 6,
        items: [{ description: "Monitor LG 24 inch x20", quantity: 20, unitPrice: 2200000, total: 44000000 }],
      },
      {
        invoiceNumber: "INV-2026-009", status: "PAID", dueDate: new Date("2026-08-05"), notes: "Keyboard untuk PT Pertamina",
        subtotal: 21250000, taxRate: 11, taxAmount: 2337500, total: 23587500, contactIdx: 7,
        items: [{ description: "Keyboard Mechanical Logitech x25", quantity: 25, unitPrice: 850000, total: 21250000 }],
      },
      {
        invoiceNumber: "INV-2026-010", status: "SENT", dueDate: new Date("2026-09-20"), notes: "Mouse wireless untuk CV Adil Makmur",
        subtotal: 14000000, taxRate: 11, taxAmount: 1540000, total: 15540000, contactIdx: 11,
        items: [{ description: "Mouse Wireless Logitech M331 x40", quantity: 40, unitPrice: 350000, total: 14000000 }],
      },
      {
        invoiceNumber: "INV-2026-011", status: "OVERDUE", dueDate: new Date("2026-07-20"), notes: "Printer untuk PT PLN — overdue",
        subtotal: 22400000, taxRate: 11, taxAmount: 2464000, total: 24864000, contactIdx: 8,
        items: [{ description: "Printer Canon PIXMA G3010 x8", quantity: 8, unitPrice: 2800000, total: 22400000 }],
      },
      {
        invoiceNumber: "INV-2026-012", status: "PAID", dueDate: new Date("2026-08-20"), notes: "Meja direktur untuk PT BCA",
        subtotal: 22500000, taxRate: 11, taxAmount: 2475000, total: 24975000, contactIdx: 9,
        items: [{ description: "Meja Kerja Direktur x5", quantity: 5, unitPrice: 4500000, total: 22500000 }],
      },
      {
        invoiceNumber: "INV-2026-013", status: "SENT", dueDate: new Date("2026-09-05"), notes: "Kursi ergonomis untuk PT Unilever",
        subtotal: 50000000, taxRate: 11, taxAmount: 5500000, total: 55500000, contactIdx: 10,
        items: [{ description: "Kursi Ergonomis Kerja x20", quantity: 20, unitPrice: 2500000, total: 50000000 }],
      },
      {
        invoiceNumber: "INV-2026-014", status: "DRAFT", dueDate: new Date("2026-09-25"), notes: "Rak arsip untuk PT Indofood",
        subtotal: 12000000, taxRate: 11, taxAmount: 1320000, total: 13320000, contactIdx: 12,
        items: [{ description: "Rak Arsip Besi 4 Susun x10", quantity: 10, unitPrice: 1200000, total: 12000000 }],
      },
      {
        invoiceNumber: "INV-2026-015", status: "OVERDUE", dueDate: new Date("2026-07-10"), notes: "Tinta printer untuk PT Surya — overdue 2 bulan",
        subtotal: 12000000, taxRate: 11, taxAmount: 1320000, total: 13320000, contactIdx: 13,
        items: [{ description: "Tinta Printer Canon GI-790 x100", quantity: 100, unitPrice: 120000, total: 12000000 }],
      },
      {
        invoiceNumber: "INV-2026-016", status: "PAID", dueDate: new Date("2026-08-25"), notes: "Office supplies untuk UD Barokah",
        subtotal: 750000, taxRate: 11, taxAmount: 82500, total: 832500, contactIdx: 14,
        items: [{ description: "Binder Map A4 x50", quantity: 50, unitPrice: 15000, total: 750000 }],
      },
      {
        invoiceNumber: "INV-2026-017", status: "SENT", dueDate: new Date("2026-09-12"), notes: "Pulpen untuk PT Garuda Teknologi",
        subtotal: 2400000, taxRate: 11, taxAmount: 264000, total: 2664000, contactIdx: 16,
        items: [{ description: "Pulpen Pilot G2 x300", quantity: 300, unitPrice: 8000, total: 2400000 }],
      },
      {
        invoiceNumber: "INV-2026-018", status: "DRAFT", dueDate: new Date("2026-09-30"), notes: "Oli untuk CV Mitra Sejati",
        subtotal: 7000000, taxRate: 11, taxAmount: 770000, total: 7770000, contactIdx: 17,
        items: [{ description: "Oli Mesin Castrol GTX x20", quantity: 20, unitPrice: 350000, total: 7000000 }],
      },
      {
        invoiceNumber: "INV-2026-019", status: "SENT", dueDate: new Date("2026-09-08"), notes: "Semen untuk PT Maju Terus",
        subtotal: 6500000, taxRate: 11, taxAmount: 715000, total: 7215000, contactIdx: 18,
        items: [{ description: "Semen Portland 50kg x100", quantity: 100, unitPrice: 65000, total: 6500000 }],
      },
      {
        invoiceNumber: "INV-2026-020", status: "PAID", dueDate: new Date("2026-08-28"), notes: "Software license untuk CV Kencana",
        subtotal: 9000000, taxRate: 11, taxAmount: 990000, total: 9990000, contactIdx: 19,
        items: [{ description: "Microsoft Office 365 x5", quantity: 5, unitPrice: 1800000, total: 9000000 }],
      },
    ];

    const additionalInvoices = [];
    for (const inv of additionalInvoiceData) {
      const existingInv = await prisma.invoice.findFirst({
        where: { invoiceNumber: inv.invoiceNumber, tenantId: tenant.id },
      });
      if (existingInv) {
        additionalInvoices.push(existingInv);
      } else {
        const created = await prisma.invoice.create({
          data: {
            invoiceNumber: inv.invoiceNumber,
            status: inv.status,
            dueDate: inv.dueDate,
            notes: inv.notes,
            subtotal: inv.subtotal,
            taxRate: inv.taxRate,
            taxAmount: inv.taxAmount,
            total: inv.total,
            tenantId: tenant.id,
            contactId: contacts[inv.contactIdx].id,
            items: { create: inv.items },
          },
        });
        additionalInvoices.push(created);
      }
    }
    console.log("✅ Additional Invoices:", additionalInvoices.length);

    // ============================================
    // PAYMENTS (skip jika sudah ada)
    // ============================================
    const existingPayments = await prisma.payment.count({
      where: { tenantId: tenant.id },
    });

    if (existingPayments === 0) {
      await prisma.payment.createMany({
        data: [
          { paymentNumber: "PAY-2026-001", amount: 4162500, paymentDate: new Date("2026-07-28"), method: "BANK_TRANSFER", status: "COMPLETED", type: "INCOME", notes: "Pembayaran lunas INV-2026-002", invoiceId: invoices[1].id, tenantId: tenant.id },
          { paymentNumber: "PAY-2026-002", amount: 25000000, paymentDate: new Date("2026-08-01"), method: "BANK_TRANSFER", status: "COMPLETED", type: "EXPENSE", notes: "Pembayaran ke PT Sejahtera Supplier", tenantId: tenant.id },
          { paymentNumber: "PAY-2026-003", amount: 5000000, paymentDate: new Date("2026-08-15"), method: "E_WALLET", status: "PENDING", type: "INCOME", notes: "DP pembayaran INV-2026-001 — menunggu konfirmasi", invoiceId: invoices[0].id, tenantId: tenant.id },
        ],
      });
    }
    console.log("✅ Payments: handled");

    // ============================================
    // ADDITIONAL PAYMENTS (lebih banyak variasi)
    // ============================================
    const additionalPaymentData = [
      { paymentNumber: "PAY-2026-004", amount: 25000000, paymentDate: new Date("2026-08-10"), method: "BANK_TRANSFER", status: "COMPLETED", type: "INCOME", notes: "Pembayaran Invoice INV-2026-001", tenantId: tenant.id },
      { paymentNumber: "PAY-2026-005", amount: 5000000, paymentDate: new Date("2026-08-12"), method: "CASH", status: "COMPLETED", type: "EXPENSE", notes: "Pembelian ATK", tenantId: tenant.id },
      { paymentNumber: "PAY-2026-006", amount: 83250000, paymentDate: new Date("2026-08-16"), method: "BANK_TRANSFER", status: "COMPLETED", type: "INCOME", notes: "Pembayaran lunas INV-2026-007 dari PT Telkom", tenantId: tenant.id },
      { paymentNumber: "PAY-2026-007", amount: 23587500, paymentDate: new Date("2026-08-04"), method: "BANK_TRANSFER", status: "COMPLETED", type: "INCOME", notes: "Pembayaran lunas INV-2026-009 dari PT Pertamina", tenantId: tenant.id },
      { paymentNumber: "PAY-2026-008", amount: 24975000, paymentDate: new Date("2026-08-18"), method: "BANK_TRANSFER", status: "COMPLETED", type: "INCOME", notes: "Pembayaran lunas INV-2026-012 dari PT BCA", tenantId: tenant.id },
      { paymentNumber: "PAY-2026-009", amount: 9990000, paymentDate: new Date("2026-08-27"), method: "E_WALLET", status: "COMPLETED", type: "INCOME", notes: "Pembayaran lunas INV-2026-020 dari CV Kencana", tenantId: tenant.id },
      { paymentNumber: "PAY-2026-010", amount: 832500, paymentDate: new Date("2026-08-26"), method: "CASH", status: "COMPLETED", type: "INCOME", notes: "Pembayaran INV-2026-016 dari UD Barokah", tenantId: tenant.id },
      { paymentNumber: "PAY-2026-011", amount: 37500000, paymentDate: new Date("2026-08-05"), method: "BANK_TRANSFER", status: "COMPLETED", type: "EXPENSE", notes: "Pembayaran ke CV Berkah Components", tenantId: tenant.id },
      { paymentNumber: "PAY-2026-012", amount: 15000000, paymentDate: new Date("2026-08-10"), method: "BANK_TRANSFER", status: "COMPLETED", type: "EXPENSE", notes: "Pembayaran ke PT Teknologi Nusantara", tenantId: tenant.id },
      { paymentNumber: "PAY-2026-013", amount: 10000000, paymentDate: new Date("2026-08-15"), method: "BANK_TRANSFER", status: "PENDING", type: "EXPENSE", notes: "Pembayaran ke PT Supply Indonesia — menunggu approval", tenantId: tenant.id },
      { paymentNumber: "PAY-2026-014", amount: 50000000, paymentDate: new Date("2026-08-20"), method: "CREDIT_CARD", status: "COMPLETED", type: "EXPENSE", notes: "Pembelian furnitur untuk kantor baru", tenantId: tenant.id },
      { paymentNumber: "PAY-2026-015", amount: 48840000, paymentDate: new Date("2026-09-01"), method: "BANK_TRANSFER", status: "PENDING", type: "INCOME", notes: "DP INV-2026-008 dari PT Astra — jatuh tempo 1 September", tenantId: tenant.id },
    ];

    for (const apd of additionalPaymentData) {
      const existingPay = await prisma.payment.findFirst({
        where: { paymentNumber: apd.paymentNumber, tenantId: tenant.id },
      });
      if (!existingPay) {
        await prisma.payment.create({ data: apd });
      }
    }
    console.log("✅ Additional Payments: handled");

    // ============================================
    // QUOTATIONS (upsert berdasarkan quotationNumber)
    // ============================================
    const quotationData = [
      {
        quotationNumber: "QUO-2026-001", status: "SENT", validUntil: new Date("2026-09-15"), notes: "Penawaran untuk paket enterprise",
        terms: "Pembayaran Net 30 hari", subtotal: 15000000, taxRate: 11, taxAmount: 1650000, total: 16650000, contactIdx: 0,
        items: [{ description: "Widget A x100", quantity: 100, unitPrice: 150000, total: 15000000 }],
      },
      {
        quotationNumber: "QUO-2026-002", status: "DRAFT", validUntil: new Date("2026-09-30"), notes: "Penawaran untuk komponen",
        terms: "Pembayaran Net 15 hari", subtotal: 5000000, taxRate: 11, taxAmount: 550000, total: 5550000, contactIdx: 2,
        items: [{ description: "Part B x20", quantity: 20, unitPrice: 250000, total: 5000000 }],
      },
      {
        quotationNumber: "QUO-2026-003", status: "ACCEPTED", validUntil: new Date("2026-08-31"), notes: "Penawaran layanan konsultasi — sudah diterima customer",
        terms: "Pembayaran Net 30 hari, DP 30%", subtotal: 7500000, taxRate: 11, taxAmount: 825000, discount: 500000, total: 7825000, contactIdx: 3,
        items: [{ description: "Service C x15 jam", quantity: 15, unitPrice: 500000, total: 7500000 }],
      },
      // === More quotations ===
      {
        quotationNumber: "QUO-2026-004", status: "SENT", validUntil: new Date("2026-10-15"), notes: "Penawaran IT equipment untuk PT Telkom",
        terms: "Pembayaran Net 45 hari", subtotal: 97500000, taxRate: 11, taxAmount: 10725000, total: 108225000, contactIdx: 5,
        items: [
          { description: "Laptop ASUS VivoBook 14 x10", quantity: 10, unitPrice: 7500000, total: 75000000 },
          { description: "Monitor LG 24 inch x10", quantity: 10, unitPrice: 2250000, total: 22500000 },
        ],
      },
      {
        quotationNumber: "QUO-2026-005", status: "ACCEPTED", validUntil: new Date("2026-09-20"), notes: "Penawaran furniture kantor untuk PT Astra — sudah diterima",
        terms: "Pembayaran Net 30 hari, DP 20%", subtotal: 70000000, taxRate: 11, taxAmount: 7700000, discount: 1000000, total: 76700000, contactIdx: 6,
        items: [
          { description: "Meja Kerja Direktur x5", quantity: 5, unitPrice: 4500000, total: 22500000 },
          { description: "Kursi Ergonomis Kerja x15", quantity: 15, unitPrice: 2500000, total: 37500000 },
          { description: "Rak Arsip Besi x10", quantity: 10, unitPrice: 1000000, total: 10000000 },
        ],
      },
      {
        quotationNumber: "QUO-2026-006", status: "DRAFT", validUntil: new Date("2026-10-30"), notes: "Penawaran software license untuk PT PLN",
        terms: "Pembayaran Net 30 hari", subtotal: 36000000, taxRate: 11, taxAmount: 3960000, total: 39960000, contactIdx: 8,
        items: [{ description: "Microsoft Office 365 Business x20", quantity: 20, unitPrice: 1800000, total: 36000000 }],
      },
      {
        quotationNumber: "QUO-2026-007", status: "REJECTED", validUntil: new Date("2026-08-15"), notes: "Penawaran ATK — ditolak, harga terlalu mahal",
        terms: "Pembayaran Cash on Delivery", subtotal: 3500000, taxRate: 11, taxAmount: 385000, total: 3885000, contactIdx: 11,
        items: [
          { description: "Printer Paper A4 x100 rim", quantity: 100, unitPrice: 45000, total: 4500000 },
        ],
      },
      {
        quotationNumber: "QUO-2026-008", status: "SENT", validUntil: new Date("2026-10-01"), notes: "Penawaran komponen otomotif untuk CV Mitra",
        terms: "Pembayaran Net 15 hari", subtotal: 17000000, taxRate: 11, taxAmount: 1870000, total: 18870000, contactIdx: 17,
        items: [
          { description: "Oli Mesin Castrol GTX x30", quantity: 30, unitPrice: 350000, total: 10500000 },
          { description: "Aki GS Astra MF50L x8", quantity: 8, unitPrice: 812500, total: 6500000 },
        ],
      },
      {
        quotationNumber: "QUO-2026-009", status: "ACCEPTED", validUntil: new Date("2026-09-10"), notes: "Penawaran bahan bangunan untuk PT Maju Terus — sudah diterima",
        terms: "Pembayaran Net 30 hari", subtotal: 16000000, taxRate: 11, taxAmount: 1760000, total: 17760000, contactIdx: 18,
        items: [
          { description: "Semen Portland 50kg x200", quantity: 200, unitPrice: 65000, total: 13000000 },
          { description: "Cat Tembok Vinilex 5kg x10", quantity: 10, unitPrice: 300000, total: 3000000 },
        ],
      },
      {
        quotationNumber: "QUO-2026-010", status: "EXPIRED", validUntil: new Date("2026-08-01"), notes: "Penawaran expired — laptop untuk PT BCA",
        terms: "Pembayaran Net 30 hari", subtotal: 22500000, taxRate: 11, taxAmount: 2475000, total: 24975000, contactIdx: 9,
        items: [{ description: "Laptop ASUS VivoBook 14 x3", quantity: 3, unitPrice: 7500000, total: 22500000 }],
      },
    ];

    const quotations = [];
    for (const quo of quotationData) {
      const existing = await prisma.quotation.findFirst({
        where: { quotationNumber: quo.quotationNumber, tenantId: tenant.id },
      });
      if (existing) {
        quotations.push(existing);
      } else {
        const created = await prisma.quotation.create({
          data: {
            quotationNumber: quo.quotationNumber,
            status: quo.status,
            validUntil: quo.validUntil,
            notes: quo.notes,
            terms: quo.terms,
            subtotal: quo.subtotal,
            taxRate: quo.taxRate,
            taxAmount: quo.taxAmount,
            total: quo.total,
            tenantId: tenant.id,
            contactId: contacts[quo.contactIdx].id,
            items: { create: quo.items },
          },
        });
        quotations.push(created);
      }
    }
    console.log("✅ Quotations:", quotations.length);

    // ============================================
    // PURCHASE ORDERS (upsert berdasarkan poNumber)
    // ============================================
    const poData = [
      {
        poNumber: "PO-2026-001", status: "RECEIVED", orderDate: new Date("2026-07-15"), deliveryDate: new Date("2026-07-20"),
        notes: "Restock Widget A", subtotal: 10000000, taxRate: 11, taxAmount: 1100000, total: 11100000, supplierIdx: 0,
        items: [{ description: "Widget A x100", quantity: 100, unitPrice: 100000, total: 10000000 }],
      },
      {
        poNumber: "PO-2026-002", status: "SENT", orderDate: new Date("2026-08-01"), deliveryDate: new Date("2026-08-10"),
        notes: "Restock Part B", subtotal: 36000000, taxRate: 11, taxAmount: 3960000, total: 39960000, supplierIdx: 1,
        items: [{ description: "Part B x200", quantity: 200, unitPrice: 180000, total: 36000000 }],
      },
      // === More purchase orders ===
      {
        poNumber: "PO-2026-003", status: "RECEIVED", orderDate: new Date("2026-06-10"), deliveryDate: new Date("2026-06-15"),
        notes: "Restock Laptop ASUS", subtotal: 155000000, taxRate: 11, taxAmount: 17050000, total: 172050000, supplierIdx: 4,
        items: [{ description: "Laptop ASUS VivoBook 14 x25", quantity: 25, unitPrice: 6200000, total: 155000000 }],
      },
      {
        poNumber: "PO-2026-004", status: "RECEIVED", orderDate: new Date("2026-06-20"), deliveryDate: new Date("2026-06-25"),
        notes: "Restock Monitor LG", subtotal: 72000000, taxRate: 11, taxAmount: 7920000, total: 79920000, supplierIdx: 4,
        items: [{ description: "Monitor LG 24 inch x40", quantity: 40, unitPrice: 1800000, total: 72000000 }],
      },
      {
        poNumber: "PO-2026-005", status: "RECEIVED", orderDate: new Date("2026-07-01"), deliveryDate: new Date("2026-07-05"),
        notes: "Restock Keyboard Mechanical", subtotal: 36000000, taxRate: 11, taxAmount: 3960000, total: 39960000, supplierIdx: 0,
        items: [{ description: "Keyboard Mechanical Logitech x60", quantity: 60, unitPrice: 600000, total: 36000000 }],
      },
      {
        poNumber: "PO-2026-006", status: "RECEIVED", orderDate: new Date("2026-07-10"), deliveryDate: new Date("2026-07-15"),
        notes: "Restock Mouse Wireless", subtotal: 44000000, taxRate: 11, taxAmount: 4840000, total: 48840000, supplierIdx: 0,
        items: [{ description: "Mouse Wireless Logitech M331 x200", quantity: 200, unitPrice: 220000, total: 44000000 }],
      },
      {
        poNumber: "PO-2026-007", status: "SENT", orderDate: new Date("2026-08-05"), deliveryDate: new Date("2026-08-12"),
        notes: "Restock Printer Canon", subtotal: 66000000, taxRate: 11, taxAmount: 7260000, total: 73260000, supplierIdx: 4,
        items: [{ description: "Printer Canon PIXMA G3010 x30", quantity: 30, unitPrice: 2200000, total: 66000000 }],
      },
      {
        poNumber: "PO-2026-008", status: "RECEIVED", orderDate: new Date("2026-07-20"), deliveryDate: new Date("2026-07-28"),
        notes: "Restock Furniture Kantor", subtotal: 80000000, taxRate: 11, taxAmount: 8800000, total: 88800000, supplierIdx: 5,
        items: [
          { description: "Meja Kerja Direktur x10", quantity: 10, unitPrice: 3200000, total: 32000000 },
          { description: "Kursi Ergonomis x20", quantity: 20, unitPrice: 1800000, total: 36000000 },
          { description: "Rak Arsip x10", quantity: 10, unitPrice: 1200000, total: 12000000 },
        ],
      },
      {
        poNumber: "PO-2026-009", status: "DRAFT", orderDate: new Date("2026-08-25"), deliveryDate: new Date("2026-09-05"),
        notes: "Restock ATK", subtotal: 5000000, taxRate: 11, taxAmount: 550000, total: 5550000, supplierIdx: 2,
        items: [
          { description: "Tinta Printer Canon GI-790 x200", quantity: 200, unitPrice: 85000, total: 17000000 },
          { description: "Binder Map A4 x500", quantity: 500, unitPrice: 8000, total: 4000000 },
        ],
      },
    ];

    const purchaseOrders = [];
    for (const po of poData) {
      const existing = await prisma.purchaseOrder.findFirst({
        where: { poNumber: po.poNumber, tenantId: tenant.id },
      });
      if (existing) {
        purchaseOrders.push(existing);
      } else {
        const created = await prisma.purchaseOrder.create({
          data: {
            poNumber: po.poNumber,
            status: po.status,
            orderDate: po.orderDate,
            deliveryDate: po.deliveryDate,
            notes: po.notes,
            subtotal: po.subtotal,
            taxRate: po.taxRate,
            taxAmount: po.taxAmount,
            total: po.total,
            tenantId: tenant.id,
            supplierId: suppliers[po.supplierIdx].id,
            items: { create: po.items },
          },
        });
        purchaseOrders.push(created);
      }
    }
    console.log("✅ Purchase Orders:", purchaseOrders.length);

    // Leads (14) + Deals (14) kini di-seed via seedCrmData() — refs: crm.leads, crm.deals
    // Employees (15) + Departments (7) + Payroll (6 periode × 15 = 90)
    // + Attendance (90 hari kerja, deterministik) + Leave (16, mix status)
    // kini di-seed via seedHrData() — jurnal payroll dibaca seedFinanceData dari DB.

    // ============================================
    // TENANT SUBSCRIPTION (legacy — kept for backward compatibility)
    // ============================================
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        subscriptionStatus: 'ACTIVE',
        currentPlanSlug: 'business',
        trialEndsAt: null,
      },
    });

    // [LEGACY] Find/create a legacy SubscriptionPlan to link the legacy subscription to.
    // Note: SubscriptionPlan is the legacy model. New code uses Plan + TenantEntitlement.
    // This legacy code is kept because BillingPayment still references TenantSubscription.
    // CATATAN: TenantSubscription.planId FK menunjuk model SubscriptionPlan (legacy),
    // BUKAN model Plan (baru) — lookup harus ke SubscriptionPlan agar tidak P2003
    // saat seed pertama kali di DB bersih.
    // TODO (#37): Remove after billing system is fully migrated to Plan + TenantEntitlement.
    const legacyPlan = await prisma.subscriptionPlan.upsert({
      where: { slug: 'growth' },
      update: {},
      create: {
        name: 'Growth',
        slug: 'growth',
        description: 'Legacy seed plan (link TenantSubscription to BillingPayment)',
        price: 799000,
        maxUsers: 10,
        maxProducts: 1000,
        maxStorage: '50GB',
      },
    });
    let sub: Awaited<ReturnType<typeof prisma.tenantSubscription.upsert>> | null = null;
    if (legacyPlan) {
      sub = await prisma.tenantSubscription.upsert({
        where: { id: 'default-subscription' },
        update: {},
        create: {
          id: 'default-subscription',
          tenantId: tenant.id,
          planId: legacyPlan.id,
          status: 'ACTIVE',
          startDate: new Date('2026-01-01'),
          endDate: new Date('2026-12-31'),
          nextBillingDate: new Date('2026-09-01'),
          paymentMethod: 'manual_transfer',
        },
      });
    }
    console.log("✅ Tenant Subscription (legacy): handled");

    // ============================================
    // BILLING PAYMENTS (4 records)
    // ============================================
    if (sub) {
      const billingPaymentData = [
        { subscriptionId: sub.id, tenantId: tenant.id, amount: 799000, paymentMethod: "manual_transfer", bankName: "BRI", accountNumber: "1234567890", accountName: "Ahmad Suharto", status: "VERIFIED", verifiedById: superadmin.id, verifiedAt: new Date("2026-08-15"), waConfirmed: true },
        { subscriptionId: sub.id, tenantId: tenant.id, amount: 799000, paymentMethod: "manual_transfer", bankName: "BCA", accountNumber: "9876543210", accountName: "Siti Rahayu", status: "PENDING", waConfirmed: true },
        { subscriptionId: sub.id, tenantId: tenant.id, amount: 299000, paymentMethod: "manual_transfer", bankName: "Mandiri", accountNumber: "5555666677", accountName: "Budi Santoso", status: "REJECTED", rejectReason: "Bukti transfer tidak sesuai", verifiedById: superadmin.id, verifiedAt: new Date("2026-08-20") },
        { subscriptionId: sub.id, tenantId: tenant.id, amount: 1999000, paymentMethod: "manual_transfer", bankName: "BSI", accountNumber: "1112223334", accountName: "Dewi Lestari", status: "PENDING", waConfirmed: false },
        { subscriptionId: sub.id, tenantId: tenant.id, amount: 799000, paymentMethod: "manual_transfer", bankName: "CIMB", accountNumber: "7778889990", accountName: "Rina Wulandari", status: "VERIFIED", verifiedById: superadmin.id, verifiedAt: new Date("2026-08-22"), waConfirmed: true },
        { subscriptionId: sub.id, tenantId: tenant.id, amount: 1999000, paymentMethod: "manual_transfer", bankName: "Danamon", accountNumber: "4445556667", accountName: "Fajar Nugroho", status: "PENDING", waConfirmed: false },
      ];

      for (const bpd of billingPaymentData) {
        const existingBP = await prisma.billingPayment.findFirst({
          where: { tenantId: tenant.id, amount: bpd.amount, accountNumber: bpd.accountNumber ?? undefined },
        });
        if (!existingBP) {
          await prisma.billingPayment.create({ data: bpd });
        }
      }
      console.log("✅ Billing Payments: 6 records");
    } else {
      console.log("⚠️ Billing Payments: skipped (no subscription found)");
    }

    // ============================================
    // AUDIT LOGS (skip jika sudah ada)
    // ============================================
    const existingAuditLogs = await prisma.auditLog.count({
      where: { tenantId: tenant.id },
    });

    if (existingAuditLogs === 0 && invoices.length > 0 && deals.length > 0 && products.length > 0) {
      await prisma.auditLog.createMany({
        data: [
          { action: "CREATE", entity: "Invoice", entityId: invoices[0].id, newValues: JSON.stringify({ invoiceNumber: "INV-2026-001", total: 8325000 }), ipAddress: "103.28.12.xxx", userId: superadmin.id, tenantId: tenant.id },
          { action: "UPDATE", entity: "Deal", entityId: deals[0].id, oldValues: JSON.stringify({ stage: "PROPOSAL" }), newValues: JSON.stringify({ stage: "NEGOTIATION" }), ipAddress: "36.95.xxx.xxx", userId: superadmin.id, tenantId: tenant.id },
          { action: "CREATE", entity: "Product", entityId: products[0].id, newValues: JSON.stringify({ sku: "WDG-001", name: "Widget A" }), ipAddress: "114.124.xxx.xxx", userId: user.id, tenantId: tenant.id },
          { action: "PAYMENT", entity: "Payment", entityId: "seed-payment-1", newValues: JSON.stringify({ amount: 4162500, method: "BANK_TRANSFER" }), ipAddress: "36.95.xxx.xxx", userId: superadmin.id, tenantId: tenant.id },
        ],
      });
    }
    console.log("✅ Audit Logs: handled");

    // ============================================
    // ADDITIONAL AUDIT LOGS (10 records lebih realistis)
    // ============================================
    const existingAdditionalAuditLogs = await prisma.auditLog.count({
      where: { tenantId: tenant.id },
    });

    if (existingAdditionalAuditLogs < 10) {
      await prisma.auditLog.createMany({
        data: [
          { action: "LOGIN", entity: "User", entityId: superadmin.id, newValues: JSON.stringify({ message: "Superadmin login" }), userId: superadmin.id, tenantId: tenant.id },
          { action: "CREATE", entity: "Invoice", entityId: "inv-1", newValues: JSON.stringify({ invoiceNumber: "INV-2026-001", total: 8325000 }), userId: admin.id, tenantId: tenant.id },
          { action: "UPDATE", entity: "Invoice", entityId: "inv-1", oldValues: JSON.stringify({ status: "DRAFT" }), newValues: JSON.stringify({ status: "SENT" }), userId: admin.id, tenantId: tenant.id },
          { action: "CREATE", entity: "Lead", entityId: "lead-1", newValues: JSON.stringify({ name: "PT ABC Technology", status: "NEW" }), userId: admin.id, tenantId: tenant.id },
          { action: "UPDATE", entity: "Deal", entityId: "deal-1", oldValues: JSON.stringify({ stage: "PROPOSAL" }), newValues: JSON.stringify({ stage: "NEGOTIATION" }), userId: admin.id, tenantId: tenant.id },
          { action: "CREATE", entity: "Product", entityId: "prod-1", newValues: JSON.stringify({ sku: "WDG-001", name: "Widget A" }), userId: admin.id, tenantId: tenant.id },
          { action: "DELETE", entity: "StockMovement", entityId: "sm-1", oldValues: JSON.stringify({ type: "ADJUSTMENT", quantity: -5 }), userId: admin.id, tenantId: tenant.id },
          { action: "CREATE", entity: "Contact", entityId: "contact-1", newValues: JSON.stringify({ name: "PT Maju Jaya", type: "CUSTOMER" }), userId: member.id, tenantId: tenant.id },
          { action: "UPDATE", entity: "Employee", entityId: "emp-1", oldValues: JSON.stringify({ position: "Junior Engineer" }), newValues: JSON.stringify({ position: "Software Engineer" }), userId: member.id, tenantId: tenant.id },
          { action: "UPDATE", entity: "TenantSubscription", entityId: "sub-1", oldValues: JSON.stringify({ status: "TRIAL" }), newValues: JSON.stringify({ status: "ACTIVE" }), userId: superadmin.id, tenantId: tenant.id },
        ],
      });
      console.log("✅ Additional Audit Logs: 10 records");
    } else {
      console.log("✅ Additional Audit Logs: already seeded");
    }

    // ============================================
    // COA (Chart of Accounts)
    // ============================================
    const existingCoA = await prisma.coAAccount.count({ where: { tenantId: tenant.id } });
    if (existingCoA === 0) {
      // Struktur CoA standar Indonesia — insert berurutan agar parent sudah ada
      const coaData = [
        // Aktiva (Assets)
        { code: "1000", name: "AKTIVA", type: "ASSET", parentId: null, balance: 0 },
        { code: "1100", name: "Kas & Bank", type: "ASSET", parentCode: "1000", balance: 0 },
        { code: "1101", name: "Kas Perusahaan", type: "ASSET", parentCode: "1100", balance: 45000000 },
        { code: "1102", name: "Bank BCA", type: "ASSET", parentCode: "1100", balance: 125000000 },
        { code: "1103", name: "Bank Mandiri", type: "ASSET", parentCode: "1100", balance: 78500000 },
        { code: "1200", name: "Piutang", type: "ASSET", parentCode: "1000", balance: 0 },
        { code: "1201", name: "Piutang Dagang", type: "ASSET", parentCode: "1200", balance: 85000000 },
        { code: "1202", name: "Piutang Pajak", type: "ASSET", parentCode: "1200", balance: 12000000 },
        { code: "1300", name: "Persediaan", type: "ASSET", parentCode: "1000", balance: 0 },
        { code: "1301", name: "Persediaan Barang", type: "ASSET", parentCode: "1300", balance: 250000000 },
        { code: "1400", name: "Aktiva Tetap", type: "ASSET", parentCode: "1000", balance: 0 },
        { code: "1401", name: "Peralatan Kantor", type: "ASSET", parentCode: "1400", balance: 85000000 },
        { code: "1402", name: "Kendaraan", type: "ASSET", parentCode: "1400", balance: 350000000 },
        { code: "1403", name: "Akumulasi Depresiasi", type: "ASSET", parentCode: "1400", balance: -125000000 },
        // Pasiva (Liabilities)
        { code: "2000", name: "PASIVA", type: "LIABILITY", parentId: null, balance: 0 },
        { code: "2100", name: "Utang Lancar", type: "LIABILITY", parentCode: "2000", balance: 0 },
        { code: "2101", name: "Utang Dagang", type: "LIABILITY", parentCode: "2100", balance: 65000000 },
        { code: "2102", name: "Utang Pajak", type: "LIABILITY", parentCode: "2100", balance: 8500000 },
        { code: "2103", name: "Utang Gaji", type: "LIABILITY", parentCode: "2100", balance: 22000000 },
        { code: "2200", name: "Utang Jangka Panjang", type: "LIABILITY", parentCode: "2000", balance: 0 },
        { code: "2201", name: "Utang Bank (Kredit)", type: "LIABILITY", parentCode: "2200", balance: 500000000 },
        // Modal (Equity)
        { code: "3000", name: "MODAL", type: "EQUITY", parentId: null, balance: 0 },
        { code: "3100", name: "Modal Disetor", type: "EQUITY", parentCode: "3000", balance: 500000000 },
        { code: "3200", name: "Laba Ditahan", type: "EQUITY", parentCode: "3000", balance: 180000000 },
        { code: "3300", name: "Laba Berjalan", type: "EQUITY", parentCode: "3000", balance: 45000000 },
        // Pendapatan (Revenue)
        { code: "4000", name: "PENDAPATAN", type: "REVENUE", parentId: null, balance: 0 },
        { code: "4100", name: "Pendapatan Penjualan", type: "REVENUE", parentCode: "4000", balance: 0 },
        { code: "4101", name: "Penjualan Produk", type: "REVENUE", parentCode: "4100", balance: 450000000 },
        { code: "4102", name: "Penjualan Jasa", type: "REVENUE", parentCode: "4100", balance: 125000000 },
        { code: "4200", name: "Pendapatan Lain", type: "REVENUE", parentCode: "4000", balance: 0 },
        { code: "4201", name: "Pendapatan Bunga", type: "REVENUE", parentCode: "4200", balance: 2500000 },
        // Beban (Expenses)
        { code: "5000", name: "BEBAN", type: "EXPENSE", parentId: null, balance: 0 },
        { code: "5100", name: "Beban Pokok Penjualan", type: "EXPENSE", parentCode: "5000", balance: 0 },
        { code: "5101", name: "Harga Pokok Penjualan", type: "EXPENSE", parentCode: "5100", balance: 280000000 },
        { code: "5200", name: "Beban Operasional", type: "EXPENSE", parentCode: "5000", balance: 0 },
        { code: "5201", name: "Gaji & Tunjangan", type: "EXPENSE", parentCode: "5200", balance: 95000000 },
        { code: "5202", name: "Sewa Kantor", type: "EXPENSE", parentCode: "5200", balance: 36000000 },
        { code: "5203", name: "Listrik & Internet", type: "EXPENSE", parentCode: "5200", balance: 8500000 },
        { code: "5300", name: "Beban Pemasaran", type: "EXPENSE", parentCode: "5000", balance: 0 },
        { code: "5301", name: "Biaya Marketing", type: "EXPENSE", parentCode: "5300", balance: 15000000 },
        { code: "5400", name: "Beban Lain", type: "EXPENSE", parentCode: "5000", balance: 0 },
        { code: "5401", name: "Biaya Depresiasi", type: "EXPENSE", parentCode: "5400", balance: 12500000 },
        { code: "5402", name: "Biaya Bunga", type: "EXPENSE", parentCode: "5400", balance: 5000000 },
        { code: "5403", name: "Biaya Admin Bank", type: "EXPENSE", parentCode: "5400", balance: 1200000 },
      ];

      // Map code → id untuk resolving parent
      const codeToId: Record<string, string> = {};

      for (const item of coaData) {
        const parentId = item.parentCode ? codeToId[item.parentCode] : item.parentId ?? null;
        const created = await prisma.coAAccount.create({
          data: {
            tenantId: tenant.id,
            code: item.code,
            name: item.name,
            type: item.type,
            description: "",
            parentId,
            balance: item.balance,
            isActive: true,
          },
        });
        codeToId[item.code] = created.id;
      }
      console.log("✅ CoA Accounts:", coaData.length);
    } else {
      console.log("✅ CoA Accounts: already seeded");
    }

    // ============================================
    // BANK TRANSACTIONS (untuk Reconciliation)
    // ============================================
    const existingBankTx = await prisma.bankTransaction.count({ where: { tenantId: tenant.id } });
    if (existingBankTx === 0) {
      // Cari akun Bank BCA untuk matchedAccountId
      const bankBca = await prisma.coAAccount.findFirst({
        where: { tenantId: tenant.id, code: "1102" },
      });

      const bankTxData = [
        { date: new Date("2026-08-28"), description: "Transfer Masuk dari PT Maju Jaya", amount: 15500000, type: "credit", status: "unmatched", bankReference: "TRF-20260828-001" },
        { date: new Date("2026-08-27"), description: "Pembayaran Invoice INV-2026-0892", amount: -8250000, type: "debit", status: "matched", matchedAccountId: bankBca?.id, bankReference: "TRF-20260827-002" },
        { date: new Date("2026-08-27"), description: "Biaya Admin Bank", amount: -25000, type: "debit", status: "discrepancy", bankReference: "ADM-20260827", discrepancyNote: "Biaya admin tidak ada di buku" },
        { date: new Date("2026-08-26"), description: "Transfer Masuk dari CV Berkah", amount: 5000000, type: "credit", status: "unmatched", bankReference: "TRF-20260826-004" },
        { date: new Date("2026-08-26"), description: "Pembayaran Supplier PT ABC", amount: -3750000, type: "debit", status: "matched", matchedAccountId: bankBca?.id, bankReference: "TRF-20260826-005" },
        { date: new Date("2026-08-25"), description: "Transfer Masuk dari PT Sejahtera", amount: 23000000, type: "credit", status: "unmatched", bankReference: "TRF-20260825-006" },
        { date: new Date("2026-08-25"), description: "Pembayaran Gaji Karyawan", amount: -45000000, type: "debit", status: "matched", matchedAccountId: bankBca?.id, bankReference: "SALARY-20260825" },
        { date: new Date("2026-08-24"), description: "Biaya Transfer Out", amount: -6500, type: "debit", status: "discrepancy", bankReference: "FEE-20260824", discrepancyNote: "Biaya transfer tidak tercatat" },
      ];

      await prisma.bankTransaction.createMany({
        data: bankTxData.map((tx) => ({
          tenantId: tenant.id,
          date: tx.date,
          description: tx.description,
          amount: tx.amount,
          type: tx.type,
          status: tx.status,
          matchedAccountId: tx.matchedAccountId || null,
          bankReference: tx.bankReference || null,
          discrepancyNote: tx.discrepancyNote || null,
        })),
      });
      console.log("✅ Bank Transactions:", bankTxData.length);
    } else {
      console.log("✅ Bank Transactions: already seeded");
    }

    // ═══════════════════════════════════════════════════════════
    // FINANCE P0 (shared module) — TaxRate + CoA + Journal + Bill + Expense + Period
    // Data sama persis dengan loadDemoData() via apps/web/lib/seed-data/finance.ts
    // ═══════════════════════════════════════════════════════════
    const fin = await seedFinanceData(prisma, {
      tenantId: tenant.id,
      createdBy: admin.id,
      tenantPrefix: "QD",
      anchorDate: "2026-10-10",
    });
    console.log("✅ Finance P0:", {
      taxRates: fin.taxRatesCreated,
      coaAccounts: fin.coaAccountsCreated,
      historicalInvoices: fin.historicalInvoicesCreated,
      historicalPayments: fin.historicalPaymentsCreated,
      bills: fin.billsCreated,
      expenses: fin.expensesCreated,
      journalEntries: fin.journalEntriesCreated,
      journalItems: fin.journalItemsCreated,
      journalEntriesSkipped: fin.journalEntriesSkipped,
      accountingPeriods: fin.periodsCreated,
    });
    if (fin.warnings.length > 0) {
      console.warn("⚠️  Finance warnings:", fin.warnings);
    }

    console.log("\n✅ Demo data seeded (Users, Categories, Contacts, Suppliers, Activities, Warehouses, Products, StockMovements, StockOpnames, Invoices, Payments, Quotations, POs, Leads, Deals, Departments, Employees, Attendance, Leaves, Payroll, Billing, Audit, CoA, BankTx, FinanceP0)");

  } else {
    console.log("⏭️  Demo data skipped (set SEED_DEMO=true to include)");
  }

  // ═══════════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════════

  console.log("\n🎉 Seeding completed!");
  console.log(`\n📋 Mode: ${SEED_DEMO ? 'FULL (core + demo)' : 'CORE ONLY'}`);
  console.log("\n📋 Accounts:");
  console.log("  SuperAdmin: info@qalcuity.com / Wahyu123456789@");
  if (SEED_DEMO) {
    console.log("  Admin:      admin@qalcuity.com / admin123");
    console.log("  Demo:       demo@qalcuity.com / demo123");
    console.log("  Member:     member@qalcuity.com / member123");
    console.log("  Viewer:     viewer@qalcuity.com / viewer123");
    console.log("  User:       user@qalcuity.com / user123");
  } else {
    console.log("\n  💡 To seed demo accounts & data, run:");
    console.log("     SEED_DEMO=true npx prisma db seed");
  }
  console.log("\n📋 Core Data:");
  console.log("  ✅ Tenant: PT Qalcuity Demo");
  console.log("  ✅ SuperAdmin: info@qalcuity.com");
  console.log("  ✅ Plans: Free, Pro, Enterprise");
  console.log("  ✅ Platform Settings");
  console.log("  ✅ Plan Tenant Limits");
  console.log("  ✅ Tax Rates: PPN 11%, PPh 23%, PPh 21");
  console.log("  ✅ Tenant Entitlement: Free plan (trial)");
  if (SEED_DEMO) {
    console.log("\n📋 Demo Data (shared modules: crm.ts / inventory.ts / hr.ts / finance.ts):");
    console.log("  ✅ Users: 5 (Admin, Demo, Member, Viewer, User)");
    console.log("  ✅ Categories: 9");
    console.log("  ✅ Contacts: 23");
    console.log("  ✅ Suppliers: 9");
    console.log("  ✅ Leads: 14");
    console.log("  ✅ Deals: 14");
    console.log("  ✅ Activities: 25 (CALL 6, EMAIL 6, MEETING 5, NOTE 5, TASK 3)");
    console.log("  ✅ Departments: 7");
    console.log("  ✅ Employees: 15 (terhubung departmentId)");
    console.log("  ✅ Payroll Records: 90 (6 periode × 15 karyawan)");
    console.log("  ✅ Attendance Records: ~1.335 (90 hari kerja × 15, deterministik)");
    console.log("  ✅ Leave Requests: 16 (mix status, overlap attendance → LEAVE)");
    console.log("  ✅ Warehouses: 2 (GUDANG-PUSAT default, GUDANG-CABANG)");
    console.log("  ✅ Products: 23 (setengah terhubung warehouseId)");
    console.log("  ✅ Stock Movements: 60 (opening + IN − OUT + ADJ = Product.stock)");
    console.log("  ✅ Stock Opnames: 2 + items (1 COMPLETED, 1 DRAFT)");
    console.log("  ✅ Invoices: 20 + items");
    console.log("  ✅ Payments: 18");
    console.log("  ✅ Quotations: 10 + items");
    console.log("  ✅ Purchase Orders: 9 + items");
    console.log("  ✅ Billing Payments: 6");
    console.log("  ✅ Audit Logs: 14");
    console.log("  ✅ CoA Accounts: 44");
    console.log("  ✅ Bank Transactions: 8");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
