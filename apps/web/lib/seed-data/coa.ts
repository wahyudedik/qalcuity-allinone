/**
 * Chart of Accounts (CoA) Seed Data
 * Standard Indonesian CoA Structure
 *
 * Karena tidak ada Prisma model untuk CoA (production safety rule),
 * data ini di-export sebagai JSON constant yang di-import oleh API route.
 */

export interface CoAAccount {
    id: string
    code: string
    name: string
    type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE'
    parentId: string | null
    description: string
    balance: number
    isActive: boolean
}

export const COA_ACCOUNTS: CoAAccount[] = [
    // ─── AKTIVA (Assets) ──────────────────────
    { id: '1', code: '1000', name: 'AKTIVA', type: 'ASSET', parentId: null, description: 'Total Aktiva', balance: 0, isActive: true },
    { id: '2', code: '1100', name: 'Kas & Bank', type: 'ASSET', parentId: '1', description: 'Kas dan setara kas', balance: 0, isActive: true },
    { id: '3', code: '1101', name: 'Kas Perusahaan', type: 'ASSET', parentId: '2', description: 'Kas tunai perusahaan', balance: 45000000, isActive: true },
    { id: '4', code: '1102', name: 'Bank BCA', type: 'ASSET', parentId: '2', description: 'Rekening BCA', balance: 125000000, isActive: true },
    { id: '5', code: '1103', name: 'Bank Mandiri', type: 'ASSET', parentId: '2', description: 'Rekening Mandiri', balance: 78500000, isActive: true },
    { id: '6', code: '1200', name: 'Piutang', type: 'ASSET', parentId: '1', description: 'Piutang usaha', balance: 0, isActive: true },
    { id: '7', code: '1201', name: 'Piutang Dagang', type: 'ASSET', parentId: '6', description: 'Piutang dari penjualan', balance: 85000000, isActive: true },
    { id: '8', code: '1202', name: 'Piutang Pajak', type: 'ASSET', parentId: '6', description: 'Pajak masukan (claimable)', balance: 12000000, isActive: true },
    { id: '9', code: '1300', name: 'Persediaan', type: 'ASSET', parentId: '1', description: 'Persediaan barang dagang', balance: 0, isActive: true },
    { id: '10', code: '1301', name: 'Persediaan Barang', type: 'ASSET', parentId: '9', description: 'Persediaan barang dagang', balance: 250000000, isActive: true },
    { id: '11', code: '1400', name: 'Aktiva Tetap', type: 'ASSET', parentId: '1', description: 'Aset tetap berwujud', balance: 0, isActive: true },
    { id: '12', code: '1401', name: 'Peralatan Kantor', type: 'ASSET', parentId: '11', description: 'Peralatan dan perlengkapan kantor', balance: 85000000, isActive: true },
    { id: '13', code: '1402', name: 'Kendaraan', type: 'ASSET', parentId: '11', description: 'Kendaraan operasional', balance: 350000000, isActive: true },
    { id: '14', code: '1403', name: 'Akumulasi Depresiasi', type: 'ASSET', parentId: '11', description: 'Akumulasi depresiasi aset tetap', balance: -125000000, isActive: true },

    // ─── PASIVA (Liabilities) ─────────────────
    { id: '15', code: '2000', name: 'PASIVA', type: 'LIABILITY', parentId: null, description: 'Total Kewajiban', balance: 0, isActive: true },
    { id: '16', code: '2100', name: 'Utang Lancar', type: 'LIABILITY', parentId: '15', description: 'Kewajiban jangka pendek', balance: 0, isActive: true },
    { id: '17', code: '2101', name: 'Utang Dagang', type: 'LIABILITY', parentId: '16', description: 'Utang ke supplier', balance: 65000000, isActive: true },
    { id: '18', code: '2102', name: 'Utang Pajak', type: 'LIABILITY', parentId: '16', description: 'PPN keluaran', balance: 8500000, isActive: true },
    { id: '19', code: '2103', name: 'Utang Gaji', type: 'LIABILITY', parentId: '16', description: 'Gaji yang belum dibayar', balance: 22000000, isActive: true },
    { id: '20', code: '2200', name: 'Utang Jangka Panjang', type: 'LIABILITY', parentId: '15', description: 'Kewajiban jangka panjang', balance: 0, isActive: true },
    { id: '21', code: '2201', name: 'Utang Bank (Kredit)', type: 'LIABILITY', parentId: '20', description: 'Pinjaman bank jangka panjang', balance: 500000000, isActive: true },

    // ─── MODAL (Equity) ───────────────────────
    { id: '22', code: '3000', name: 'MODAL', type: 'EQUITY', parentId: null, description: 'Total Ekuitas', balance: 0, isActive: true },
    { id: '23', code: '3100', name: 'Modal Disetor', type: 'EQUITY', parentId: '22', description: 'Modal yang disetor pemilik', balance: 500000000, isActive: true },
    { id: '24', code: '3200', name: 'Laba Ditahan', type: 'EQUITY', parentId: '22', description: 'Laba yang ditahan', balance: 180000000, isActive: true },
    { id: '25', code: '3300', name: 'Laba Berjalan', type: 'EQUITY', parentId: '22', description: 'Laba/ rugi periode berjalan', balance: 45000000, isActive: true },

    // ─── PENDAPATAN (Revenue) ─────────────────
    { id: '26', code: '4000', name: 'PENDAPATAN', type: 'REVENUE', parentId: null, description: 'Total Pendapatan', balance: 0, isActive: true },
    { id: '27', code: '4100', name: 'Pendapatan Penjualan', type: 'REVENUE', parentId: '26', description: 'Pendapatan dari penjualan', balance: 0, isActive: true },
    { id: '28', code: '4101', name: 'Penjualan Produk', type: 'REVENUE', parentId: '27', description: 'Pendapatan penjualan barang', balance: 450000000, isActive: true },
    { id: '29', code: '4102', name: 'Penjualan Jasa', type: 'REVENUE', parentId: '27', description: 'Pendapatan penjualan jasa', balance: 125000000, isActive: true },
    { id: '30', code: '4200', name: 'Pendapatan Lain', type: 'REVENUE', parentId: '26', description: 'Pendapatan di luar usaha', balance: 0, isActive: true },
    { id: '31', code: '4201', name: 'Pendapatan Bunga', type: 'REVENUE', parentId: '30', description: 'Pendapatan bunga bank', balance: 2500000, isActive: true },

    // ─── BEBAN (Expenses) ─────────────────────
    { id: '32', code: '5000', name: 'BEBAN', type: 'EXPENSE', parentId: null, description: 'Total Beban', balance: 0, isActive: true },
    { id: '33', code: '5100', name: 'Beban Pokok Penjualan', type: 'EXPENSE', parentId: '32', description: 'Harga pokok penjualan', balance: 0, isActive: true },
    { id: '34', code: '5101', name: 'Harga Pokok Penjualan', type: 'EXPENSE', parentId: '33', description: 'COGS', balance: 280000000, isActive: true },
    { id: '35', code: '5200', name: 'Beban Operasional', type: 'EXPENSE', parentId: '32', description: 'Beban operasional harian', balance: 0, isActive: true },
    { id: '36', code: '5201', name: 'Gaji & Tunjangan', type: 'EXPENSE', parentId: '35', description: 'Gaji karyawan dan tunjangan', balance: 95000000, isActive: true },
    { id: '37', code: '5202', name: 'Sewa Kantor', type: 'EXPENSE', parentId: '35', description: 'Sewa gedung kantor', balance: 36000000, isActive: true },
    { id: '38', code: '5203', name: 'Listrik & Internet', type: 'EXPENSE', parentId: '35', description: 'Biaya listrik dan internet', balance: 8500000, isActive: true },
    { id: '39', code: '5300', name: 'Beban Pemasaran', type: 'EXPENSE', parentId: '32', description: 'Biaya pemasaran dan promosi', balance: 0, isActive: true },
    { id: '40', code: '5301', name: 'Biaya Marketing', type: 'EXPENSE', parentId: '39', description: 'Biaya iklan dan promosi', balance: 15000000, isActive: true },
    { id: '41', code: '5400', name: 'Beban Lain', type: 'EXPENSE', parentId: '32', description: 'Beban di luar operasional', balance: 0, isActive: true },
    { id: '42', code: '5401', name: 'Biaya Depresiasi', type: 'EXPENSE', parentId: '41', description: 'Depresiasi aset tetap', balance: 12500000, isActive: true },
    { id: '43', code: '5402', name: 'Biaya Bunga', type: 'EXPENSE', parentId: '41', description: 'Bunga pinjaman bank', balance: 5000000, isActive: true },
    { id: '44', code: '5403', name: 'Biaya Admin Bank', type: 'EXPENSE', parentId: '41', description: 'Biaya administrasi bank', balance: 1200000, isActive: true },
]
