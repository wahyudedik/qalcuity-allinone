import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ============================================
  // TENANT
  // ============================================
  const tenant = await prisma.tenant.create({
    data: {
      name: "PT Qalcuity Demo",
      slug: "qalcuity-demo",
      email: "demo@qalcuity.com",
      phone: "021-1234567",
      address: "Jl. Sudirman No. 123, Jakarta Selatan",
    },
  });
  console.log("✅ Tenant:", tenant.name);

  // ============================================
  // USERS
  // ============================================
  const adminPasswordHash = await bcrypt.hash("Wahyu123456789@", 10);
  const admin = await prisma.user.create({
    data: {
      email: "info@qalcuity.com",
      name: "Admin Qalcuity",
      passwordHash: adminPasswordHash,
      role: "ADMIN",
      tenantId: tenant.id,
    },
  });
  console.log("✅ Admin:", admin.email);

  const userPasswordHash = await bcrypt.hash("user123", 10);
  const user = await prisma.user.create({
    data: {
      email: "user@qalcuity.com",
      name: "User Demo",
      passwordHash: userPasswordHash,
      role: "USER",
      tenantId: tenant.id,
    },
  });
  console.log("✅ User:", user.email);

  // ============================================
  // CATEGORIES
  // ============================================
  const categories = await Promise.all([
    prisma.category.create({
      data: { name: "Electronics", description: " Produk elektronik", tenantId: tenant.id },
    }),
    prisma.category.create({
      data: { name: "Mechanical", description: "Komponen mekanik", tenantId: tenant.id },
    }),
    prisma.category.create({
      data: { name: "Services", description: "Layanan jasa", tenantId: tenant.id },
    }),
    prisma.category.create({
      data: { name: "Office Supplies", description: "Perlengkapan kantor", tenantId: tenant.id },
    }),
  ]);
  console.log("✅ Categories:", categories.length);

  // ============================================
  // CONTACTS
  // ============================================
  const contacts = await Promise.all([
    prisma.contact.create({
      data: {
        name: "PT Maju Jaya",
        type: "CUSTOMER",
        email: "info@majujaya.co.id",
        phone: "021-2345678",
        address: "Jl. Gatot Subroto No. 45",
        city: "Jakarta",
        taxId: "01.234.567.8-901.000",
        tenantId: tenant.id,
      },
    }),
    prisma.contact.create({
      data: {
        name: "CV Berkah Mandiri",
        type: "CUSTOMER",
        email: "info@berkahmandiri.co.id",
        phone: "021-3456789",
        address: "Jl. HR Rasuna Said No. 78",
        city: "Jakarta",
        tenantId: tenant.id,
      },
    }),
    prisma.contact.create({
      data: {
        name: "PT Sejahtera Abadi",
        type: "CUSTOMER",
        email: "sales@sejahtera.co.id",
        phone: "021-4567890",
        address: "Jl. TB Simatupang No. 90",
        city: "Jakarta",
        tenantId: tenant.id,
      },
    }),
    prisma.contact.create({
      data: {
        name: "PT Nusantara Jaya",
        type: "CUSTOMER",
        email: "info@nusantara.co.id",
        phone: "021-5678901",
        address: "Jl. Thamrin No. 12",
        city: "Jakarta",
        tenantId: tenant.id,
      },
    }),
    prisma.contact.create({
      data: {
        name: "CV Sukses Mandiri",
        type: "CUSTOMER",
        email: "info@suksesmandiri.co.id",
        phone: "021-6789012",
        address: "Jl. Kuningan No. 55",
        city: "Jakarta",
        tenantId: tenant.id,
      },
    }),
  ]);
  console.log("✅ Contacts:", contacts.length);

  // ============================================
  // SUPPLIERS
  // ============================================
  const suppliers = await Promise.all([
    prisma.supplier.create({
      data: {
        name: "PT Sejahtera Supplier",
        contactPerson: "Budi Hartono",
        email: "budi@sejahtera-supplier.co.id",
        phone: "021-7890123",
        address: "Jl. Raya Bogor Km 30",
        city: "Jakarta",
        rating: 4.5,
        tenantId: tenant.id,
      },
    }),
    prisma.supplier.create({
      data: {
        name: "CV Berkah Components",
        contactPerson: "Siti Rahayu",
        email: "siti@berkahcomp.co.id",
        phone: "021-8901234",
        address: "Jl. Raya Bekasi Km 15",
        city: "Bekasi",
        rating: 4.0,
        tenantId: tenant.id,
      },
    }),
  ]);
  console.log("✅ Suppliers:", suppliers.length);

  // ============================================
  // PRODUCTS
  // ============================================
  const products = await Promise.all([
    prisma.product.create({
      data: {
        sku: "WDG-001",
        name: "Widget A",
        description: "Widget standar untuk kebutuhan umum",
        unit: "pcs",
        price: 150000,
        cost: 100000,
        stock: 150,
        minStock: 20,
        categoryId: categories[0].id,
        tenantId: tenant.id,
      },
    }),
    prisma.product.create({
      data: {
        sku: "PRT-001",
        name: "Part B",
        description: "Komponen mesin tipe B",
        unit: "pcs",
        price: 250000,
        cost: 180000,
        stock: 75,
        minStock: 10,
        categoryId: categories[1].id,
        tenantId: tenant.id,
      },
    }),
    prisma.product.create({
      data: {
        sku: "SVC-001",
        name: "Service C",
        description: "Layanan konsultasi teknis",
        unit: "hour",
        price: 500000,
        cost: 300000,
        stock: 999,
        minStock: 0,
        categoryId: categories[2].id,
        tenantId: tenant.id,
      },
    }),
    prisma.product.create({
      data: {
        sku: "OFF-001",
        name: "Printer Paper A4",
        description: "Kertas printer ukuran A4",
        unit: "rim",
        price: 45000,
        cost: 35000,
        stock: 200,
        minStock: 50,
        categoryId: categories[3].id,
        tenantId: tenant.id,
      },
    }),
    prisma.product.create({
      data: {
        sku: "WDG-002",
        name: "Widget Pro",
        description: "Widget versi pro dengan fitur lengkap",
        unit: "pcs",
        price: 250000,
        cost: 180000,
        stock: 8,
        minStock: 15,
        categoryId: categories[0].id,
        tenantId: tenant.id,
      },
    }),
  ]);
  console.log("✅ Products:", products.length);

  // ============================================
  // STOCK MOVEMENTS
  // ============================================
  const stockMovements = await Promise.all([
    prisma.stockMovement.create({
      data: { type: "IN", quantity: 100, reference: "PO-2026-001", notes: "Restock Widget A", productId: products[0].id, tenantId: tenant.id },
    }),
    prisma.stockMovement.create({
      data: { type: "OUT", quantity: 50, reference: "INV-2026-001", notes: "Penjualan ke PT Maju Jaya", productId: products[0].id, tenantId: tenant.id },
    }),
    prisma.stockMovement.create({
      data: { type: "IN", quantity: 200, reference: "PO-2026-002", notes: "Restock Part B", productId: products[1].id, tenantId: tenant.id },
    }),
    prisma.stockMovement.create({
      data: { type: "OUT", quantity: 30, reference: "INV-2026-003", notes: "Penjualan ke CV Berkah", productId: products[1].id, tenantId: tenant.id },
    }),
    prisma.stockMovement.create({
      data: { type: "ADJUSTMENT", quantity: -5, reference: "ADJ-001", notes: "Koreksi stok Widget Pro", productId: products[4].id, tenantId: tenant.id },
    }),
  ]);
  console.log("✅ Stock Movements:", stockMovements.length);

  // ============================================
  // INVOICES
  // ============================================
  const invoices = await Promise.all([
    prisma.invoice.create({
      data: {
        invoiceNumber: "INV-2026-001",
        status: "SENT",
        dueDate: new Date("2026-08-30"),
        notes: "Pembayaran via transfer bank",
        subtotal: 7500000,
        taxRate: 11,
        taxAmount: 825000,
        total: 8325000,
        tenantId: tenant.id,
        contactId: contacts[0].id,
        items: {
          create: [
            { description: "Widget A x50", quantity: 50, unitPrice: 150000, total: 7500000 },
          ],
        },
      },
    }),
    prisma.invoice.create({
      data: {
        invoiceNumber: "INV-2026-002",
        status: "PAID",
        dueDate: new Date("2026-07-31"),
        notes: "Sudah dibayar lunas",
        subtotal: 3750000,
        taxRate: 11,
        taxAmount: 412500,
        total: 4162500,
        tenantId: tenant.id,
        contactId: contacts[1].id,
        items: {
          create: [
            { description: "Part B x15", quantity: 15, unitPrice: 250000, total: 3750000 },
          ],
        },
      },
    }),
    prisma.invoice.create({
      data: {
        invoiceNumber: "INV-2026-003",
        status: "OVERDUE",
        dueDate: new Date("2026-07-30"),
        notes: "Pembayaran terlambat",
        subtotal: 23000000,
        taxRate: 11,
        taxAmount: 2530000,
        total: 25530000,
        tenantId: tenant.id,
        contactId: contacts[2].id,
        items: {
          create: [
            { description: "Widget Pro x92", quantity: 92, unitPrice: 250000, total: 23000000 },
          ],
        },
      },
    }),
    prisma.invoice.create({
      data: {
        invoiceNumber: "INV-2026-004",
        status: "DRAFT",
        dueDate: new Date("2026-09-15"),
        notes: "Draft invoice",
        subtotal: 7500000,
        taxRate: 11,
        taxAmount: 825000,
        total: 8325000,
        tenantId: tenant.id,
        contactId: contacts[3].id,
        items: {
          create: [
            { description: "Service C x15 jam", quantity: 15, unitPrice: 500000, total: 7500000 },
          ],
        },
      },
    }),
  ]);
  console.log("✅ Invoices:", invoices.length);

  // ============================================
  // PAYMENTS
  // ============================================
  const payments = await Promise.all([
    prisma.payment.create({
      data: {
        paymentNumber: "PAY-2026-001",
        amount: 4162500,
        paymentDate: new Date("2026-07-28"),
        method: "BANK_TRANSFER",
        status: "COMPLETED",
        type: "INCOME",
        notes: "Pembayaran lunas INV-2026-002",
        invoiceId: invoices[1].id,
        tenantId: tenant.id,
      },
    }),
    prisma.payment.create({
      data: {
        paymentNumber: "PAY-2026-002",
        amount: 25000000,
        paymentDate: new Date("2026-08-01"),
        method: "BANK_TRANSFER",
        status: "COMPLETED",
        type: "EXPENSE",
        notes: "Pembayaran ke PT Sejahtera Supplier",
        tenantId: tenant.id,
      },
    }),
  ]);
  console.log("✅ Payments:", payments.length);

  // ============================================
  // QUOTATIONS
  // ============================================
  const quotations = await Promise.all([
    prisma.quotation.create({
      data: {
        quotationNumber: "QUO-2026-001",
        status: "SENT",
        validUntil: new Date("2026-09-15"),
        notes: "Penawaran untuk paket enterprise",
        terms: "Pembayaran Net 30 hari",
        subtotal: 15000000,
        taxRate: 11,
        taxAmount: 1650000,
        total: 16650000,
        tenantId: tenant.id,
        contactId: contacts[0].id,
        items: {
          create: [
            { description: "Widget A x100", quantity: 100, unitPrice: 150000, total: 15000000 },
          ],
        },
      },
    }),
    prisma.quotation.create({
      data: {
        quotationNumber: "QUO-2026-002",
        status: "DRAFT",
        validUntil: new Date("2026-09-30"),
        notes: "Penawaran untuk komponen",
        terms: "Pembayaran Net 15 hari",
        subtotal: 5000000,
        taxRate: 11,
        taxAmount: 550000,
        total: 5550000,
        tenantId: tenant.id,
        contactId: contacts[2].id,
        items: {
          create: [
            { description: "Part B x20", quantity: 20, unitPrice: 250000, total: 5000000 },
          ],
        },
      },
    }),
  ]);
  console.log("✅ Quotations:", quotations.length);

  // ============================================
  // PURCHASE ORDERS
  // ============================================
  const purchaseOrders = await Promise.all([
    prisma.purchaseOrder.create({
      data: {
        poNumber: "PO-2026-001",
        status: "RECEIVED",
        orderDate: new Date("2026-07-15"),
        deliveryDate: new Date("2026-07-20"),
        notes: "Restock Widget A",
        subtotal: 10000000,
        taxRate: 11,
        taxAmount: 1100000,
        total: 11100000,
        tenantId: tenant.id,
        supplierId: suppliers[0].id,
        items: {
          create: [
            { description: "Widget A x100", quantity: 100, unitPrice: 100000, total: 10000000 },
          ],
        },
      },
    }),
    prisma.purchaseOrder.create({
      data: {
        poNumber: "PO-2026-002",
        status: "SENT",
        orderDate: new Date("2026-08-01"),
        deliveryDate: new Date("2026-08-10"),
        notes: "Restock Part B",
        subtotal: 36000000,
        taxRate: 11,
        taxAmount: 3960000,
        total: 39960000,
        tenantId: tenant.id,
        supplierId: suppliers[1].id,
        items: {
          create: [
            { description: "Part B x200", quantity: 200, unitPrice: 180000, total: 36000000 },
          ],
        },
      },
    }),
  ]);
  console.log("✅ Purchase Orders:", purchaseOrders.length);

  // ============================================
  // LEADS
  // ============================================
  const leads = await Promise.all([
    prisma.lead.create({
      data: {
        name: "PT Nusantara Jaya",
        company: "PT Nusantara Jaya",
        email: "info@nusantara.co.id",
        phone: "021-5678901",
        source: "WEBSITE",
        status: "NEW",
        value: 25000000,
        notes: "Tertarik dengan paket enterprise",
        tenantId: tenant.id,
      },
    }),
    prisma.lead.create({
      data: {
        name: "CV Sukses Mandiri",
        company: "CV Sukses Mandiri",
        email: "info@suksesmandiri.co.id",
        phone: "021-6789012",
        source: "REFERRAL",
        status: "CONTACTED",
        value: 15000000,
        notes: "Direkomendasikan oleh PT Maju Jaya",
        tenantId: tenant.id,
      },
    }),
    prisma.lead.create({
      data: {
        name: "PT ABC Technology",
        company: "PT ABC Technology",
        email: "info@abctech.co.id",
        phone: "021-7890123",
        source: "SOCIAL_MEDIA",
        status: "QUALIFIED",
        value: 50000000,
        notes: "Lead dari LinkedIn, sangat potensial",
        tenantId: tenant.id,
      },
    }),
    prisma.lead.create({
      data: {
        name: "CV Berkah Jaya",
        company: "CV Berkah Jaya",
        email: "info@berkahjaya.co.id",
        phone: "021-8901234",
        source: "COLD_CALL",
        status: "PROPOSAL",
        value: 45000000,
        notes: "Proposal sudah dikirim",
        tenantId: tenant.id,
      },
    }),
  ]);
  console.log("✅ Leads:", leads.length);

  // ============================================
  // DEALS
  // ============================================
  const deals = await Promise.all([
    prisma.deal.create({
      data: {
        title: "PT ABC Corp - Paket Enterprise",
        value: 150000000,
        stage: "NEGOTIATION",
        probability: 75,
        closeDate: new Date("2026-08-30"),
        notes: "Sedang dalam negosiasi harga",
        tenantId: tenant.id,
        contactId: contacts[0].id,
      },
    }),
    prisma.deal.create({
      data: {
        title: "CV Maju Bersama - Annual Contract",
        value: 85000000,
        stage: "PROPOSAL",
        probability: 55,
        closeDate: new Date("2026-09-15"),
        notes: "Proposal annual contract",
        tenantId: tenant.id,
        contactId: contacts[1].id,
      },
    }),
    prisma.deal.create({
      data: {
        title: "PT Sejahtera - Bulk Order",
        value: 200000000,
        stage: "DISCOVERY",
        probability: 30,
        closeDate: new Date("2026-10-01"),
        notes: "Discovery phase, baru mulai",
        tenantId: tenant.id,
        contactId: contacts[2].id,
      },
    }),
    prisma.deal.create({
      data: {
        title: "CV Berkah Jaya - Maintenance Contract",
        value: 45000000,
        stage: "CLOSING",
        probability: 90,
        closeDate: new Date("2026-08-15"),
        notes: "Tinggal tanda tangan kontrak",
        tenantId: tenant.id,
        contactId: contacts[1].id,
      },
    }),
  ]);
  console.log("✅ Deals:", deals.length);

  // ============================================
  // EMPLOYEES
  // ============================================
  const employees = await Promise.all([
    prisma.employee.create({
      data: {
        employeeId: "EMP-001",
        name: "Budi Santoso",
        email: "budi@qalcuity.com",
        phone: "0812-3456-7890",
        position: "Software Engineer",
        department: "Engineering",
        joinDate: new Date("2024-01-15"),
        salary: 15000000,
        tenantId: tenant.id,
      },
    }),
    prisma.employee.create({
      data: {
        employeeId: "EMP-002",
        name: "Sari Dewi",
        email: "sari@qalcuity.com",
        phone: "0812-4567-8901",
        position: "Marketing Manager",
        department: "Marketing",
        joinDate: new Date("2023-06-01"),
        salary: 18000000,
        tenantId: tenant.id,
      },
    }),
    prisma.employee.create({
      data: {
        employeeId: "EMP-003",
        name: "Andi Pratama",
        email: "andi@qalcuity.com",
        phone: "0812-5678-9012",
        position: "Accountant",
        department: "Finance",
        joinDate: new Date("2025-03-10"),
        salary: 12000000,
        tenantId: tenant.id,
      },
    }),
    prisma.employee.create({
      data: {
        employeeId: "EMP-004",
        name: "Dewi Lestari",
        email: "dewi@qalcuity.com",
        phone: "0812-6789-0123",
        position: "HR Specialist",
        department: "HR",
        joinDate: new Date("2024-09-01"),
        salary: 12000000,
        tenantId: tenant.id,
      },
    }),
    prisma.employee.create({
      data: {
        employeeId: "EMP-005",
        name: "Eko Prasetyo",
        email: "eko@qalcuity.com",
        phone: "0812-7890-1234",
        position: "Sales Executive",
        department: "Sales",
        joinDate: new Date("2025-03-01"),
        salary: 14000000,
        tenantId: tenant.id,
      },
    }),
  ]);
  console.log("✅ Employees:", employees.length);

  // ============================================
  // ATTENDANCE RECORDS
  // ============================================
  const today = new Date();
  const attendanceRecords = await Promise.all([
    prisma.attendanceRecord.create({
      data: {
        date: today,
        clockIn: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 8, 0),
        clockOut: null,
        status: "PRESENT",
        workHours: 0,
        employeeId: employees[0].id,
        tenantId: tenant.id,
      },
    }),
    prisma.attendanceRecord.create({
      data: {
        date: today,
        clockIn: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 7, 55),
        clockOut: null,
        status: "PRESENT",
        workHours: 0,
        employeeId: employees[1].id,
        tenantId: tenant.id,
      },
    }),
    prisma.attendanceRecord.create({
      data: {
        date: today,
        clockIn: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 8, 30),
        clockOut: null,
        status: "LATE",
        workHours: 0,
        employeeId: employees[2].id,
        tenantId: tenant.id,
      },
    }),
    prisma.attendanceRecord.create({
      data: {
        date: today,
        clockIn: null,
        clockOut: null,
        status: "WFH",
        workHours: 0,
        notes: "WFH hari ini",
        employeeId: employees[3].id,
        tenantId: tenant.id,
      },
    }),
    prisma.attendanceRecord.create({
      data: {
        date: today,
        clockIn: null,
        clockOut: null,
        status: "LEAVE",
        workHours: 0,
        employeeId: employees[4].id,
        tenantId: tenant.id,
      },
    }),
  ]);
  console.log("✅ Attendance Records:", attendanceRecords.length);

  // ============================================
  // LEAVE REQUESTS
  // ============================================
  const leaveRequests = await Promise.all([
    prisma.leaveRequest.create({
      data: {
        type: "ANNUAL",
        startDate: new Date("2026-08-04"),
        endDate: new Date("2026-08-05"),
        days: 2,
        reason: "Istirahat",
        status: "APPROVED",
        appliedDate: new Date("2026-08-01"),
        approvedBy: "Admin Qalcuity",
        employeeId: employees[0].id,
        tenantId: tenant.id,
      },
    }),
    prisma.leaveRequest.create({
      data: {
        type: "SICK",
        startDate: new Date("2026-08-03"),
        endDate: new Date("2026-08-03"),
        days: 1,
        reason: "Sakit demam",
        status: "APPROVED",
        appliedDate: new Date("2026-08-03"),
        approvedBy: "Admin Qalcuity",
        employeeId: employees[1].id,
        tenantId: tenant.id,
      },
    }),
    prisma.leaveRequest.create({
      data: {
        type: "ANNUAL",
        startDate: new Date("2026-08-06"),
        endDate: new Date("2026-08-08"),
        days: 3,
        reason: "Keluarga",
        status: "PENDING",
        appliedDate: new Date("2026-08-02"),
        employeeId: employees[2].id,
        tenantId: tenant.id,
      },
    }),
  ]);
  console.log("✅ Leave Requests:", leaveRequests.length);

  // ============================================
  // PAYROLL RECORDS
  // ============================================
  const payrollRecords = await Promise.all([
    prisma.payrollRecord.create({
      data: {
        period: "2026-07",
        baseSalary: 15000000,
        allowances: 1500000,
        deductions: 500000,
        bonus: 0,
        netSalary: 16000000,
        status: "PAID",
        paidAt: new Date("2026-07-28"),
        employeeId: employees[0].id,
        tenantId: tenant.id,
      },
    }),
    prisma.payrollRecord.create({
      data: {
        period: "2026-07",
        baseSalary: 18000000,
        allowances: 2000000,
        deductions: 600000,
        bonus: 1000000,
        netSalary: 20400000,
        status: "PAID",
        paidAt: new Date("2026-07-28"),
        employeeId: employees[1].id,
        tenantId: tenant.id,
      },
    }),
    prisma.payrollRecord.create({
      data: {
        period: "2026-08",
        baseSalary: 15000000,
        allowances: 1500000,
        deductions: 500000,
        bonus: 0,
        netSalary: 16000000,
        status: "PENDING",
        employeeId: employees[0].id,
        tenantId: tenant.id,
      },
    }),
    prisma.payrollRecord.create({
      data: {
        period: "2026-08",
        baseSalary: 18000000,
        allowances: 2000000,
        deductions: 600000,
        bonus: 0,
        netSalary: 19400000,
        status: "PENDING",
        employeeId: employees[1].id,
        tenantId: tenant.id,
      },
    }),
  ]);
  console.log("✅ Payroll Records:", payrollRecords.length);

  // ============================================
  // AUDIT LOGS
  // ============================================
  const auditLogs = await Promise.all([
    prisma.auditLog.create({
      data: {
        action: "CREATE",
        entity: "Invoice",
        entityId: invoices[0].id,
        newValues: JSON.stringify({ invoiceNumber: "INV-2026-001", total: 8325000 }),
        ipAddress: "103.28.12.xxx",
        userId: admin.id,
        tenantId: tenant.id,
      },
    }),
    prisma.auditLog.create({
      data: {
        action: "UPDATE",
        entity: "Deal",
        entityId: deals[0].id,
        oldValues: JSON.stringify({ stage: "PROPOSAL" }),
        newValues: JSON.stringify({ stage: "NEGOTIATION" }),
        ipAddress: "36.95.xxx.xxx",
        userId: admin.id,
        tenantId: tenant.id,
      },
    }),
    prisma.auditLog.create({
      data: {
        action: "CREATE",
        entity: "Product",
        entityId: products[0].id,
        newValues: JSON.stringify({ sku: "WDG-001", name: "Widget A" }),
        ipAddress: "114.124.xxx.xxx",
        userId: user.id,
        tenantId: tenant.id,
      },
    }),
    prisma.auditLog.create({
      data: {
        action: "PAYMENT",
        entity: "Payment",
        entityId: payments[0].id,
        newValues: JSON.stringify({ amount: 4162500, method: "BANK_TRANSFER" }),
        ipAddress: "36.95.xxx.xxx",
        userId: admin.id,
        tenantId: tenant.id,
      },
    }),
  ]);
  console.log("✅ Audit Logs:", auditLogs.length);

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
