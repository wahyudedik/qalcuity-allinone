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
  const adminPasswordHash = await bcrypt.hash("Wahyu123456789@", 10);
  const admin = await prisma.user.upsert({
    where: { email: "info@qalcuity.com" },
    update: {
      name: "Admin Qalcuity",
      passwordHash: adminPasswordHash,
      role: "ADMIN",
    },
    create: {
      email: "info@qalcuity.com",
      name: "Admin Qalcuity",
      passwordHash: adminPasswordHash,
      role: "ADMIN",
      tenantId: tenant.id,
    },
  });
  console.log("✅ Admin:", admin.email);

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
  // SUPPLIERS
  // ============================================
  const supplierData = [
    { name: "PT Sejahtera Supplier", contactPerson: "Budi Hartono", email: "budi@sejahtera-supplier.co.id", phone: "021-7890123", address: "Jl. Raya Bogor Km 30", city: "Jakarta", rating: 4.5 },
    { name: "CV Berkah Components", contactPerson: "Siti Rahayu", email: "siti@berkahcomp.co.id", phone: "021-8901234", address: "Jl. Raya Bekasi Km 15", city: "Bekasi", rating: 4.0 },
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
      ],
    });
  }
  console.log("✅ Payments: handled");

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
  // ATTENDANCE RECORDS (skip jika sudah ada untuk hari ini)
  // ============================================
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const existingAttendance = await prisma.attendanceRecord.count({
    where: { tenantId: tenant.id, date: { gte: today } },
  });

  if (existingAttendance === 0) {
    const todayNow = new Date();
    await prisma.attendanceRecord.createMany({
      data: [
        { date: todayNow, clockIn: new Date(todayNow.getFullYear(), todayNow.getMonth(), todayNow.getDate(), 8, 0), status: "PRESENT", workHours: 0, employeeId: employees[0].id, tenantId: tenant.id },
        { date: todayNow, clockIn: new Date(todayNow.getFullYear(), todayNow.getMonth(), todayNow.getDate(), 7, 55), status: "PRESENT", workHours: 0, employeeId: employees[1].id, tenantId: tenant.id },
        { date: todayNow, clockIn: new Date(todayNow.getFullYear(), todayNow.getMonth(), todayNow.getDate(), 8, 30), status: "LATE", workHours: 0, employeeId: employees[2].id, tenantId: tenant.id },
        { date: todayNow, status: "WFH", workHours: 0, notes: "WFH hari ini", employeeId: employees[3].id, tenantId: tenant.id },
        { date: todayNow, status: "LEAVE", workHours: 0, employeeId: employees[4].id, tenantId: tenant.id },
      ],
    });
  }
  console.log("✅ Attendance Records: handled");

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
  // AUDIT LOGS (skip jika sudah ada)
  // ============================================
  const existingAuditLogs = await prisma.auditLog.count({
    where: { tenantId: tenant.id },
  });

  if (existingAuditLogs === 0 && invoices.length > 0 && deals.length > 0 && products.length > 0) {
    await prisma.auditLog.createMany({
      data: [
        { action: "CREATE", entity: "Invoice", entityId: invoices[0].id, newValues: JSON.stringify({ invoiceNumber: "INV-2026-001", total: 8325000 }), ipAddress: "103.28.12.xxx", userId: admin.id, tenantId: tenant.id },
        { action: "UPDATE", entity: "Deal", entityId: deals[0].id, oldValues: JSON.stringify({ stage: "PROPOSAL" }), newValues: JSON.stringify({ stage: "NEGOTIATION" }), ipAddress: "36.95.xxx.xxx", userId: admin.id, tenantId: tenant.id },
        { action: "CREATE", entity: "Product", entityId: products[0].id, newValues: JSON.stringify({ sku: "WDG-001", name: "Widget A" }), ipAddress: "114.124.xxx.xxx", userId: user.id, tenantId: tenant.id },
        { action: "PAYMENT", entity: "Payment", entityId: "seed-payment-1", newValues: JSON.stringify({ amount: 4162500, method: "BANK_TRANSFER" }), ipAddress: "36.95.xxx.xxx", userId: admin.id, tenantId: tenant.id },
      ],
    });
  }
  console.log("✅ Audit Logs: handled");

  console.log("\n🎉 Seeding completed!");
  console.log("\n📋 Demo Accounts:");
  console.log("  Admin: info@qalcuity.com / Wahyu123456789@");
  console.log("  User:  user@qalcuity.com / user123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
