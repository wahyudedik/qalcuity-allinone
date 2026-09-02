import Link from 'next/link'

export const metadata = {
    title: 'Syarat & Ketentuan - Qalcuity',
    description: 'Syarat dan ketentuan penggunaan platform Qalcuity',
}

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-4xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
                    <Link href="/" className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                            <span className="text-white font-bold text-xl">Q</span>
                        </div>
                        <span className="text-2xl font-bold text-gray-900">Qalcuity</span>
                    </Link>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Syarat & Ketentuan</h1>
                <p className="text-sm text-gray-500 mb-8">Terakhir diperbarui: 31 Agustus 2026</p>

                <div className="prose prose-gray max-w-none space-y-8">
                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Penerimaan Syarat</h2>
                        <p className="text-gray-600 leading-relaxed">
                            Dengan mengakses dan menggunakan platform Qalcuity ("Platform"), Anda setuju untuk terikat oleh Syarat dan Ketentuan ini. Jika Anda tidak setuju dengan syarat ini, mohon untuk tidak menggunakan Platform ini.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Deskripsi Layanan</h2>
                        <p className="text-gray-600 leading-relaxed">
                            Qalcuity adalah platform Business Operating System all-in-one yang menyediakan modul-modul bisnis termasuk namun tidak terbatas pada: Finance & Accounting, Sales & CRM, Human Resources, Inventory Management, dan layanan-layanan terkait lainnya.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Pendaftaran Akun</h2>
                        <p className="text-gray-600 leading-relaxed">
                            Untuk menggunakan Platform, Anda harus membuat akun dengan memberikan informasi yang akurat dan lengkap. Anda bertanggung jawab untuk menjaga kerahasiaan kredensial akun Anda dan untuk semua aktivitas yang terjadi di bawah akun Anda.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Penggunaan yang Dilarang</h2>
                        <p className="text-gray-600 leading-relaxed">
                            Anda tidak diperbolehkan untuk:
                        </p>
                        <ul className="list-disc list-inside text-gray-600 space-y-1 mt-2">
                            <li>Menggunakan Platform untuk tujuan ilegal atau tidak sah</li>
                            <li>Mencoba mendapatkan akses tidak sah ke sistem atau data pengguna lain</li>
                            <li>Mengganggu atau merusak integritas atau kinerja Platform</li>
                            <li>Menggunakan bot, scraper, atau metode otomasi lainnya tanpa izin tertulis</li>
                            <li>Meneruskan virus atau kode berbahaya lainnya</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Privasi dan Data</h2>
                        <p className="text-gray-600 leading-relaxed">
                            Penggunaan data Anda diatur oleh <Link href="/privacy" className="text-blue-600 hover:text-blue-700">Kebijakan Privasi</Link> kami. Kami berkomitmen untuk melindungi data bisnis dan pribadi Anda sesuai dengan peraturan perundang-undangan yang berlaku, termasuk Undang-Undang Pelindungan Data Pribadi (UU PDP).
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Pembayaran dan Langganan</h2>
                        <p className="text-gray-600 leading-relaxed">
                            Beberapa fitur Platform memerlukan langganan berbayar. Harga dan ketentuan pembayaran akan ditampilkan di halaman harga. Pembatalan langganan dapat dilakukan kapan saja, dan akses akan berakhir pada akhir periode penagihan yang sedang berjalan.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Hak Kekayaan Intelektual</h2>
                        <p className="text-gray-600 leading-relaxed">
                            Seluruh konten, fitur, dan fungsionalitas Platform adalah milik Qalcuity dan dilindungi oleh hukum hak cipta, merek dagang, dan hak kekayaan intelektual lainnya.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Pembatasan Tanggung Jawab</h2>
                        <p className="text-gray-600 leading-relaxed">
                            Qalcuity tidak bertanggung jawab atas kerugian tidak langsung, insidental, khusus, konsekuensial, atau hukuman yang timbul dari penggunaan Platform. Kami menyediakan Platform "sebagaimana adanya" tanpa jaminan apapun.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Perubahan Ketentuan</h2>
                        <p className="text-gray-600 leading-relaxed">
                            Kami berhak untuk memperbarui Syarat dan Ketentuan ini sewaktu-waktu. Perubahan akan berlaku setelah dipublikasikan di Platform. Penggunaan berkelanjutan Anda setelah perubahan merupakan penerimaan Anda terhadap ketentuan yang diperbarui.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Kontak</h2>
                        <p className="text-gray-600 leading-relaxed">
                            Jika Anda memiliki pertanyaan tentang Syarat dan Ketentuan ini, silakan hubungi kami melalui email di <a href="mailto:support@qalcuity.com" className="text-blue-600 hover:text-blue-700">support@qalcuity.com</a>.
                        </p>
                    </section>
                </div>

                <div className="mt-12 pt-8 border-t border-gray-200 text-center">
                    <Link href="/register" className="text-blue-600 hover:text-blue-700 font-medium">
                        ← Kembali ke Pendaftaran
                    </Link>
                </div>
            </div>
        </div>
    )
}
