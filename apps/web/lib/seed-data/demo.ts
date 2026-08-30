/**
 * Demo Data Seed Function
 * 
 * Generates realistic Indonesian business data for a tenant.
 * Safe to run multiple times — checks for existing data before inserting.
 * 
 * Usage: loadDemoData(tenantId)
 * 
 * Data yang di-generate:
 * - Categories (9)
 * - Suppliers (9)
 * - Contacts/Customers (20)
 * - Products (15)
 * - Leads (10)
 * - Deals (8)
 * - Invoices (10) dengan items
 * - Payments (8)
 * - Quotations (6) dengan items
 * - Purchase Orders (5) dengan items
 * - Employees (12)
 * - Attendance Records (5 hari untuk 5 karyawan)
 * - Leave Requests (4)
 * - Payroll Records (6)
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ─── Helper Functions ────────────────────────────────────────────────────────

function randomDate(start: Date, end: Date): Date {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDecimal(min: number, max: number, decimals = 2): number {
    return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function generateInvoiceNumber(index: number): string {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, "0");
    return `INV-${year}${month}-${String(index).padStart(4, "0")}`;
}

function generatePONumber(index: number): string {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, "0");
    return `PO-${year}${month}-${String(index).padStart(4, "0")}`;
}

function generateQuotationNumber(index: number): string {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, "0");
    return `QUO-${year}${month}-${String(index).padStart(4, "0")}`;
}

function generatePaymentNumber(index: number): string {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, "0");
    return `PAY-${year}${month}-${String(index).padStart(4, "0")}`;
}

// ─── Main Seed Function ──────────────────────────────────────────────────────

export interface DemoDataResult {
    success: boolean;
    message: string;
    counts: Record<string, number>;
}

export async function loadDemoData(tenantId: string): Promise<DemoDataResult> {
    const counts: Record<string, number> = {};

    try {
        // ─── CATEGORIES ──────────────────────────────────────────────────────
        const categoryData = [
            { name: "Elektronik", description: "Produk elektronik dan gadget" },
            { name: "Mekanikal", description: "Komponen mekanik dan industri" },
            { name: "Jasa", description: "Layanan jasa profesional" },
            { name: "Perlengkapan Kantor", description: "Perlengkapan dan alat tulis kantor" },
            { name: "Furniture", description: "Furniture kantor dan rumah" },
            { name: "Suku Cadang Otomotif", description: "Suku cadang kendaraan bermotor" },
            { name: "Makanan & Minuman", description: "Produk makanan dan minuman" },
            { name: "Software & Digital", description: "Perangkat lunak dan layanan digital" },
            { name: "Bahan Bangunan", description: "Bahan bangunan dan konstruksi" },
        ];

        const categories = [];
        for (const cd of categoryData) {
            const existing = await prisma.category.findFirst({
                where: { name: cd.name, tenantId },
            });
            if (existing) {
                categories.push(existing);
            } else {
                const created = await prisma.category.create({
                    data: { ...cd, tenantId },
                });
                categories.push(created);
            }
        }
        counts.categories = categories.length;

        // ─── SUPPLIERS ──────────────────────────────────────────────────────
        const supplierData = [
            { name: "PT Sejahtera Supplier", contactPerson: "Budi Hartono", email: "budi@sejahtera-supplier.co.id", phone: "021-7890123", address: "Jl. Raya Bogor Km 30", city: "Jakarta", rating: 4.5 },
            { name: "CV Berkah Komponen", contactPerson: "Siti Rahayu", email: "siti@berkahcomp.co.id", phone: "021-8901234", address: "Jl. Raya Bekasi Km 15", city: "Bekasi", rating: 4.0 },
            { name: "PT Teknologi Nusantara", contactPerson: "Rahmat Widodo", email: "rahmat@teknusa.co.id", phone: "021-9012345", address: "Jl. Raya Tangerang Km 12", city: "Tangerang", rating: 4.2 },
            { name: "PT Supply Indonesia", contactPerson: "Hendra Wijaya", email: "hendra@supplyindo.co.id", phone: "021-5559012", address: "Jl. Raya Cakung Km 5", city: "Jakarta Timur", rating: 4.3 },
            { name: "CV Distribusi Jaya", contactPerson: "Rina Susanti", email: "rina@distrijaya.co.id", phone: "021-5551023", address: "Jl. Raya Cikarang Blok A No. 12", city: "Bekasi", rating: 4.1 },
            { name: "PT Logistik Nusantara", contactPerson: "Agus Pratama", email: "agus@logistiknusantara.co.id", phone: "0411-5552134", address: "Jl. Raya Gorontalo Km 8", city: "Makassar", rating: 4.6 },
            { name: "CV Bahan Bangunan Sejahtera", contactPerson: "Dedi Kurniawan", email: "dedi@bbs.co.id", phone: "021-5553245", address: "Jl. Raya Bogor Km 25", city: "Jakarta Selatan", rating: 3.9 },
            { name: "PT Komponen Elektronik Nusantara", contactPerson: "Fandi Ahmad", email: "fandi@kompel.co.id", phone: "021-5554356", address: "Jl. Mangga Dua Raya No. 18", city: "Jakarta Utara", rating: 4.4 },
            { name: "CV Furniture Jati Jepara", contactPerson: "Siti Nurjanah", email: "siti@jatijepara.co.id", phone: "0291-5555467", address: "Jl. Raya Jepara-Kudus Km 3", city: "Jepara", rating: 4.7 },
        ];

        const suppliers = [];
        for (const sd of supplierData) {
            const existing = await prisma.supplier.findFirst({
                where: { name: sd.name, tenantId },
            });
            if (existing) {
                suppliers.push(existing);
            } else {
                const created = await prisma.supplier.create({
                    data: { ...sd, tenantId },
                });
                suppliers.push(created);
            }
        }
        counts.suppliers = suppliers.length;

        // ─── CONTACTS ───────────────────────────────────────────────────────
        const contactData = [
            { name: "PT Maju Jaya", type: "CUSTOMER", company: "PT Maju Jaya", email: "info@majujaya.co.id", phone: "021-2345678", address: "Jl. Gatot Subroto No. 45", city: "Jakarta", taxId: "01.234.567.8-901.000" },
            { name: "CV Berkah Mandiri", type: "CUSTOMER", company: "CV Berkah Mandiri", email: "info@berkahmandiri.co.id", phone: "021-3456789", address: "Jl. HR Rasuna Said No. 78", city: "Jakarta" },
            { name: "PT Sejahtera Abadi", type: "CUSTOMER", company: "PT Sejahtera Abadi", email: "sales@sejahtera.co.id", phone: "021-4567890", address: "Jl. TB Simatupang No. 90", city: "Jakarta" },
            { name: "PT Nusantara Jaya", type: "CUSTOMER", company: "PT Nusantara Jaya", email: "info@nusantara.co.id", phone: "021-5678901", address: "Jl. Thamrin No. 12", city: "Jakarta" },
            { name: "CV Sukses Mandiri", type: "CUSTOMER", company: "CV Sukses Mandiri", email: "info@suksesmandiri.co.id", phone: "021-6789012", address: "Jl. Kuningan No. 55", city: "Jakarta" },
            { name: "PT Telkom Indonesia", type: "CUSTOMER", company: "PT Telkom Indonesia Tbk", email: "procurement@telkom.co.id", phone: "021-5211111", address: "Jl. Japati No. 1", city: "Bandung", taxId: "01.306.432.9-052.000" },
            { name: "PT Astra International", type: "CUSTOMER", company: "PT Astra International Tbk", email: "supply@astra.co.id", phone: "021-5088888", address: "Jl. Gaya Motor I No. 8, Sunter", city: "Jakarta Utara" },
            { name: "PT Pertamina", type: "CUSTOMER", company: "PT Pertamina (Persero) Tbk", email: "procurement@pertamina.com", phone: "021-3815111", address: "Jl. Medan Merdeka Timur No. 1A", city: "Jakarta Pusat" },
            { name: "PT Bank Central Asia", type: "CUSTOMER", company: "PT Bank Central Asia Tbk", email: "vendor@bca.co.id", phone: "021-23588300", address: "Jl. Jend. Sudirman Kav. 78", city: "Jakarta Selatan" },
            { name: "PT Unilever Indonesia", type: "CUSTOMER", company: "PT Unilever Indonesia Tbk", email: "purchase@unilever.co.id", phone: "021-80865111", address: "Gedung Grha Unilever BSD", city: "Tangerang" },
            { name: "CV Adil Makmur", type: "CUSTOMER", company: "CV Adil Makmur", email: "order@adilmakmur.co.id", phone: "0274-5552468", address: "Jl. Malioboro No. 35", city: "Yogyakarta" },
            { name: "PT Surya Gemilang", type: "CUSTOMER", company: "PT Surya Gemilang Sejahtera", email: "info@suryagemilang.co.id", phone: "031-5553691", address: "Jl. Basuki Rachmat No. 12", city: "Surabaya" },
            { name: "UD Barokah Jaya", type: "CUSTOMER", company: "UD Barokah Jaya", email: "barokah@jaya.co.id", phone: "0341-5557412", address: "Jl. Bromo No. 22", city: "Malang" },
            { name: "PT Harmoni Komputama", type: "BOTH", company: "PT Harmoni Komputama", email: "sales@harmoni.co.id", phone: "021-5558520", address: "Jl. Mangga Dua No. 8", city: "Jakarta Utara" },
            { name: "CV Mitra Sejati", type: "CUSTOMER", company: "CV Mitra Sejati", email: "info@mitrasejati.co.id", phone: "021-5559630", address: "Jl. Pemuda No. 15", city: "Bekasi" },
            { name: "PT Garuda Teknologi", type: "CUSTOMER", company: "PT Garuda Teknologi Nusantara", email: "procurement@garudatech.co.id", phone: "021-5554710", address: "Jl. Alternatif Cibubur Km 4", city: "Bogor" },
            { name: "PT Maju Terus Perkasa", type: "CUSTOMER", company: "PT Maju Terus Perkasa", email: "info@majuterus.co.id", phone: "021-5556380", address: "Jl. Panjang No. 8", city: "Jakarta Barat" },
            { name: "PT Indofood Sukses Makmur", type: "CUSTOMER", company: "PT Indofood Sukses Makmur Tbk", email: "procurement@indofood.com", phone: "021-57958989", address: "Jl. Sudirman Kav. 76-78", city: "Jakarta Selatan" },
            { name: "PT PLN Indonesia", type: "CUSTOMER", company: "PT PLN (Persero) Tbk", email: "tender@pln.co.id", phone: "021-7261122", address: "Jl. Lapangan Banteng Timur 3-4", city: "Jakarta Pusat" },
            { name: "PT Sumber Makmur", type: "SUPPLIER", company: "PT Sumber Makmur", email: "info@sumbermakmur.co.id", phone: "021-5553691" },
        ];

        const contacts = [];
        for (const cd of contactData) {
            const existing = await prisma.contact.findFirst({
                where: { name: cd.name, tenantId },
            });
            if (existing) {
                contacts.push(existing);
            } else {
                const created = await prisma.contact.create({
                    data: { ...cd, tenantId },
                });
                contacts.push(created);
            }
        }
        counts.contacts = contacts.length;

        // ─── PRODUCTS ────────────────────────────────────────────────────────
        const productData = [
            { sku: "ELC-001", name: "Laptop ASUS VivoBook 14", description: "Laptop 14 inch, Intel Core i5, 8GB RAM, 512GB SSD", unit: "pcs", price: 8500000, cost: 7200000, stock: 25, minStock: 5, categoryIdx: 0 },
            { sku: "ELC-002", name: "Monitor LG 24 inch LED", description: "Monitor LED IPS 24 inch, Full HD", unit: "pcs", price: 2800000, cost: 2200000, stock: 40, minStock: 10, categoryIdx: 0 },
            { sku: "ELC-003", name: "Keyboard Mechanical Logitech", description: "Keyboard mechanical RGB, switch Cherry MX", unit: "pcs", price: 850000, cost: 650000, stock: 60, minStock: 15, categoryIdx: 0 },
            { sku: "MEK-001", name: "Bearing SKF 6205", description: "Bearing ball bearing 25x52x15mm", unit: "pcs", price: 125000, cost: 85000, stock: 200, minStock: 50, categoryIdx: 1 },
            { sku: "MEK-002", name: "Gear BoxReducer 1:10", description: "Gearbox reducer ratio 1:10, 1HP", unit: "pcs", price: 3500000, cost: 2800000, stock: 8, minStock: 3, categoryIdx: 1 },
            { sku: "OFI-001", name: "Kertas A4 70g (5 rim)", description: "Kertas HVS A4 70 gram, 5 rim per pack", unit: "pack", price: 65000, cost: 52000, stock: 150, minStock: 30, categoryIdx: 3 },
            { sku: "OFI-002", name: "Tinta Printer Canon GI-790 Black", description: "Tinta infus original Canon GI-790 warna hitam", unit: "pcs", price: 185000, cost: 145000, stock: 80, minStock: 20, categoryIdx: 3 },
            { sku: "FRN-001", name: "Meja Kerja Kayu Jati 120x60cm", description: "Meja kerja kayu jati solid, finishing melamin", unit: "pcs", price: 2500000, cost: 1800000, stock: 12, minStock: 3, categoryIdx: 4 },
            { sku: "FRN-002", name: "Kursi Ergonomis Mesh", description: "Kursi kantor ergonomis dengan sandaran mesh", unit: "pcs", price: 1800000, cost: 1200000, stock: 20, minStock: 5, categoryIdx: 4 },
            { sku: "OTM-001", name: "Oli Mesin Castrol GTX 4L", description: "Oli mesin sintetik Castrol GTX 4 liter", unit: "pcs", price: 320000, cost: 250000, stock: 50, minStock: 15, categoryIdx: 5 },
            { sku: "OTM-002", name: "Filter Oli Mobil Toyota", description: "Filter oli original Toyota Avanza/Innova", unit: "pcs", price: 75000, cost: 45000, stock: 100, minStock: 25, categoryIdx: 5 },
            { sku: "FNB-001", name: "Kopi Arabika Gayo 500g", description: "Kopi arabika premium dari dataran tinggi Gayo", unit: "pcs", price: 120000, cost: 80000, stock: 75, minStock: 20, categoryIdx: 6 },
            { sku: "SW-001", name: "Microsoft Office 365 Biz (1 tahun)", description: "Lisensi Microsoft 365 Business 1 tahun, 1 user", unit: "lic", price: 1800000, cost: 1500000, stock: 100, minStock: 20, categoryIdx: 7 },
            { sku: "SW-002", name: "Adobe Creative Cloud (1 tahun)", description: "Lisensi Adobe CC All Apps 1 tahun", unit: "lic", price: 4500000, cost: 3800000, stock: 30, minStock: 5, categoryIdx: 7 },
            { sku: "BNG-001", name: "Semen Portland 50kg", description: "Semen Portland komposit 50 kg", unit: "pcs", price: 72000, cost: 58000, stock: 500, minStock: 100, categoryIdx: 8 },
        ];

        const products = [];
        for (const pd of productData) {
            const existing = await prisma.product.findFirst({
                where: { sku: pd.sku, tenantId },
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
                        tenantId,
                        categoryId: categories[pd.categoryIdx]?.id,
                    },
                });
                products.push(created);
            }
        }
        counts.products = products.length;

        // ─── LEADS ───────────────────────────────────────────────────────────
        const leadData = [
            { name: "Ahmad Fauzi", company: "PT Fauzi Bersaudara", email: "ahmad@fauzibersaudara.co.id", phone: "0812-3456-7890", source: "WEBSITE", status: "NEW", value: 50000000 },
            { name: "Rina Wulandari", company: "CV Wulandari Elektronik", email: "rina@wulandarielek.co.id", phone: "0813-4567-8901", source: "REFERRAL", status: "CONTACTED", value: 75000000 },
            { name: "Dedi Kurniawan", company: "PT Kurniawan Mandiri", email: "dedi@kurniawanmandiri.co.id", phone: "0815-5678-9012", source: "COLD_CALL", status: "QUALIFIED", value: 120000000 },
            { name: "Sari Dewi", company: "UD Dewi Sejahtera", email: "sari@dewisejahtera.co.id", phone: "0816-6789-0123", source: "SOCIAL_MEDIA", status: "PROPOSAL", value: 35000000 },
            { name: "Budi Santoso", company: "PT Santoso Teknik", email: "budi@santosoteknik.co.id", phone: "0817-7890-1234", source: "WEBSITE", status: "NEGOTIATION", value: 200000000 },
            { name: "Maya Putri", company: "CV Putri Abadi", email: "maya@putriabadi.co.id", phone: "0818-8901-2345", source: "REFERRAL", status: "WON", value: 85000000 },
            { name: "Hendra Wijaya", company: "PT Wijaya Perkasa", email: "hendra@wijayaperkasa.co.id", phone: "0819-9012-3456", source: "COLD_CALL", status: "NEW", value: 42000000 },
            { name: "Linda Sari", company: "CV Sari Makmur", email: "linda@sarimakmur.co.id", phone: "0821-0123-4567", source: "WEBSITE", status: "CONTACTED", value: 28000000 },
            { name: "Rizki Pratama", company: "PT Pratama Digital", email: "rizki@pratamadigital.co.id", phone: "0822-1234-5678", source: "SOCIAL_MEDIA", status: "LOST", value: 150000000 },
            { name: "Andi Cahyono", company: "UD Cahyono Jaya", email: "andi@cahyonojaya.co.id", phone: "0823-2345-6789", source: "REFERRAL", status: "QUALIFIED", value: 55000000 },
        ];

        const leads = [];
        for (const ld of leadData) {
            const existing = await prisma.lead.findFirst({
                where: { name: ld.name, tenantId },
            });
            if (existing) {
                leads.push(existing);
            } else {
                const contactId: string | undefined = contacts[leads.length % contacts.length]?.id;
                const created: { id: string } = await prisma.lead.create({
                    data: { ...ld, tenantId, contactId },
                });
                leads.push(created);
            }
        }
        counts.leads = leads.length;

        // ─── DEALS ───────────────────────────────────────────────────────────
        const dealData = [
            { title: "Pengadaan Laptop 50 Unit", value: 425000000, stage: "NEGOTIATION", probability: 70, closeDate: randomDate(new Date(), new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)) },
            { title: "Supply Bearing Industri", value: 25000000, stage: "PROPOSAL", probability: 50, closeDate: randomDate(new Date(), new Date(Date.now() + 45 * 24 * 60 * 60 * 1000)) },
            { title: "Kontrak Furniture Kantor Q4", value: 150000000, stage: "DISCOVERY", probability: 20, closeDate: randomDate(new Date(), new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)) },
            { title: "Annual Software License", value: 250000000, stage: "CLOSING", probability: 90, closeDate: randomDate(new Date(), new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)) },
            { title: "Supply Oli & Filter Tahunan", value: 75000000, stage: "CLOSED_WON", probability: 100, closeDate: randomDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date()) },
            { title: "Kopi Premium Corporate Gift", value: 18000000, stage: "CLOSED_WON", probability: 100, closeDate: randomDate(new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), new Date()) },
            { title: "Pengadaan Printer 10 Unit", value: 15000000, stage: "CLOSED_LOST", probability: 0, closeDate: randomDate(new Date(Date.now() - 45 * 24 * 60 * 60 * 1000), new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)) },
            { title: "Renovasi Kantor Lantai 3", value: 350000000, stage: "PROPOSAL", probability: 40, closeDate: randomDate(new Date(), new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)) },
        ];

        const deals = [];
        for (const dd of dealData) {
            const existing = await prisma.deal.findFirst({
                where: { title: dd.title, tenantId },
            });
            if (existing) {
                deals.push(existing);
            } else {
                const contactId: string | undefined = contacts[deals.length % contacts.length]?.id;
                const leadId: string | undefined = leads[deals.length % leads.length]?.id;
                const created: { id: string } = await prisma.deal.create({
                    data: { ...dd, tenantId, contactId, leadId },
                });
                deals.push(created);
            }
        }
        counts.deals = deals.length;

        // ─── INVOICES ────────────────────────────────────────────────────────
        const invoiceData = [
            { status: "PAID", daysAgo: 45, subtotal: 85000000, items: [{ desc: "Laptop ASUS VivoBook 14", qty: 10, price: 8500000 }] },
            { status: "PAID", daysAgo: 30, subtotal: 28000000, items: [{ desc: "Monitor LG 24 inch LED", qty: 10, price: 2800000 }] },
            { status: "SENT", daysAgo: 15, subtotal: 42500000, items: [{ desc: "Laptop ASUS VivoBook 14", qty: 5, price: 8500000 }] },
            { status: "DRAFT", daysAgo: 5, subtotal: 12500000, items: [{ desc: "Bearing SKF 6205", qty: 100, price: 125000 }] },
            { status: "OVERDUE", daysAgo: 60, subtotal: 25000000, items: [{ desc: "Gear Box Reducer 1:10", qty: 7, price: 3500000 }] },
            { status: "PAID", daysAgo: 20, subtotal: 6500000, items: [{ desc: "Kertas A4 70g (5 rim)", qty: 100, price: 65000 }] },
            { status: "SENT", daysAgo: 10, subtotal: 18500000, items: [{ desc: "Tinta Printer Canon GI-790", qty: 100, price: 185000 }] },
            { status: "PAID", daysAgo: 35, subtotal: 36000000, items: [{ desc: "Kursi Ergonomis Mesh", qty: 20, price: 1800000 }] },
            { status: "DRAFT", daysAgo: 2, subtotal: 7200000, items: [{ desc: "Semen Portland 50kg", qty: 100, price: 72000 }] },
            { status: "SENT", daysAgo: 7, subtotal: 18000000, items: [{ desc: "Microsoft Office 365 Biz (1 tahun)", qty: 10, price: 1800000 }] },
        ];

        const invoices = [];
        for (let i = 0; i < invoiceData.length; i++) {
            const inv = invoiceData[i];
            const invoiceNumber = generateInvoiceNumber(i + 1);
            const existing = await prisma.invoice.findFirst({
                where: { invoiceNumber, tenantId },
            });
            if (existing) {
                invoices.push(existing);
                continue;
            }

            const taxRate = 11;
            const taxAmount = parseFloat((inv.subtotal * taxRate / 100).toFixed(2));
            const total = inv.subtotal + taxAmount;
            const createdAt = new Date(Date.now() - inv.daysAgo * 24 * 60 * 60 * 1000);
            const dueDate = new Date(createdAt.getTime() + 30 * 24 * 60 * 60 * 1000);
            const contactId = contacts[i % contacts.length]?.id;

            const created = await prisma.invoice.create({
                data: {
                    invoiceNumber,
                    status: inv.status,
                    dueDate,
                    notes: `Invoice untuk ${contacts[i % contacts.length]?.name || "Customer"}`,
                    subtotal: inv.subtotal,
                    taxRate,
                    taxAmount,
                    total,
                    tenantId,
                    contactId,
                    createdAt,
                    items: {
                        create: inv.items.map((item) => ({
                            description: item.desc,
                            quantity: item.qty,
                            unitPrice: item.price,
                            total: item.qty * item.price,
                        })),
                    },
                },
            });
            invoices.push(created);
        }
        counts.invoices = invoices.length;

        // ─── PAYMENTS ────────────────────────────────────────────────────────
        const paidInvoices = invoices.filter((inv) => inv.status === "PAID");
        const payments = [];
        for (let i = 0; i < paidInvoices.length && i < 6; i++) {
            const paymentNumber = generatePaymentNumber(i + 1);
            const existing = await prisma.payment.findFirst({
                where: { paymentNumber, tenantId },
            });
            if (existing) {
                payments.push(existing);
                continue;
            }

            const created = await prisma.payment.create({
                data: {
                    paymentNumber,
                    amount: paidInvoices[i].total,
                    paymentDate: new Date(Date.now() - (30 + i * 5) * 24 * 60 * 60 * 1000),
                    method: ["BANK_TRANSFER", "CASH", "E_WALLET"][i % 3],
                    status: "COMPLETED",
                    type: "INCOME",
                    notes: `Pembayaran invoice ${paidInvoices[i].invoiceNumber}`,
                    tenantId,
                    invoiceId: paidInvoices[i].id,
                },
            });
            payments.push(created);
        }

        // Add a couple of expense payments
        for (let i = 0; i < 2; i++) {
            const paymentNumber = generatePaymentNumber(paidInvoices.length + i + 1);
            const existing = await prisma.payment.findFirst({
                where: { paymentNumber, tenantId },
            });
            if (!existing) {
                const created = await prisma.payment.create({
                    data: {
                        paymentNumber,
                        amount: randomDecimal(500000, 5000000),
                        paymentDate: new Date(Date.now() - (20 + i * 10) * 24 * 60 * 60 * 1000),
                        method: "BANK_TRANSFER",
                        status: "COMPLETED",
                        type: "EXPENSE",
                        notes: i === 0 ? "Pembayaran listrik bulanan" : "Pembayaran internet kantor",
                        tenantId,
                    },
                });
                payments.push(created);
            }
        }
        counts.payments = payments.length;

        // ─── QUOTATIONS ──────────────────────────────────────────────────────
        const quotationData = [
            { status: "DRAFT", subtotal: 85000000, discount: 5000000, items: [{ desc: "Laptop ASUS VivoBook 14", qty: 10, price: 8500000 }] },
            { status: "SENT", subtotal: 28000000, discount: 0, items: [{ desc: "Monitor LG 24 inch LED", qty: 10, price: 2800000 }] },
            { status: "ACCEPTED", subtotal: 42500000, discount: 2500000, items: [{ desc: "Laptop ASUS VivoBook 14", qty: 5, price: 8500000 }, { desc: "Keyboard Mechanical Logitech", qty: 5, price: 850000 }] },
            { status: "REJECTED", subtotal: 350000000, discount: 10000000, items: [{ desc: "Renovasi Kantor Lantai 3", qty: 1, price: 350000000 }] },
            { status: "SENT", subtotal: 55000000, discount: 0, items: [{ desc: "Gear Box Reducer 1:10", qty: 10, price: 3500000 }, { desc: "Bearing SKF 6205", qty: 100, price: 125000 }] },
            { status: "DRAFT", subtotal: 18000000, discount: 1000000, items: [{ desc: "Adobe Creative Cloud (1 tahun)", qty: 4, price: 4500000 }] },
        ];

        const quotations = [];
        for (let i = 0; i < quotationData.length; i++) {
            const quo = quotationData[i];
            const quotationNumber = generateQuotationNumber(i + 1);
            const existing = await prisma.quotation.findFirst({
                where: { quotationNumber, tenantId },
            });
            if (existing) {
                quotations.push(existing);
                continue;
            }

            const taxRate = 11;
            const taxAmount = parseFloat(((quo.subtotal - quo.discount) * taxRate / 100).toFixed(2));
            const total = quo.subtotal - quo.discount + taxAmount;
            const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
            const contactId = contacts[i % contacts.length]?.id;

            const created = await prisma.quotation.create({
                data: {
                    quotationNumber,
                    status: quo.status,
                    validUntil,
                    notes: `Penawaran untuk ${contacts[i % contacts.length]?.name || "Customer"}`,
                    subtotal: quo.subtotal,
                    taxRate,
                    taxAmount,
                    discount: quo.discount,
                    total,
                    tenantId,
                    contactId,
                    items: {
                        create: quo.items.map((item) => ({
                            description: item.desc,
                            quantity: item.qty,
                            unitPrice: item.price,
                            total: item.qty * item.price,
                        })),
                    },
                },
            });
            quotations.push(created);
        }
        counts.quotations = quotations.length;

        // ─── PURCHASE ORDERS ─────────────────────────────────────────────────
        const poData = [
            { status: "RECEIVED", daysAgo: 40, subtotal: 85000000, items: [{ desc: "Laptop ASUS VivoBook 14", qty: 10, price: 7200000 }] },
            { status: "SENT", daysAgo: 15, subtotal: 12500000, items: [{ desc: "Bearing SKF 6205", qty: 100, price: 85000 }] },
            { status: "DRAFT", daysAgo: 3, subtotal: 50000000, items: [{ desc: "Kursi Ergonomis Mesh", qty: 30, price: 1200000 }] },
            { status: "RECEIVED", daysAgo: 25, subtotal: 25000000, items: [{ desc: "Gear Box Reducer 1:10", qty: 10, price: 2800000 }] },
            { status: "CONFIRMED", daysAgo: 7, subtotal: 7200000, items: [{ desc: "Semen Portland 50kg", qty: 100, price: 58000 }] },
        ];

        const purchaseOrders = [];
        for (let i = 0; i < poData.length; i++) {
            const po = poData[i];
            const poNumber = generatePONumber(i + 1);
            const existing = await prisma.purchaseOrder.findFirst({
                where: { poNumber, tenantId },
            });
            if (existing) {
                purchaseOrders.push(existing);
                continue;
            }

            const taxRate = 11;
            const taxAmount = parseFloat((po.subtotal * taxRate / 100).toFixed(2));
            const total = po.subtotal + taxAmount;
            const createdAt = new Date(Date.now() - po.daysAgo * 24 * 60 * 60 * 1000);
            const deliveryDate = new Date(createdAt.getTime() + 14 * 24 * 60 * 60 * 1000);
            const supplierId = suppliers[i % suppliers.length]?.id;

            const created = await prisma.purchaseOrder.create({
                data: {
                    poNumber,
                    status: po.status,
                    orderDate: createdAt,
                    deliveryDate,
                    notes: `PO ke ${suppliers[i % suppliers.length]?.name || "Supplier"}`,
                    subtotal: po.subtotal,
                    taxRate,
                    taxAmount,
                    total,
                    tenantId,
                    supplierId,
                    items: {
                        create: po.items.map((item) => ({
                            description: item.desc,
                            quantity: item.qty,
                            unitPrice: item.price,
                            total: item.qty * item.price,
                        })),
                    },
                },
            });
            purchaseOrders.push(created);
        }
        counts.purchaseOrders = purchaseOrders.length;

        // ─── EMPLOYEES ───────────────────────────────────────────────────────
        const employeeData = [
            { employeeId: "EMP-001", name: "Budi Santoso", email: "budi@company.co.id", phone: "0812-1111-2222", position: "Managing Director", department: "Direksi", salary: 25000000, joinDate: new Date("2020-01-15") },
            { employeeId: "EMP-002", name: "Siti Rahmawati", email: "siti@company.co.id", phone: "0813-2222-3333", position: "Finance Manager", department: "Keuangan", salary: 15000000, joinDate: new Date("2020-03-01") },
            { employeeId: "EMP-003", name: "Andi Prasetyo", email: "andi@company.co.id", phone: "0815-3333-4444", position: "Sales Manager", department: "Penjualan", salary: 14000000, joinDate: new Date("2020-06-15") },
            { employeeId: "EMP-004", name: "Rina Wulandari", email: "rina@company.co.id", phone: "0816-4444-5555", position: "HR Manager", department: "SDM", salary: 13000000, joinDate: new Date("2021-01-10") },
            { employeeId: "EMP-005", name: "Dedi Kurniawan", email: "dedi@company.co.id", phone: "0817-5555-6666", position: "Inventory Manager", department: "Gudang", salary: 12000000, joinDate: new Date("2021-04-20") },
            { employeeId: "EMP-006", name: "Maya Putri", email: "maya@company.co.id", phone: "0818-6666-7777", position: "Accountant", department: "Keuangan", salary: 8000000, joinDate: new Date("2021-07-01") },
            { employeeId: "EMP-007", name: "Hendra Wijaya", email: "hendra@company.co.id", phone: "0819-7777-8888", position: "Sales Executive", department: "Penjualan", salary: 7000000, joinDate: new Date("2022-01-15") },
            { employeeId: "EMP-008", name: "Linda Sari", email: "linda@company.co.id", phone: "0821-8888-9999", position: "Admin Officer", department: "SDM", salary: 5500000, joinDate: new Date("2022-03-01") },
            { employeeId: "EMP-009", name: "Rizki Pratama", email: "rizki@company.co.id", phone: "0822-9999-0000", position: "Warehouse Staff", department: "Gudang", salary: 4500000, joinDate: new Date("2022-06-15") },
            { employeeId: "EMP-010", name: "Andi Cahyono", email: "andi.c@company.co.id", phone: "0823-0000-1111", position: "Sales Executive", department: "Penjualan", salary: 7000000, joinDate: new Date("2023-01-10") },
            { employeeId: "EMP-011", name: "Sari Dewi", email: "sari@company.co.id", phone: "0824-1111-2222", position: "IT Support", department: "IT", salary: 8500000, joinDate: new Date("2023-04-01") },
            { employeeId: "EMP-012", name: "Fandi Ahmad", email: "fandi@company.co.id", phone: "0825-2222-3333", position: "Warehouse Staff", department: "Gudang", salary: 4500000, joinDate: new Date("2023-07-15") },
        ];

        const employees = [];
        for (const ed of employeeData) {
            const existing = await prisma.employee.findFirst({
                where: { employeeId: ed.employeeId, tenantId },
            });
            if (existing) {
                employees.push(existing);
            } else {
                const created = await prisma.employee.create({
                    data: { ...ed, tenantId },
                });
                employees.push(created);
            }
        }
        counts.employees = employees.length;

        // ─── ATTENDANCE RECORDS (5 hari terakhir untuk 5 karyawan pertama) ────
        let attendanceCount = 0;
        const activeEmployees = employees.filter((e) => e.status === "ACTIVE").slice(0, 5);

        for (let dayOffset = 1; dayOffset <= 5; dayOffset++) {
            const date = new Date();
            date.setDate(date.getDate() - dayOffset);
            // Skip weekends
            if (date.getDay() === 0 || date.getDay() === 6) continue;

            for (const emp of activeEmployees) {
                const existing = await prisma.attendanceRecord.findFirst({
                    where: { employeeId: emp.id, date, tenantId },
                });
                if (existing) continue;

                const isLate = Math.random() > 0.8;
                const clockIn = new Date(date);
                clockIn.setHours(isLate ? 8 : 7, isLate ? randomInt(5, 30) : randomInt(0, 29), 0);
                const clockOut = new Date(date);
                clockOut.setHours(17, randomInt(0, 30), 0);
                const workHours = parseFloat(((clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60)).toFixed(2));

                await prisma.attendanceRecord.create({
                    data: {
                        date,
                        clockIn,
                        clockOut,
                        status: isLate ? "LATE" : "PRESENT",
                        workHours,
                        tenantId,
                        employeeId: emp.id,
                    },
                });
                attendanceCount++;
            }
        }
        counts.attendanceRecords = attendanceCount;

        // ─── LEAVE REQUESTS ──────────────────────────────────────────────────
        const leaveData = [
            { type: "ANNUAL", daysAgoStart: 10, days: 2, status: "APPROVED", reason: "Acara keluarga" },
            { type: "SICK", daysAgoStart: 5, days: 1, status: "APPROVED", reason: "Sakit flu" },
            { type: "ANNUAL", daysAgoStart: 2, days: 3, status: "PENDING", reason: "Liburan" },
            { type: "PERSONAL", daysAgoStart: 1, days: 1, status: "PENDING", reason: "Urusan pribadi" },
        ];

        let leaveCount = 0;
        for (let i = 0; i < leaveData.length; i++) {
            const ld = leaveData[i];
            const empIdx = i % activeEmployees.length;
            const emp = activeEmployees[empIdx];

            const existing = await prisma.leaveRequest.findFirst({
                where: { employeeId: emp.id, reason: ld.reason, tenantId },
            });
            if (existing) continue;

            const startDate = new Date();
            startDate.setDate(startDate.getDate() - ld.daysAgoStart);
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + ld.days - 1);

            await prisma.leaveRequest.create({
                data: {
                    type: ld.type,
                    startDate,
                    endDate,
                    days: ld.days,
                    reason: ld.reason,
                    status: ld.status,
                    tenantId,
                    employeeId: emp.id,
                },
            });
            leaveCount++;
        }
        counts.leaveRequests = leaveCount;

        // ─── PAYROLL RECORDS ─────────────────────────────────────────────────
        let payrollCount = 0;
        const periods = ["2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09"];
        const selectedEmployees = activeEmployees.slice(0, 3);

        for (const emp of selectedEmployees) {
            // Pick 2 random periods for each employee
            const shuffledPeriods = periods.sort(() => Math.random() - 0.5).slice(0, 2);
            for (const period of shuffledPeriods) {
                const existing = await prisma.payrollRecord.findFirst({
                    where: { employeeId: emp.id, period, tenantId },
                });
                if (existing) continue;

                const baseSalary = parseFloat(emp.salary.toString());
                const allowances = parseFloat((baseSalary * 0.15).toFixed(2));
                const deductions = parseFloat((baseSalary * 0.1).toFixed(2));
                const bonus = parseFloat((baseSalary * randomDecimal(0, 0.1)).toFixed(2));
                const netSalary = parseFloat((baseSalary + allowances - deductions + bonus).toFixed(2));
                const isPaid = Math.random() > 0.3;

                await prisma.payrollRecord.create({
                    data: {
                        period,
                        baseSalary,
                        allowances,
                        deductions,
                        bonus,
                        netSalary,
                        status: isPaid ? "PAID" : "PENDING",
                        paidAt: isPaid ? new Date() : null,
                        notes: `Gaji bulan ${period}`,
                        tenantId,
                        employeeId: emp.id,
                    },
                });
                payrollCount++;
            }
        }
        counts.payrollRecords = payrollCount;

        return {
            success: true,
            message: "Demo data berhasil dimuat!",
            counts,
        };
    } catch (error) {
        console.error("[Demo Seed] Error:", error);
        return {
            success: false,
            message: error instanceof Error ? error.message : "Gagal memuat demo data",
            counts,
        };
    }
}

/**
 * Check if a tenant already has data (contacts, products, invoices, etc.)
 */
export async function tenantHasData(tenantId: string): Promise<boolean> {
    const [contactCount, productCount, invoiceCount] = await Promise.all([
        prisma.contact.count({ where: { tenantId } }),
        prisma.product.count({ where: { tenantId } }),
        prisma.invoice.count({ where: { tenantId } }),
    ]);
    return contactCount > 0 || productCount > 0 || invoiceCount > 0;
}
