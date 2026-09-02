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

  // ============================================
  // CATEGORIES (upsert berdasarkan name+tenantId via findFirst)
  // ============================================
  const categoryData = [
    { name: "Electronics", description: "Produk elektronik" },
    { name: "Mechanical", description: "Komponen mekanik" },
    { name: "Services", description: "Layanan jasa" },
    { name: "Office Supplies", description: "Perlengkapan kantor" },
    { name: "Furniture", description: "Furniture kantor dan rumah" },
    { name: "Automotive Parts", description: "Suku cadang kendaraan" },
    { name: "Food & Beverage", description: "Makanan dan minuman" },
    { name: "Software & Digital", description: "Perangkat lunak dan layanan digital" },
    { name: "Building Materials", description: "Bahan bangunan dan konstruksi" },
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
  // MORE CONTACTS (Indonesian companies — realistic)
  // ============================================
  const moreContactData = [
    { name: "PT Telkom Indonesia", type: "CUSTOMER", company: "PT Telkom Indonesia Tbk", email: "procurement@telkom.co.id", phone: "021-5211111", address: "Jl. Japati No. 1, Bandung", city: "Bandung", taxId: "01.306.432.9-052.000" },
    { name: "PT Astra International", type: "CUSTOMER", company: "PT Astra International Tbk", email: "supply@astra.co.id", phone: "021-5088888", address: "Jl. Gaya Motor I No. 8, Sunter, Jakarta Utara", city: "Jakarta" },
    { name: "PT Pertamina", type: "CUSTOMER", company: "PT Pertamina (Persero) Tbk", email: "procurement@pertamina.com", phone: "021-3815111", address: "Jl. Medan Merdeka Timur No. 1A, Jakarta Pusat", city: "Jakarta", taxId: "01.300.014.2-094.000" },
    { name: "PT PLN Indonesia", type: "CUSTOMER", company: "PT PLN (Persero) Tbk", email: "tender@pln.co.id", phone: "021-7261122", address: "Jl. Lapangan Banteng Timur 3-4, Jakarta Pusat", city: "Jakarta" },
    { name: "PT Bank Central Asia", type: "CUSTOMER", company: "PT Bank Central Asia Tbk", email: "vendor@bca.co.id", phone: "021-23588300", address: "Jl. Jend. Sudirman Kav. 78, Jakarta Selatan", city: "Jakarta" },
    { name: "PT Unilever Indonesia", type: "CUSTOMER", company: "PT Unilever Indonesia Tbk", email: "purchase@unilever.co.id", phone: "021-80865111", address: "Gedung Grha Unilever BSD Green Office Park, Tangerang", city: "Tangerang" },
    { name: "PT Indofood Sukses Makmur", type: "CUSTOMER", company: "PT Indofood Sukses Makmur Tbk", email: "procurement@indofood.com", phone: "021-57958989", address: "Jl. Sudirman Kav. 76-78, Jakarta Selatan", city: "Jakarta" },
    { name: "CV Adil Makmur", type: "CUSTOMER", company: "CV Adil Makmur", email: "order@adilmakmur.co.id", phone: "0274-5552468", address: "Jl. Malioboro No. 35, Yogyakarta", city: "Yogyakarta" },
    { name: "PT Surya Gemilang", type: "CUSTOMER", company: "PT Surya Gemilang Sejahtera", email: "info@suryagemilang.co.id", phone: "031-5553691", address: "Jl. Basuki Rachmat No. 12, Surabaya", city: "Surabaya" },
    { name: "UD Barokah Jaya", type: "CUSTOMER", company: "UD Barokah Jaya", email: "barokah@jaya.co.id", phone: "0341-5557412", address: "Jl. Bromo No. 22, Malang", city: "Malang" },
    { name: "PT Harmoni Komputama", type: "BOTH", company: "PT Harmoni Komputama", email: "sales@harmoni.co.id", phone: "021-5558520", address: "Jl. Mangga Dua No. 8, Jakarta Utara", city: "Jakarta" },
    { name: "CV Mitra Sejati", type: "CUSTOMER", company: "CV Mitra Sejati", email: "info@mitrasejati.co.id", phone: "021-5559630", address: "Jl. Pemuda No. 15, Bekasi", city: "Bekasi" },
    { name: "PT Garuda Teknologi", type: "CUSTOMER", company: "PT Garuda Teknologi Nusantara", email: "procurement@garudatech.co.id", phone: "021-5554710", address: "Jl. Alternatif Cibubur Km 4, Bogor", city: "Bogor" },
    { name: "PT Maju Terus Perkasa", type: "CUSTOMER", company: "PT Maju Terus Perkasa", email: "info@majuterus.co.id", phone: "021-5556380", address: "Jl. Panjang No. 8, Jakarta Barat", city: "Jakarta" },
    { name: "CV Kencana Mulia", type: "CUSTOMER", company: "CV Kencana Mulia Abadi", email: "kencana@mulia.co.id", phone: "021-5557410", address: "Jl. Raya Ciledig No. 33, Cirebon", city: "Cirebon" },
    { name: "PT Bumi Damai Sejahtera", type: "CUSTOMER", company: "PT Bumi Damai Sejahtera", email: "order@bumidamai.co.id", phone: "021-5558520", address: "Jl. Pahlawan Revolusi No. 7, Jakarta Timur", city: "Jakarta" },
  ];

  for (const mcd of moreContactData) {
    const existingContact = await prisma.contact.findFirst({
      where: { name: mcd.name, tenantId: tenant.id },
    });
    if (!existingContact) {
      const created = await prisma.contact.create({
        data: { ...mcd, tenantId: tenant.id },
      });
      contacts.push(created);
    } else {
      contacts.push(existingContact);
    }
  }
  console.log("✅ Total Contacts:", contacts.length);

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
  // MORE SUPPLIERS (realistic Indonesian suppliers)
  // ============================================
  const moreSupplierData = [
    { name: "PT Supply Indonesia", contactPerson: "Hendra Wijaya", email: "hendra@supplyindo.co.id", phone: "021-5559012", address: "Jl. Raya Cakung Km 5, Jakarta Timur", city: "Jakarta", rating: 4.3 },
    { name: "CV Distribusi Jaya", contactPerson: "Rina Susanti", email: "rina@distrijaya.co.id", phone: "021-5551023", address: "Jl. Raya Cikarang Blok A No. 12, Bekasi", city: "Bekasi", rating: 4.1 },
    { name: "PT Logistik Nusantara", contactPerson: "Agus Pratama", email: "agus@logistiknusantara.co.id", phone: "021-5552134", address: "Jl. Raya Gorontalo Km 8, Makassar", city: "Makassar", rating: 4.6 },
    { name: "CV Bahan Bangunan Sejahtera", contactPerson: "Dedi Kurniawan", email: "dedi@bbs.co.id", phone: "021-5553245", address: "Jl. Raya Bogor Km 25, Jakarta Selatan", city: "Jakarta", rating: 3.9 },
    { name: "PT Komponen Elektronik Nusantara", contactPerson: "Fandi Ahmad", email: "fandi@kompel.co.id", phone: "021-5554356", address: "Jl. Mangga Dua Raya No. 18, Jakarta Utara", city: "Jakarta", rating: 4.4 },
    { name: "CV Furniture Jati Jepara", contactPerson: "Siti Nurjanah", email: "siti@jatijepara.co.id", phone: "0291-5555467", address: "Jl. Raya Jepara-Kudus Km 3, Jepara", city: "Jepara", rating: 4.7 },
  ];

  for (const sd of moreSupplierData) {
    const existing = await prisma.supplier.findFirst({
      where: { name: sd.name, tenantId: tenant.id },
    });
    if (!existing) {
      const created = await prisma.supplier.create({
        data: { ...sd, tenantId: tenant.id },
      });
      suppliers.push(created);
    } else {
      suppliers.push(existing);
    }
  }
  console.log("✅ Total Suppliers:", suppliers.length);

  // ============================================
  // PRODUCTS
  // ============================================
  const productData = [
    { sku: "WDG-001", name: "Widget A", description: "Widget standar untuk kebutuhan umum", unit: "pcs", price: 150000, cost: 100000, stock: 150, minStock: 20, categoryIdx: 0 },
    { sku: "PRT-001", name: "Part B", description: "Komponen mesin tipe B", unit: "pcs", price: 250000, cost: 180000, stock: 75, minStock: 10, categoryIdx: 1 },
    { sku: "SVC-001", name: "Service C", description: "Layanan konsultasi teknis", unit: "hour", price: 500000, cost: 300000, stock: 999, minStock: 0, categoryIdx: 2 },
    { sku: "OFF-001", name: "Printer Paper A4", description: "Kertas printer ukuran A4", unit: "rim", price: 45000, cost: 35000, stock: 200, minStock: 50, categoryIdx: 3 },
    { sku: "WDG-002", name: "Widget Pro", description: "Widget versi pro dengan fitur lengkap", unit: "pcs", price: 250000, cost: 180000, stock: 8, minStock: 15, categoryIdx: 0 },
    // === More Electronics ===
    { sku: "ELC-001", name: "Laptop ASUS VivoBook 14", description: "Laptop 14 inch AMD Ryzen 5, 8GB RAM, 512GB SSD", unit: "unit", price: 7500000, cost: 6200000, stock: 25, minStock: 5, categoryIdx: 0 },
    { sku: "ELC-002", name: "Monitor LG 24 inch", description: "Monitor LED IPS Full HD, HDMI/VGA", unit: "unit", price: 2200000, cost: 1800000, stock: 40, minStock: 10, categoryIdx: 0 },
    { sku: "ELC-003", name: "Keyboard Mechanical Logitech", description: "Keyboard mechanical RGB, switch Blue", unit: "pcs", price: 850000, cost: 600000, stock: 60, minStock: 15, categoryIdx: 0 },
    { sku: "ELC-004", name: "Mouse Wireless Logitech M331", description: "Mouse wireless silent click, 1000 DPI", unit: "pcs", price: 350000, cost: 220000, stock: 120, minStock: 30, categoryIdx: 0 },
    { sku: "ELC-005", name: "Printer Canon PIXMA G3010", description: "Printer all-in-one, print/scan/copy, WiFi", unit: "unit", price: 2800000, cost: 2200000, stock: 15, minStock: 5, categoryIdx: 0 },
    // === Furniture ===
    { sku: "FUR-001", name: "Meja Kerja Direktur", description: "Meja kerja kayu jati, ukuran 160x80cm, laci 3", unit: "unit", price: 4500000, cost: 3200000, stock: 10, minStock: 3, categoryIdx: 4 },
    { sku: "FUR-002", name: "Kursi Ergonomis Kerja", description: "Kursi putar ergonomis, adjustable height, armrest", unit: "unit", price: 2500000, cost: 1800000, stock: 30, minStock: 10, categoryIdx: 4 },
    { sku: "FUR-003", name: "Rak Arsip Besi 4 Susun", description: "Rak arsip besi, 4 susun, anti karat", unit: "unit", price: 1200000, cost: 850000, stock: 20, minStock: 5, categoryIdx: 4 },
    // === Office Supplies ===
    { sku: "OFF-002", name: "Tinta Printer Canon GI-790", description: "Tinta botol original Canon GI-790, Black", unit: "botol", price: 120000, cost: 85000, stock: 150, minStock: 50, categoryIdx: 3 },
    { sku: "OFF-003", name: "Binder Map A4", description: "Map binder A4, 2 ring, warna biru", unit: "pcs", price: 15000, cost: 8000, stock: 500, minStock: 100, categoryIdx: 3 },
    { sku: "OFF-004", name: "Pulpen Pilot G2", description: "Pulpen gel, 0.7mm, hitam", unit: "pcs", price: 8000, cost: 4000, stock: 1000, minStock: 200, categoryIdx: 3 },
    // === Automotive Parts ===
    { sku: "AUT-001", name: "Oli Mesin Castrol GTX 10W-40", description: "Oli mesin sintetik, 4 liter, API SN", unit: "botol", price: 350000, cost: 250000, stock: 50, minStock: 15, categoryIdx: 5 },
    { sku: "AUT-002", name: "Aki GS Astra MF50L", description: "Aki maintenance-free, 12V 45Ah", unit: "pcs", price: 850000, cost: 650000, stock: 20, minStock: 5, categoryIdx: 5 },
    // === Building Materials ===
    { sku: "BLD-001", name: "Semen Portland 50kg", description: "Semen Portland PC-50, karung 50kg", unit: "karung", price: 65000, cost: 50000, stock: 300, minStock: 100, categoryIdx: 8 },
    { sku: "BLD-002", name: "Besi Beton 12mm", description: "Besi beton ulir grade BJTP 24, per batang 12m", unit: "batang", price: 95000, cost: 75000, stock: 200, minStock: 50, categoryIdx: 8 },
    { sku: "BLD-003", name: "Cat Tembok Vinilex 5kg", description: "Cat tembok water-based, warna putih, 5 liter", unit: "kaleng", price: 280000, cost: 200000, stock: 80, minStock: 20, categoryIdx: 8 },
    // === Software & Digital ===
    { sku: "SFT-001", name: "Microsoft Office 365 Business", description: "Langganan Office 365 1 tahun, 1 user", unit: "license", price: 1800000, cost: 1200000, stock: 50, minStock: 10, categoryIdx: 7 },
    { sku: "SFT-002", name: "Antivirus ESET 1 Year", description: "ESET Smart Security Premium, 1 tahun, 1 device", unit: "license", price: 450000, cost: 300000, stock: 100, minStock: 20, categoryIdx: 7 },
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
        // Original 5
        { type: "IN", quantity: 100, reference: "PO-2026-001", notes: "Restock Widget A", productId: products[0].id, tenantId: tenant.id },
        { type: "OUT", quantity: 50, reference: "INV-2026-001", notes: "Penjualan ke PT Maju Jaya", productId: products[0].id, tenantId: tenant.id },
        { type: "IN", quantity: 200, reference: "PO-2026-002", notes: "Restock Part B", productId: products[1].id, tenantId: tenant.id },
        { type: "OUT", quantity: 30, reference: "INV-2026-003", notes: "Penjualan ke CV Berkah", productId: products[1].id, tenantId: tenant.id },
        { type: "ADJUSTMENT", quantity: -5, reference: "ADJ-001", notes: "Koreksi stok Widget Pro", productId: products[4].id, tenantId: tenant.id },
        // More stock movements (30+ total)
        { type: "IN", quantity: 50, reference: "PO-2026-003", notes: "Restock Laptop ASUS", productId: products[5].id, tenantId: tenant.id },
        { type: "OUT", quantity: 10, reference: "INV-2026-007", notes: "Penjualan ke PT Telkom", productId: products[5].id, tenantId: tenant.id },
        { type: "IN", quantity: 80, reference: "PO-2026-004", notes: "Restock Monitor LG", productId: products[6].id, tenantId: tenant.id },
        { type: "OUT", quantity: 15, reference: "INV-2026-008", notes: "Penjualan ke PT Astra", productId: products[6].id, tenantId: tenant.id },
        { type: "IN", quantity: 120, reference: "PO-2026-005", notes: "Restock Keyboard Mechanical", productId: products[7].id, tenantId: tenant.id },
        { type: "OUT", quantity: 25, reference: "INV-2026-009", notes: "Penjualan ke PT Pertamina", productId: products[7].id, tenantId: tenant.id },
        { type: "IN", quantity: 200, reference: "PO-2026-006", notes: "Restock Mouse Wireless", productId: products[8].id, tenantId: tenant.id },
        { type: "OUT", quantity: 40, reference: "INV-2026-010", notes: "Penjualan ke CV Adil Makmur", productId: products[8].id, tenantId: tenant.id },
        { type: "IN", quantity: 30, reference: "PO-2026-007", notes: "Restock Printer Canon", productId: products[9].id, tenantId: tenant.id },
        { type: "OUT", quantity: 8, reference: "INV-2026-011", notes: "Penjualan ke PT PLN", productId: products[9].id, tenantId: tenant.id },
        { type: "IN", quantity: 20, reference: "PO-2026-008", notes: "Restock Meja Direktur", productId: products[10].id, tenantId: tenant.id },
        { type: "OUT", quantity: 5, reference: "INV-2026-012", notes: "Penjualan ke PT BCA", productId: products[10].id, tenantId: tenant.id },
        { type: "IN", quantity: 60, reference: "PO-2026-009", notes: "Restock Kursi Ergonomis", productId: products[11].id, tenantId: tenant.id },
        { type: "OUT", quantity: 20, reference: "INV-2026-013", notes: "Penjualan ke PT Unilever", productId: products[11].id, tenantId: tenant.id },
        { type: "IN", quantity: 40, reference: "PO-2026-010", notes: "Restock Rak Arsip", productId: products[12].id, tenantId: tenant.id },
        { type: "OUT", quantity: 10, reference: "INV-2026-014", notes: "Penjualan ke PT Indofood", productId: products[12].id, tenantId: tenant.id },
        { type: "IN", quantity: 300, reference: "PO-2026-011", notes: "Restock Tinta Printer", productId: products[13].id, tenantId: tenant.id },
        { type: "OUT", quantity: 80, reference: "INV-2026-015", notes: "Penjualan ke PT Surya Gemilang", productId: products[13].id, tenantId: tenant.id },
        { type: "IN", quantity: 1000, reference: "PO-2026-012", notes: "Restock Binder Map", productId: products[14].id, tenantId: tenant.id },
        { type: "OUT", quantity: 150, reference: "INV-2026-016", notes: "Penjualan ke UD Barokah Jaya", productId: products[14].id, tenantId: tenant.id },
        { type: "IN", quantity: 2000, reference: "PO-2026-013", notes: "Restock Pulpen Pilot", productId: products[15].id, tenantId: tenant.id },
        { type: "OUT", quantity: 300, reference: "INV-2026-017", notes: "Penjualan ke PT Garuda Teknologi", productId: products[15].id, tenantId: tenant.id },
        { type: "IN", quantity: 100, reference: "PO-2026-014", notes: "Restock Oli Castrol", productId: products[16].id, tenantId: tenant.id },
        { type: "OUT", quantity: 20, reference: "INV-2026-018", notes: "Penjualan ke CV Mitra Sejati", productId: products[16].id, tenantId: tenant.id },
        { type: "IN", quantity: 600, reference: "PO-2026-015", notes: "Restock Semen Portland", productId: products[18].id, tenantId: tenant.id },
        { type: "OUT", quantity: 100, reference: "INV-2026-019", notes: "Penjualan ke PT Maju Terus", productId: products[18].id, tenantId: tenant.id },
        { type: "ADJUSTMENT", quantity: -10, reference: "ADJ-002", notes: "Koreksi stok Monitor LG", productId: products[6].id, tenantId: tenant.id },
        { type: "ADJUSTMENT", quantity: 5, reference: "ADJ-003", notes: "Penambahan stok Kursi Ergonomis dari return", productId: products[11].id, tenantId: tenant.id },
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
    // === More realistic Indonesian leads ===
    { name: "PT Telkom Indonesia", email: "ict@telkom.co.id", phone: "021-5211111", company: "PT Telkom Indonesia Tbk", source: "REFERRAL", status: "QUALIFIED", value: 250000000, notes: "Proyek digitalisasi kantor pusat", tenantId: tenant.id },
    { name: "PT Astra International", email: "it@astra.co.id", phone: "021-5088888", company: "PT Astra International Tbk", source: "WEBSITE", status: "PROPOSAL", value: 180000000, notes: "Furnitur untuk 5 cabang baru", tenantId: tenant.id },
    { name: "PT Pertamina", email: "procurement@pertamina.com", phone: "021-3815111", company: "PT Pertamina (Persero)", source: "COLD_CALL", status: "NEGOTIATION", value: 500000000, notes: "Kontrak tahunan ATK dan elektronik", tenantId: tenant.id },
    { name: "PT PLN Indonesia", email: "supply@pln.co.id", phone: "021-7261122", company: "PT PLN (Persero)", source: "SOCIAL_MEDIA", status: "CONTACTED", value: 350000000, notes: "Hardware untuk 10 unit distribusi", tenantId: tenant.id },
    { name: "PT Bank BCA", email: "vendor@bca.co.id", phone: "021-23588300", company: "PT Bank Central Asia Tbk", source: "REFERRAL", status: "NEW", value: 120000000, notes: "IT equipment untuk cabang baru", tenantId: tenant.id },
    { name: "PT Unilever", email: "purchase@unilever.co.id", phone: "021-80865111", company: "PT Unilever Indonesia Tbk", source: "WEBSITE", status: "QUALIFIED", value: 200000000, notes: "Office supplies kontrak 1 tahun", tenantId: tenant.id },
    { name: "PT Indofood", email: "procurement@indofood.com", phone: "021-57958989", company: "PT Indofood Sukses Makmur Tbk", source: "COLD_CALL", status: "PROPOSAL", value: 150000000, notes: "Furniture untuk kantor regional", tenantId: tenant.id },
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
    // === More deals with various stages ===
    { title: "PT Telkom - Digitalisasi Kantor", value: 250000000, stage: "NEGOTIATION", contactId: contacts[5].id, tenantId: tenant.id, probability: 70, closeDate: new Date("2026-09-30"), notes: "Negosiasi harga paket lengkap IT" },
    { title: "PT Astra - Furnitur 5 Cabang", value: 180000000, stage: "PROPOSAL", contactId: contacts[6].id, tenantId: tenant.id, probability: 50, closeDate: new Date("2026-10-15"), notes: "Proposal furnitur untuk cabang baru" },
    { title: "PT Pertamina - Kontrak Tahunan ATK", value: 500000000, stage: "DISCOVERY", contactId: contacts[7].id, tenantId: tenant.id, probability: 25, closeDate: new Date("2026-11-01"), notes: "Discovery phase, butuh presentasi" },
    { title: "PT PLN - Hardware Distribusi", value: 350000000, stage: "CLOSING", contactId: contacts[8].id, tenantId: tenant.id, probability: 85, closeDate: new Date("2026-08-28"), notes: "Tinggal kontrak final" },
    { title: "CV Adil Makmur - Office Supplies", value: 12000000, stage: "CLOSED_WON", contactId: contacts[11].id, tenantId: tenant.id, probability: 100, closeDate: new Date("2026-08-05"), notes: "Deal sudah final" },
    { title: "PT Surya Gemilang - Elektronik", value: 45000000, stage: "PROPOSAL", contactId: contacts[13].id, tenantId: tenant.id, probability: 45, closeDate: new Date("2026-09-20"), notes: "Menunggu approval dari management" },
    { title: "UD Barokah Jaya - ATK Rutin", value: 8000000, stage: "CLOSED_LOST", contactId: contacts[14].id, tenantId: tenant.id, probability: 0, closeDate: new Date("2026-08-12"), notes: "Pindah ke supplier lain" },
    { title: "PT Garuda Teknologi - Software License", value: 90000000, stage: "NEGOTIATION", contactId: contacts[16].id, tenantId: tenant.id, probability: 65, closeDate: new Date("2026-09-10"), notes: "Negosiasi bundle software" },
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
    // === More employees (realistic Indonesian names, various departments) ===
    { employeeId: "EMP-006", name: "Rina Wulandari", email: "rina@qalcuity.com", phone: "0813-1234-5678", position: "UI/UX Designer", department: "Engineering", joinDate: new Date("2024-03-01"), salary: 13000000 },
    { employeeId: "EMP-007", name: "Fajar Nugroho", email: "fajar@qalcuity.com", phone: "0813-2345-6789", position: "DevOps Engineer", department: "Engineering", joinDate: new Date("2024-06-15"), salary: 16000000 },
    { employeeId: "EMP-008", name: "Maya Sari", email: "maya@qalcuity.com", phone: "0813-3456-7890", position: "Content Writer", department: "Marketing", joinDate: new Date("2025-01-10"), salary: 8000000 },
    { employeeId: "EMP-009", name: "Rizky Pratama", email: "rizky@qalcuity.com", phone: "0813-4567-8901", position: "Sales Manager", department: "Sales", joinDate: new Date("2023-09-01"), salary: 20000000 },
    { employeeId: "EMP-010", name: "Putri Ayu", email: "putri@qalcuity.com", phone: "0813-5678-9012", position: "Finance Manager", department: "Finance", joinDate: new Date("2023-03-15"), salary: 22000000 },
    { employeeId: "EMP-011", name: "Ahmad Hidayat", email: "ahmad@qalcuity.com", phone: "0813-6789-0123", position: "Warehouse Supervisor", department: "Operations", joinDate: new Date("2024-04-20"), salary: 9000000 },
    { employeeId: "EMP-012", name: "Lestari Putri", email: "lestari@qalcuity.com", phone: "0813-7890-1234", position: "Admin Officer", department: "Operations", joinDate: new Date("2025-02-01"), salary: 7000000 },
    { employeeId: "EMP-013", name: "Dedi Kurniawan", email: "dedi@qalcuity.com", phone: "0813-8901-2345", position: "Quality Assurance", department: "Engineering", joinDate: new Date("2024-07-01"), salary: 12000000 },
    { employeeId: "EMP-014", name: "Nina Susanti", email: "nina@qalcuity.com", phone: "0813-9012-3456", position: "Customer Support Lead", department: "Support", joinDate: new Date("2024-02-15"), salary: 11000000 },
    { employeeId: "EMP-015", name: "Reza Ferdiansyah", email: "reza@qalcuity.com", phone: "0813-0123-4567", position: "Business Analyst", department: "Engineering", joinDate: new Date("2025-04-01"), salary: 14000000 },
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

    for (let dayOffset = 0; dayOffset < 90; dayOffset++) {
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
    console.log("✅ Attendance Records: already seeded (90 days history)");
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
        // === More leave requests ===
        { type: "SICK", startDate: new Date("2026-07-14"), endDate: new Date("2026-07-15"), days: 2, reason: "Sakit perut, diare", status: "APPROVED", appliedDate: new Date("2026-07-14"), approvedBy: "Admin Qalcuity", employeeId: employees[4].id, tenantId: tenant.id },
        { type: "ANNUAL", startDate: new Date("2026-07-21"), endDate: new Date("2026-07-25"), days: 5, reason: "Liburan keluarga ke Bali", status: "APPROVED", appliedDate: new Date("2026-07-10"), approvedBy: "Manager", employeeId: employees[5].id, tenantId: tenant.id },
        { type: "ANNUAL", startDate: new Date("2026-09-01"), endDate: new Date("2026-09-03"), days: 3, reason: "Menemani anak masuk sekolah", status: "PENDING", appliedDate: new Date("2026-08-25"), employeeId: employees[6].id, tenantId: tenant.id },
        { type: "SICK", startDate: new Date("2026-08-12"), endDate: new Date("2026-08-12"), days: 1, reason: "Sakit kepala migrain", status: "APPROVED", appliedDate: new Date("2026-08-12"), approvedBy: "Admin Qalcuity", employeeId: employees[7].id, tenantId: tenant.id },
        { type: "MATERNITY", startDate: new Date("2026-09-01"), endDate: new Date("2026-12-01"), days: 90, reason: "Cuti melahirkan", status: "APPROVED", appliedDate: new Date("2026-08-15"), approvedBy: "HR Director", employeeId: employees[8].id, tenantId: tenant.id },
        { type: "PERSONAL", startDate: new Date("2026-08-28"), endDate: new Date("2026-08-28"), days: 1, reason: "Urusan pernikahan keluarga", status: "PENDING", appliedDate: new Date("2026-08-20"), employeeId: employees[9].id, tenantId: tenant.id },
        { type: "ANNUAL", startDate: new Date("2026-07-07"), endDate: new Date("2026-07-09"), days: 3, reason: "Liburan Lebaran", status: "APPROVED", appliedDate: new Date("2026-07-01"), approvedBy: "Manager", employeeId: employees[10].id, tenantId: tenant.id },
        { type: "SICK", startDate: new Date("2026-08-06"), endDate: new Date("2026-08-07"), days: 2, reason: "DBD, rawat inap", status: "APPROVED", appliedDate: new Date("2026-08-06"), approvedBy: "Admin Qalcuity", employeeId: employees[11].id, tenantId: tenant.id },
        { type: "ANNUAL", startDate: new Date("2026-09-15"), endDate: new Date("2026-09-16"), days: 2, reason: "Wisuda anak", status: "PENDING", appliedDate: new Date("2026-08-28"), employeeId: employees[12].id, tenantId: tenant.id },
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
        // Period 2026-06 (PAID)
        { period: "2026-06", baseSalary: 15000000, allowances: 1500000, deductions: 500000, bonus: 500000, netSalary: 16500000, status: "PAID", paidAt: new Date("2026-06-30"), employeeId: employees[0].id, tenantId: tenant.id },
        { period: "2026-06", baseSalary: 18000000, allowances: 2000000, deductions: 600000, bonus: 1000000, netSalary: 20400000, status: "PAID", paidAt: new Date("2026-06-30"), employeeId: employees[1].id, tenantId: tenant.id },
        { period: "2026-06", baseSalary: 12000000, allowances: 1500000, deductions: 400000, bonus: 0, netSalary: 13100000, status: "PAID", paidAt: new Date("2026-06-30"), employeeId: employees[2].id, tenantId: tenant.id },
        { period: "2026-06", baseSalary: 12000000, allowances: 1500000, deductions: 400000, bonus: 0, netSalary: 13100000, status: "PAID", paidAt: new Date("2026-06-30"), employeeId: employees[3].id, tenantId: tenant.id },
        { period: "2026-06", baseSalary: 14000000, allowances: 1500000, deductions: 500000, bonus: 500000, netSalary: 15500000, status: "PAID", paidAt: new Date("2026-06-30"), employeeId: employees[4].id, tenantId: tenant.id },
        // Period 2026-07 (PAID)
        { period: "2026-07", baseSalary: 15000000, allowances: 1500000, deductions: 500000, bonus: 0, netSalary: 16000000, status: "PAID", paidAt: new Date("2026-07-28"), employeeId: employees[0].id, tenantId: tenant.id },
        { period: "2026-07", baseSalary: 18000000, allowances: 2000000, deductions: 600000, bonus: 1000000, netSalary: 20400000, status: "PAID", paidAt: new Date("2026-07-28"), employeeId: employees[1].id, tenantId: tenant.id },
        { period: "2026-07", baseSalary: 12000000, allowances: 1500000, deductions: 400000, bonus: 0, netSalary: 13100000, status: "PAID", paidAt: new Date("2026-07-28"), employeeId: employees[2].id, tenantId: tenant.id },
        { period: "2026-07", baseSalary: 12000000, allowances: 1500000, deductions: 400000, bonus: 0, netSalary: 13100000, status: "PAID", paidAt: new Date("2026-07-28"), employeeId: employees[3].id, tenantId: tenant.id },
        { period: "2026-07", baseSalary: 14000000, allowances: 1500000, deductions: 500000, bonus: 0, netSalary: 15000000, status: "PAID", paidAt: new Date("2026-07-28"), employeeId: employees[4].id, tenantId: tenant.id },
        { period: "2026-07", baseSalary: 13000000, allowances: 1500000, deductions: 450000, bonus: 0, netSalary: 14050000, status: "PAID", paidAt: new Date("2026-07-28"), employeeId: employees[5].id, tenantId: tenant.id },
        { period: "2026-07", baseSalary: 16000000, allowances: 2000000, deductions: 550000, bonus: 500000, netSalary: 17950000, status: "PAID", paidAt: new Date("2026-07-28"), employeeId: employees[6].id, tenantId: tenant.id },
        // Period 2026-08 (PENDING — not yet paid)
        { period: "2026-08", baseSalary: 15000000, allowances: 1500000, deductions: 500000, bonus: 0, netSalary: 16000000, status: "PENDING", employeeId: employees[0].id, tenantId: tenant.id },
        { period: "2026-08", baseSalary: 18000000, allowances: 2000000, deductions: 600000, bonus: 0, netSalary: 19400000, status: "PENDING", employeeId: employees[1].id, tenantId: tenant.id },
        { period: "2026-08", baseSalary: 12000000, allowances: 1500000, deductions: 400000, bonus: 0, netSalary: 13100000, status: "PENDING", employeeId: employees[2].id, tenantId: tenant.id },
        { period: "2026-08", baseSalary: 12000000, allowances: 1500000, deductions: 400000, bonus: 0, netSalary: 13100000, status: "PENDING", employeeId: employees[3].id, tenantId: tenant.id },
        { period: "2026-08", baseSalary: 14000000, allowances: 1500000, deductions: 500000, bonus: 0, netSalary: 15000000, status: "PENDING", employeeId: employees[4].id, tenantId: tenant.id },
        { period: "2026-08", baseSalary: 13000000, allowances: 1500000, deductions: 450000, bonus: 0, netSalary: 14050000, status: "PENDING", employeeId: employees[5].id, tenantId: tenant.id },
        { period: "2026-08", baseSalary: 16000000, allowances: 2000000, deductions: 550000, bonus: 0, netSalary: 17450000, status: "PENDING", employeeId: employees[6].id, tenantId: tenant.id },
        { period: "2026-08", baseSalary: 8000000, allowances: 1000000, deductions: 300000, bonus: 0, netSalary: 8700000, status: "PENDING", employeeId: employees[7].id, tenantId: tenant.id },
        { period: "2026-08", baseSalary: 20000000, allowances: 2500000, deductions: 700000, bonus: 1000000, netSalary: 22800000, status: "PENDING", employeeId: employees[8].id, tenantId: tenant.id },
        { period: "2026-08", baseSalary: 22000000, allowances: 3000000, deductions: 800000, bonus: 0, netSalary: 24200000, status: "PENDING", employeeId: employees[9].id, tenantId: tenant.id },
        { period: "2026-08", baseSalary: 9000000, allowances: 1000000, deductions: 350000, bonus: 0, netSalary: 9650000, status: "PENDING", employeeId: employees[10].id, tenantId: tenant.id },
      ],
    });
  }
  console.log("✅ Payroll Records: handled");

  // ============================================
  // ADDITIONAL PAYROLL RECORDS (periode lebih banyak)
  // ============================================
  // Additional payroll untuk employees[11]-[14] (belum punya data di period sebelumnya)
  const additionalPayrollData = [
    // Period 2026-06
    { period: "2026-06", baseSalary: 7500000, allowances: 1000000, deductions: 300000, bonus: 0, netSalary: 8200000, status: "PAID", paidAt: new Date("2026-06-30"), employeeId: employees[11].id, tenantId: tenant.id },
    { period: "2026-06", baseSalary: 11000000, allowances: 1500000, deductions: 400000, bonus: 0, netSalary: 12100000, status: "PAID", paidAt: new Date("2026-06-30"), employeeId: employees[12].id, tenantId: tenant.id },
    { period: "2026-06", baseSalary: 9000000, allowances: 1000000, deductions: 350000, bonus: 0, netSalary: 9650000, status: "PAID", paidAt: new Date("2026-06-30"), employeeId: employees[13].id, tenantId: tenant.id },
    { period: "2026-06", baseSalary: 10000000, allowances: 1500000, deductions: 380000, bonus: 0, netSalary: 11120000, status: "PAID", paidAt: new Date("2026-06-30"), employeeId: employees[14].id, tenantId: tenant.id },
    // Period 2026-07
    { period: "2026-07", baseSalary: 7500000, allowances: 1000000, deductions: 300000, bonus: 0, netSalary: 8200000, status: "PAID", paidAt: new Date("2026-07-28"), employeeId: employees[11].id, tenantId: tenant.id },
    { period: "2026-07", baseSalary: 11000000, allowances: 1500000, deductions: 400000, bonus: 500000, netSalary: 12600000, status: "PAID", paidAt: new Date("2026-07-28"), employeeId: employees[12].id, tenantId: tenant.id },
    { period: "2026-07", baseSalary: 9000000, allowances: 1000000, deductions: 350000, bonus: 0, netSalary: 9650000, status: "PAID", paidAt: new Date("2026-07-28"), employeeId: employees[13].id, tenantId: tenant.id },
    { period: "2026-07", baseSalary: 10000000, allowances: 1500000, deductions: 380000, bonus: 0, netSalary: 11120000, status: "PAID", paidAt: new Date("2026-07-28"), employeeId: employees[14].id, tenantId: tenant.id },
    // Period 2026-08 (PENDING)
    { period: "2026-08", baseSalary: 7500000, allowances: 1000000, deductions: 300000, bonus: 0, netSalary: 8200000, status: "PENDING", employeeId: employees[11].id, tenantId: tenant.id },
    { period: "2026-08", baseSalary: 11000000, allowances: 1500000, deductions: 400000, bonus: 0, netSalary: 12100000, status: "PENDING", employeeId: employees[12].id, tenantId: tenant.id },
    { period: "2026-08", baseSalary: 9000000, allowances: 1000000, deductions: 350000, bonus: 0, netSalary: 9650000, status: "PENDING", employeeId: employees[13].id, tenantId: tenant.id },
    { period: "2026-08", baseSalary: 10000000, allowances: 1500000, deductions: 380000, bonus: 0, netSalary: 11120000, status: "PENDING", employeeId: employees[14].id, tenantId: tenant.id },
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

  // ============================================
  // PLANS (Entitlement Engine) — upsert berdasarkan slug
  // ============================================
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
      name: "Pro",
      slug: "pro",
      description: "Untuk bisnis yang berkembang dengan kebutuhan lengkap",
      priceMonthly: 299000,
      priceYearly: 2990000,
      maxUsers: 20,
      maxStorage: 5000,
      sortOrder: 1,
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
      name: "Enterprise",
      slug: "enterprise",
      description: "Untuk bisnis besar dengan kebutuhan advanced",
      priceMonthly: 999000,
      priceYearly: 9990000,
      maxUsers: -1,
      maxStorage: null,
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
      console.log(`✅ Plan already exists: ${planDef.name}`);
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

  console.log("\n🎉 Seeding completed!");
  console.log("\n📋 Demo Accounts:");
  console.log("  SuperAdmin: info@qalcuity.com / Wahyu123456789@");
  console.log("  Admin:      admin@qalcuity.com / admin123");
  console.log("  Demo:       demo@qalcuity.com / demo123");
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
