import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create tenant
  const tenant = await prisma.tenant.create({
    data: {
      name: "PT Qalcuity Demo",
      slug: "qalcuity-demo",
      email: "demo@qalcuity.com",
      phone: "021-1234567",
      address: "Jl. Sudirman No. 123, Jakarta Selatan",
    },
  });

  console.log("✅ Tenant created:", tenant.name);

  // Create admin user
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

  console.log("✅ Admin user created:", admin.email);

  // Create regular user
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

  console.log("✅ Regular user created:", user.email);

  // Create contacts
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
        type: "SUPPLIER",
        email: "sales@sejahtera.co.id",
        phone: "021-4567890",
        address: "Jl. TB Simatupang No. 90",
        city: "Jakarta",
        tenantId: tenant.id,
      },
    }),
  ]);

  console.log("✅ Contacts created:", contacts.length);

  // Create products
  const products = await Promise.all([
    prisma.product.create({
      data: {
        sku: "WDG-001",
        name: "Widget A",
        description: "Widget standar untuk kebutuhan umum",
        category: "Electronics",
        unit: "pcs",
        price: 150000,
        cost: 100000,
        stock: 150,
        minStock: 20,
        tenantId: tenant.id,
      },
    }),
    prisma.product.create({
      data: {
        sku: "PRT-001",
        name: "Part B",
        description: "Komponen mesin tipe B",
        category: "Mechanical",
        unit: "pcs",
        price: 250000,
        cost: 180000,
        stock: 75,
        minStock: 10,
        tenantId: tenant.id,
      },
    }),
    prisma.product.create({
      data: {
        sku: "SVC-001",
        name: "Service C",
        description: "Layanan konsultasi teknis",
        category: "Services",
        unit: "hour",
        price: 500000,
        cost: 300000,
        stock: 999,
        minStock: 0,
        tenantId: tenant.id,
      },
    }),
  ]);

  console.log("✅ Products created:", products.length);

  // Create invoices
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
            {
              description: "Widget A x50",
              quantity: 50,
              unitPrice: 150000,
              total: 7500000,
            },
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
            {
              description: "Part B x15",
              quantity: 15,
              unitPrice: 250000,
              total: 3750000,
            },
          ],
        },
      },
    }),
  ]);

  console.log("✅ Invoices created:", invoices.length);

  // Create leads
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
  ]);

  console.log("✅ Leads created:", leads.length);

  // Create employees
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
  ]);

  console.log("✅ Employees created:", employees.length);

  console.log("\n🎉 Seeding completed!");
  console.log("\n📋 Demo Accounts:");
  console.log("  Admin: admin@qalcuity.com / admin123");
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
