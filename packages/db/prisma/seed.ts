import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/**
 * Seed script yang aman untuk production.
 * Menggunakan upsert untuk entity utama agar bisa dijalankan berulang kali tanpa error.
 * Entity turunan menggunakan try-catch untuk skip jika sudah ada.
 */

async function main() {
  console.log("🌱 Seeding database...");

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
  // USERS (upsert berdasarkan email — aman untuk re-run)
  // ============================================
  // --- SUPERADMIN ---
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

  // ============================================
  // CATEGORIES (upsert berdasarkan name+tenantId via findFirst)
  // ============================================
  const categoryData = [
    { name: "Electronics", description: "Produk elektronik" },
    { name: "Mechanical", description: "Komponen mekanik" },
    { name: "Services", description: "Layanan jasa" },
    { name: "Office Supplies", description: "Perlengkapan kantor" },
  ];

  const categories = [];
  for (const cd of categoryData) {
    const existing = await prisma.category.findFirst({
      where: { name: cd.name, tenantId: tenant.id },
    });
    if (existing) {
      categories.push(existing);
    } else {
      const created = await prisma.category.create({
        data: { ...cd, tenantId: tenant.id },
      });
      categories.push(created);
    }
  }
  console.log("✅ Categories:", categories.length);

  // ============================================
  // CONTACTS (dengan field company baru)
  // ============================================
  const contactData = [
    { name: "PT Maju Jaya", type: "CUSTOMER", company: "PT Maju Jaya", email: "info@majujaya.co.id", phone: "021-2345678", address: "Jl. Gatot Subroto No. 45", city: "Jakarta", taxId: "01.234.567.8-901.000" },
    { name: "CV Berkah Mandiri", type: "CUSTOMER", company: "CV Berkah Mandiri", email: "info@berkahmandiri.co.id", phone: "021-3456789", address: "Jl. HR Rasuna Said No. 78", city: "Jakarta" },
    { name: "PT Sejahtera Abadi", type: "CUSTOMER", company: "PT Sejahtera Abadi", email: "sales@sejahtera.co.id", phone: "021-4567890", address: "Jl. TB Simatupang No. 90", city: "Jakarta" },
    { name: "PT Nusantara Jaya", type: "CUSTOMER", company: "PT Nusantara Jaya", email: "info@nusantara.co.id", phone: "021-5678901", address: "Jl. Thamrin No. 12", city: "Jakarta" },
    { name: "CV Sukses Mandiri", type: "CUSTOMER", company: "CV Sukses Mandiri", email: "info@suksesmandiri.co.id", phone: "021-6789012", address: "Jl. Kuningan No. 55", city: "Jakarta" },
  ];

  const contacts = [];
  for (const cd of contactData) {
    const existing = await prisma.contact.findFirst({
      where: { name: cd.name, tenantId: tenant.id },
    });
    if (existing) {
      // Update company field jika belum ada
      const updated = await prisma.contact.update({
        where: { id: existing.id },
        data: { company: cd.company },
      });
      contacts.push(updated);
    } else {
      const created = await prisma.contact.create({
        data: { ...cd, tenantId: tenant.id },
      });
      contacts.push(created);
    }
  }
  console.log("✅ Contacts:", contacts.length);

  // ============================================
  // ADDITIONAL CONTACTS (SUPPLIER, BOTH)
  // ============================================
  const additionalContactData = [
    { name: "PT Sumber Makmur", type: "SUPPLIER", company: "PT Sumber Makmur", email: "info@sumbermakmur.co.id", phone: "021-5553691" },
    { name: "CV Global Tech", type: "BOTH", company: "CV Global Tech", email: "hello@globaltech.co.id", phone: "021-5557412" },
  ];

  const additionalContacts = [];
  for (const acd of additionalContactData) {
    const existingContact = await prisma.contact.findFirst({
      where: { name: acd.name, tenantId: tenant.id },
    });
    if (existingContact) {
      additionalContacts.push(existingContact);
    } else {
      const created = await prisma.contact.create({
        data: { ...acd, tenantId: tenant.id },
      });
      additionalContacts.push(created);
    }
  }
  console.log("✅ Additional Contacts:", additionalContacts.length);

  // ============================================
  // SUPPLIERS
  // ============================================
  const supplierData = [
    { name: "PT Sejahtera Supplier", contactPerson: "Budi Hartono", email: "budi@sejahtera-supplier.co.id", phone: "021-7890123", address: "Jl. Raya Bogor Km 30", city: "Jakarta", rating: 4.5 },
    { name: "CV Berkah Components", contactPerson: "Siti Rahayu", email: "siti@berkahcomp.co.id", phone: "021-8901234", address: "Jl. Raya Bekasi Km 15", city: "Bekasi", rating: 4.0 },
    { name: "PT Teknologi Nusantara", contactPerson: "Rahmat Widodo", email: "rahmat@teknusa.co.id", phone: "021-9012345", address: "Jl. Raya Tangerang Km 12", city: "Tangerang", rating: 4.2 },
  ];

  const suppliers = [];
  for (const sd of supplierData) {
    const existing = await prisma.supplier.findFirst({
      where: { name: sd.name, tenantId: tenant.id },
    });
    if (existing) {
      suppliers.push(existing);
    } else {
      const created = await prisma.supplier.create({
        data: { ...sd, tenantId: tenant.id },
      });
      suppliers.push(created);
    }
  }
  console.log("✅ Suppliers:", suppliers.length);

  // ============================================
  // PRODUCTS
  // ============================================
  const productData = [
    { sku: "WDG-001", name: "Widget A", description: "Widget standar untuk kebutuhan umum", unit: "pcs", price: 150000, cost: 100000, stock: 150, minStock: 20, categoryIdx: 0 },
    { sku: "PRT-001", name: "Part B", description: "Komponen mesin tipe B", unit: "pcs", price: 250000, cost: 180000, stock: 75, minStock: 10, categoryIdx: 1 },
    { sku: "SVC-001", name: "Service C", description: "Layanan konsultasi teknis", unit: "hour", price: 500000, cost: 300000, stock: 999, minStock: 0, categoryIdx: 2 },
    { sku: "OFF-001", name: "Printer Paper A4", description: "Kertas printer ukuran A4", unit: "rim", price: 45000, cost: 35000, stock: 200, minStock: 50, categoryIdx: 3 },
    { sku: "WDG-002", name: "Widget Pro", description: "Widget versi pro dengan fitur lengkap", unit: "pcs", price: 250000, cost: 180000, stock: 8, minStock: 15, categoryIdx: 0 },
  ];

  const products = [];
  for (const pd of productData) {
    const existing = await prisma.product.findFirst({
      where: { sku: pd.sku, tenantId: tenant.id },
    });
    if (existing) {
      products.push(existing);
    } else {
      const created = await prisma.product.create({
        data: {
          sku: pd.sku,
          name: pd.name,
          description: pd.description,
          unit: pd.unit,
          price: pd.price,
          cost: pd.cost,
          stock: pd.stock,
          minStock: pd.minStock,
          categoryId: categories[pd.categoryIdx].id,
          tenantId: tenant.id,
        },
      });
      products.push(created);
    }
  }
  console.log("✅ Products:", products.length);

  // ============================================
  // STOCK MOVEMENTS (skip jika sudah ada)
  // ============================================
  const existingStockMovements = await prisma.stockMovement.count({
    where: { tenantId: tenant.id },
  });

  if (existingStockMovements === 0) {
    await prisma.stockMovement.createMany({
      data: [
        { type: "IN", quantity: 100, reference: "PO-2026-001", notes: "Restock Widget A", productId: products[0].id, tenantId: tenant.id },
        { type: "OUT", quantity: 50, reference: "INV-2026-001", notes: "Penjualan ke PT Maju Jaya", productId: products[0].id, tenantId: tenant.id },
        { type: "IN", quantity: 200, reference: "PO-2026-002", notes: "Restock Part B", productId: products[1].id, tenantId: tenant.id },
        { type: "OUT", quantity: 30, reference: "INV-2026-003", notes: "Penjualan ke CV Berkah", productId: products[1].id, tenantId: tenant.id },
        { type: "ADJUSTMENT", quantity: -5, reference: "ADJ-001", notes: "Koreksi stok Widget Pro", productId: products[4].id, tenantId: tenant.id },
      ],
    });
  }
  console.log("✅ Stock Movements: handled");

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

  // ============================================
  // LEADS (skip jika sudah ada)
  // ============================================
  const existingLeads = await prisma.lead.count({
    where: { tenantId: tenant.id },
  });

  if (existingLeads === 0) {
    await prisma.lead.createMany({
      data: [
        { name: "PT Nusantara Jaya", company: "PT Nusantara Jaya", email: "info@nusantara.co.id", phone: "021-5678901", source: "WEBSITE", status: "NEW", value: 25000000, notes: "Tertarik dengan paket enterprise", tenantId: tenant.id },
        { name: "CV Sukses Mandiri", company: "CV Sukses Mandiri", email: "info@suksesmandiri.co.id", phone: "021-6789012", source: "REFERRAL", status: "CONTACTED", value: 15000000, notes: "Direkomendasikan oleh PT Maju Jaya", tenantId: tenant.id },
        { name: "PT ABC Technology", company: "PT ABC Technology", email: "info@abctech.co.id", phone: "021-7890123", source: "SOCIAL_MEDIA", status: "QUALIFIED", value: 50000000, notes: "Lead dari LinkedIn, sangat potensial", tenantId: tenant.id },
        { name: "CV Berkah Jaya", company: "CV Berkah Jaya", email: "info@berkahjaya.co.id", phone: "021-8901234", source: "COLD_CALL", status: "PROPOSAL", value: 45000000, notes: "Proposal sudah dikirim", tenantId: tenant.id },
      ],
    });
  }
  console.log("✅ Leads: handled");

  // ============================================
  // ADDITIONAL LEADS (WON/LOST)
  // ============================================
  const additionalLeadData = [
    { name: "PT Maju Bersama", email: "info@majubersama.co.id", phone: "021-5551234", company: "PT Maju Bersama", source: "REFERRAL", status: "WON", value: 50000000, tenantId: tenant.id },
    { name: "CV Berkah Jaya", email: "sales@berkahjaya.co.id", phone: "031-5559876", company: "CV Berkah Jaya", source: "WEBSITE", status: "LOST", value: 25000000, notes: "Pilih kompetitor", tenantId: tenant.id },
    { name: "PT Sejahtera Abadi", email: "procurement@sejahtera.co.id", phone: "021-5552468", company: "PT Sejahtera Abadi", source: "COLD_CALL", status: "WON", value: 75000000, tenantId: tenant.id },
    { name: "UD Makmur Sentosa", email: "order@makmursentosa.co.id", phone: "0274-5551357", company: "UD Makmur Sentosa", source: "SOCIAL_MEDIA", status: "LOST", value: 15000000, notes: "Budget tidak cukup", tenantId: tenant.id },
  ];

  const additionalLeads = [];
  for (const ald of additionalLeadData) {
    const existingLead = await prisma.lead.findFirst({
      where: { name: ald.name, tenantId: tenant.id },
    });
    if (existingLead) {
      additionalLeads.push(existingLead);
    } else {
      const created = await prisma.lead.create({ data: ald });
      additionalLeads.push(created);
    }
  }
  console.log("✅ Additional Leads:", additionalLeads.length);

  // ============================================
  // DEALS (skip jika sudah ada)
  // ============================================
  const existingDeals = await prisma.deal.count({
    where: { tenantId: tenant.id },
  });

  const deals: { id: string }[] = [];
  if (existingDeals === 0) {
    const d1 = await prisma.deal.create({ data: { title: "PT ABC Corp - Paket Enterprise", value: 150000000, stage: "NEGOTIATION", probability: 75, closeDate: new Date("2026-08-30"), notes: "Sedang dalam negosiasi harga", tenantId: tenant.id, contactId: contacts[0].id } });
    const d2 = await prisma.deal.create({ data: { title: "CV Maju Bersama - Annual Contract", value: 85000000, stage: "PROPOSAL", probability: 55, closeDate: new Date("2026-09-15"), notes: "Proposal annual contract", tenantId: tenant.id, contactId: contacts[1].id } });
    const d3 = await prisma.deal.create({ data: { title: "PT Sejahtera - Bulk Order", value: 200000000, stage: "DISCOVERY", probability: 30, closeDate: new Date("2026-10-01"), notes: "Discovery phase, baru mulai", tenantId: tenant.id, contactId: contacts[2].id } });
    const d4 = await prisma.deal.create({ data: { title: "CV Berkah Jaya - Maintenance Contract", value: 45000000, stage: "CLOSING", probability: 90, closeDate: new Date("2026-08-15"), notes: "Tinggal tanda tangan kontrak", tenantId: tenant.id, contactId: contacts[1].id } });
    deals.push(d1, d2, d3, d4);
  } else {
    deals.push(...(await prisma.deal.findMany({ where: { tenantId: tenant.id } })));
  }
  console.log("✅ Deals:", deals.length);

  // ============================================
  // ADDITIONAL DEALS (CLOSED_WON / CLOSED_LOST)
  // ============================================
  const additionalDealData = [
    { title: "Paket Website Company Profile", value: 25000000, stage: "CLOSED_WON", contactId: contacts[0].id, leadId: additionalLeads.length > 0 ? additionalLeads[0].id : null, tenantId: tenant.id, probability: 100, closeDate: new Date("2026-08-10") },
    { title: "Maintenance Server Tahunan", value: 15000000, stage: "CLOSED_LOST", contactId: contacts[1].id, leadId: additionalLeads.length > 1 ? additionalLeads[1].id : null, tenantId: tenant.id, probability: 0, closeDate: new Date("2026-08-15"), notes: "Customer memilih kompetitor" },
  ];

  for (const add of additionalDealData) {
    const existingDeal = await prisma.deal.findFirst({
      where: { title: add.title, tenantId: tenant.id },
    });
    if (!existingDeal) {
      await prisma.deal.create({ data: add });
    }
  }
  console.log("✅ Additional Deals: handled");

  // ============================================
  // EMPLOYEES (upsert berdasarkan employeeId+tenantId)
  // ============================================
  const employeeData = [
    { employeeId: "EMP-001", name: "Budi Santoso", email: "budi@qalcuity.com", phone: "0812-3456-7890", position: "Software Engineer", department: "Engineering", joinDate: new Date("2024-01-15"), salary: 15000000 },
    { employeeId: "EMP-002", name: "Sari Dewi", email: "sari@qalcuity.com", phone: "0812-4567-8901", position: "Marketing Manager", department: "Marketing", joinDate: new Date("2023-06-01"), salary: 18000000 },
    { employeeId: "EMP-003", name: "Andi Pratama", email: "andi@qalcuity.com", phone: "0812-5678-9012", position: "Accountant", department: "Finance", joinDate: new Date("2025-03-10"), salary: 12000000 },
    { employeeId: "EMP-004", name: "Dewi Lestari", email: "dewi@qalcuity.com", phone: "0812-6789-0123", position: "HR Specialist", department: "HR", joinDate: new Date("2024-09-01"), salary: 12000000 },
    { employeeId: "EMP-005", name: "Eko Prasetyo", email: "eko@qalcuity.com", phone: "0812-7890-1234", position: "Sales Executive", department: "Sales", joinDate: new Date("2025-03-01"), salary: 14000000 },
  ];

  const employees = [];
  for (const ed of employeeData) {
    const existing = await prisma.employee.findFirst({
      where: { employeeId: ed.employeeId, tenantId: tenant.id },
    });
    if (existing) {
      employees.push(existing);
    } else {
      const created = await prisma.employee.create({
        data: { ...ed, tenantId: tenant.id },
      });
      employees.push(created);
    }
  }
  console.log("✅ Employees:", employees.length);

  // ============================================
  // ATTENDANCE RECORDS (30 hari historis untuk semua employees)
  // ============================================
  const existingAttendanceCount = await prisma.attendanceRecord.count({
    where: { tenantId: tenant.id },
  });

  if (existingAttendanceCount < 50) {
    const attendanceStatuses = ["PRESENT", "PRESENT", "PRESENT", "PRESENT", "LATE", "WFH", "ABSENT"];
    let attendanceCreated = 0;

    for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
      const date = new Date();
      date.setDate(date.getDate() - dayOffset);
      date.setHours(0, 0, 0, 0);
      // Skip weekends
      if (date.getDay() === 0 || date.getDay() === 6) continue;

      for (const emp of employees) {
        const randomStatus = attendanceStatuses[Math.floor(Math.random() * attendanceStatuses.length)];
        try {
          await prisma.attendanceRecord.create({
            data: {
              employeeId: emp.id,
              tenantId: tenant.id,
              date: date,
              clockIn: randomStatus === "PRESENT"
                ? new Date(date.getFullYear(), date.getMonth(), date.getDate(), 8, 0)
                : randomStatus === "LATE"
                  ? new Date(date.getFullYear(), date.getMonth(), date.getDate(), 8, 30)
                  : null,
              clockOut: randomStatus === "PRESENT" || randomStatus === "LATE"
                ? new Date(date.getFullYear(), date.getMonth(), date.getDate(), 17, 0)
                : null,
              status: randomStatus,
              workHours: randomStatus === "PRESENT" || randomStatus === "LATE" ? 8 : 0,
              notes: randomStatus === "WFH" ? "Work from home" : randomStatus === "ABSENT" ? "Sakit" : null,
            },
          });
          attendanceCreated++;
        } catch {
          // Skip if already exists (unique constraint)
        }
      }
    }
    console.log(`✅ Attendance Records: ${attendanceCreated} created (${existingAttendanceCount} already existed)`);
  } else {
    console.log("✅ Attendance Records: already seeded (30 days history)");
  }

  // ============================================
  // LEAVE REQUESTS (skip jika sudah ada)
  // ============================================
  const existingLeaves = await prisma.leaveRequest.count({
    where: { tenantId: tenant.id },
  });

  if (existingLeaves === 0) {
    await prisma.leaveRequest.createMany({
      data: [
        { type: "ANNUAL", startDate: new Date("2026-08-04"), endDate: new Date("2026-08-05"), days: 2, reason: "Istirahat", status: "APPROVED", appliedDate: new Date("2026-08-01"), approvedBy: "Admin Qalcuity", employeeId: employees[0].id, tenantId: tenant.id },
        { type: "SICK", startDate: new Date("2026-08-03"), endDate: new Date("2026-08-03"), days: 1, reason: "Sakit demam", status: "APPROVED", appliedDate: new Date("2026-08-03"), approvedBy: "Admin Qalcuity", employeeId: employees[1].id, tenantId: tenant.id },
        { type: "ANNUAL", startDate: new Date("2026-08-06"), endDate: new Date("2026-08-08"), days: 3, reason: "Keluarga", status: "PENDING", appliedDate: new Date("2026-08-02"), employeeId: employees[2].id, tenantId: tenant.id },
        { type: "PERSONAL", startDate: new Date("2026-08-20"), endDate: new Date("2026-08-20"), days: 1, reason: "Urusan pribadi — melebihi kuota cuti tahunan", status: "REJECTED", appliedDate: new Date("2026-08-10"), approvedBy: "Admin Qalcuity", notes: "Ditolak karena kuota cuti tahunan habis", employeeId: employees[3].id, tenantId: tenant.id },
      ],
    });
  }
  console.log("✅ Leave Requests: handled");

  // ============================================
  // PAYROLL RECORDS (skip jika sudah ada)
  // ============================================
  const existingPayroll = await prisma.payrollRecord.count({
    where: { tenantId: tenant.id },
  });

  if (existingPayroll === 0) {
    await prisma.payrollRecord.createMany({
      data: [
        { period: "2026-07", baseSalary: 15000000, allowances: 1500000, deductions: 500000, bonus: 0, netSalary: 16000000, status: "PAID", paidAt: new Date("2026-07-28"), employeeId: employees[0].id, tenantId: tenant.id },
        { period: "2026-07", baseSalary: 18000000, allowances: 2000000, deductions: 600000, bonus: 1000000, netSalary: 20400000, status: "PAID", paidAt: new Date("2026-07-28"), employeeId: employees[1].id, tenantId: tenant.id },
        { period: "2026-08", baseSalary: 15000000, allowances: 1500000, deductions: 500000, bonus: 0, netSalary: 16000000, status: "PENDING", employeeId: employees[0].id, tenantId: tenant.id },
        { period: "2026-08", baseSalary: 18000000, allowances: 2000000, deductions: 600000, bonus: 0, netSalary: 19400000, status: "PENDING", employeeId: employees[1].id, tenantId: tenant.id },
      ],
    });
  }
  console.log("✅ Payroll Records: handled");

  // ============================================
  // ADDITIONAL PAYROLL RECORDS (periode lebih banyak)
  // ============================================
  const additionalPayrollData = [
    { period: "2026-06", baseSalary: 12000000, allowances: 2000000, deductions: 500000, bonus: 0, netSalary: 13500000, status: "PAID", paidAt: new Date("2026-06-30"), employeeId: employees[0].id, tenantId: tenant.id },
    { period: "2026-06", baseSalary: 8000000, allowances: 1500000, deductions: 400000, bonus: 0, netSalary: 9100000, status: "PAID", paidAt: new Date("2026-06-30"), employeeId: employees[1].id, tenantId: tenant.id },
  ];

  for (const apd of additionalPayrollData) {
    const existingPR = await prisma.payrollRecord.findFirst({
      where: { employeeId: apd.employeeId, period: apd.period, tenantId: tenant.id },
    });
    if (!existingPR) {
      await prisma.payrollRecord.create({ data: apd });
    }
  }
  console.log("✅ Additional Payroll Records: handled");

  // ============================================
  // SUBSCRIPTION PLANS (upsert berdasarkan slug)
  // ============================================
  const plans = await Promise.all([
    prisma.subscriptionPlan.upsert({
      where: { slug: 'starter' },
      update: {},
      create: {
        name: 'Starter',
        slug: 'starter',
        description: 'Cocok untuk usaha kecil yang baru memulai',
        price: 299000,
        billingPeriod: 'monthly',
        maxUsers: 3,
        maxProducts: 50,
        maxStorage: '1GB',
        features: JSON.stringify(['Invoice & Quotation', 'Basic CRM', 'Inventory (50 produk)', '3 user', 'Email support']),
        isActive: true,
        sortOrder: 1,
      },
    }),
    prisma.subscriptionPlan.upsert({
      where: { slug: 'growth' },
      update: {},
      create: {
        name: 'Growth',
        slug: 'growth',
        description: 'Untuk bisnis yang berkembang',
        price: 799000,
        billingPeriod: 'monthly',
        maxUsers: 10,
        maxProducts: 500,
        maxStorage: '5GB',
        features: JSON.stringify(['Semua fitur Starter', 'HR & Payroll', 'Advanced CRM & Pipeline', '500 produk', '10 user', 'Priority support', 'AI Features']),
        isActive: true,
        sortOrder: 2,
      },
    }),
    prisma.subscriptionPlan.upsert({
      where: { slug: 'business' },
      update: {},
      create: {
        name: 'Business',
        slug: 'business',
        description: 'Untuk bisnis berskala besar',
        price: 1999000,
        billingPeriod: 'monthly',
        maxUsers: 50,
        maxProducts: -1,
        maxStorage: '50GB',
        features: JSON.stringify(['Semua fitur Growth', 'Multi-branch', 'Unlimited produk', '50 user', 'Dedicated support', 'API access', 'Custom reports', 'Bank reconciliation']),
        isActive: true,
        sortOrder: 3,
      },
    }),
  ]);
  console.log("✅ Subscription Plans:", plans.length);

  // ============================================
  // TENANT SUBSCRIPTION (update tenant + create default subscription)
  // ============================================
  await prisma.tenant.update({
    where: { id: tenant.id },
    data: {
      subscriptionStatus: 'ACTIVE',
      currentPlanSlug: 'growth',
      trialEndsAt: null,
    },
  });

  const growthPlan = plans.find((p: any) => p.slug === 'growth');
  let sub: any = null;
  if (growthPlan) {
    sub = await prisma.tenantSubscription.upsert({
      where: { id: 'default-subscription' },
      update: {},
      create: {
        id: 'default-subscription',
        tenantId: tenant.id,
        planId: growthPlan.id,
        status: 'ACTIVE',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
        nextBillingDate: new Date('2026-09-01'),
        paymentMethod: 'manual_transfer',
      },
    });
  }
  console.log("✅ Tenant Subscription: handled");

  // ============================================
  // BILLING PAYMENTS (4 records)
  // ============================================
  if (sub) {
    const billingPaymentData = [
      { subscriptionId: sub.id, tenantId: tenant.id, amount: 799000, paymentMethod: "manual_transfer", bankName: "BRI", accountNumber: "1234567890", accountName: "Ahmad Suharto", status: "VERIFIED", verifiedById: superadmin.id, verifiedAt: new Date("2026-08-15"), waConfirmed: true },
      { subscriptionId: sub.id, tenantId: tenant.id, amount: 799000, paymentMethod: "manual_transfer", bankName: "BCA", accountNumber: "9876543210", accountName: "Siti Rahayu", status: "PENDING", waConfirmed: true },
      { subscriptionId: sub.id, tenantId: tenant.id, amount: 299000, paymentMethod: "manual_transfer", bankName: "Mandiri", accountNumber: "5555666677", accountName: "Budi Santoso", status: "REJECTED", rejectReason: "Bukti transfer tidak sesuai", verifiedById: superadmin.id, verifiedAt: new Date("2026-08-20") },
      { subscriptionId: sub.id, tenantId: tenant.id, amount: 1999000, paymentMethod: "manual_transfer", bankName: "BSI", accountNumber: "1112223334", accountName: "Dewi Lestari", status: "PENDING", waConfirmed: false },
    ];

    for (const bpd of billingPaymentData) {
      const existingBP = await prisma.billingPayment.findFirst({
        where: { tenantId: tenant.id, amount: bpd.amount, accountNumber: bpd.accountNumber ?? undefined },
      });
      if (!existingBP) {
        await prisma.billingPayment.create({ data: bpd });
      }
    }
    console.log("✅ Billing Payments: 4 records");
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

  console.log("\n🎉 Seeding completed!");
  console.log("\n📋 Demo Accounts:");
  console.log("  SuperAdmin: info@qalcuity.com / Wahyu123456789@");
  console.log("  Admin:      admin@qalcuity.com / admin123");
  console.log("  Member:     member@qalcuity.com / member123");
  console.log("  Viewer:     viewer@qalcuity.com / viewer123");
  console.log("  User:       user@qalcuity.com / user123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
