import Link from 'next/link'

export const metadata = {
    title: 'Kebijakan Privasi - Qalcuity',
    description: 'Kebijakan privasi dan perlindungan data platform Qalcuity',
}

export default function PrivacyPage() {
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
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Kebijakan Privasi</h1>
                <p className="text-sm text-gray-500 mb-8">Terakhir diperbarui: 31 Agustus 2026</p>

                <div className="prose prose-gray max-w-none space-y-8">
                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Pendahuluan</h2>
                        <p className="text-gray-600 leading-relaxed">
                            Qalcuity ("kami", "kita", atau "Platform"); berkomitmen untuk melindungi privasi dan data pribadi pengguna kami. Kebijakan Privasi ini menjelaskan bagaimana kami mengumpulkan, menggunakan, menyimpan, dan melindungi informasi Anda sesuai dengan Undang-Undang Pelindungan Data Pribadi (UU PDP) dan peraturan perundang-undangan lainnya yang berlaku.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Informasi yang Kami Kumpulkan</h2>
                        <p className="text-gray-600 leading-relaxed">
                            Kami mengumpulkan informasi berikut:
                        </p>
                        <ul className="list-disc list-inside text-gray-600 space-y-1 mt-2">
                            <li><strong>Informasi Akun:</strong> Nama, email, nama perusahaan, dan kata sandi saat pendaftaran</li>
                            <li><strong>Data Bisnis:</strong> Informasi kontak pelanggan, transaksi, invoice, dan data bisnis lainnya yang Anda masukkan ke Platform</li>
                            <li><strong>Data Penggunaan:</strong> Log aktivitas, halaman yang dikunjungi, dan fitur yang digunakan</li>
                            <li><strong>Informasi Perangkat:</strong> Alamat IP, jenis browser, sistem operasi, dan perangkat yang digunakan</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Penggunaan Informasi</h2>
                        <p className="text-gray-600 leading-relaxed">
                            Kami menggunakan informasi yang dikumpulkan untuk:
                        </p>
                        <ul className="list-disc list-inside text-gray-600 space-y-1 mt-2">
                            <li>Menyediakan dan memelihara layanan Platform</li>
                            <li>Memproses transaksi dan mengelola langganan Anda</li>
                            <li>Mengirimkan notifikasi terkait akun dan layanan</li>
                            <li>Meningkatkan kualitas layanan dan pengalaman pengguna</li>
                            <li>Memastikan keamanan dan mencegah penyalahgunaan</li>
                            <li>Mematuhi kewajiban hukum dan regulasi</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Penyimpanan dan Keamanan Data</h2>
                        <p className="text-gray-600 leading-relaxed">
                            Data Anda disimpan di server yang aman di Indonesia dengan enkripsi AES-256 untuk data at rest dan TLS 1.3 untuk data in transit. Kami menerapkan langkah-langkah keamanan teknis dan organisasi yang sesuai untuk melindungi data Anda dari akses tidak sah, perubahan, pengungkapan, atau penghancuran.
                        </p>
                        <ul className="list-disc list-inside text-gray-600 space-y-1 mt-2">
                            <li>Enkripsi AES-256 untuk data at rest</li>
                            <li>TLS 1.3 untuk data in transit</li>
                            <li>Backup otomatis harian dengan retensi 30 hari</li>
                            <li>Akses terbatas berdasarkan prinsip least privilege</li>
                            <li>Monitoring dan audit trail untuk semua aktivitas</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Berbagi Data</h2>
                        <p className="text-gray-600 leading-relaxed">
                            Kami tidak menjual atau menyewakan data pribadi Anda kepada pihak ketiga. Data Anda hanya dapat dibagikan dengan:
                        </p>
                        <ul className="list-disc list-inside text-gray-600 space-y-1 mt-2">
                            <li>Penyedia layanan infrastruktur yang membantu operasional Platform</li>
                            <li>Pihak berwenang sesuai kewajiban hukum yang berlaku</li>
                            <li>Pihak ketiga yang telah mendapat persetujuan eksplisit dari Anda</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Hak Pengguna</h2>
                        <p className="text-gray-600 leading-relaxed">
                            Berdasarkan UU PDP, Anda memiliki hak untuk:
                        </p>
                        <ul className="list-disc list-inside text-gray-600 space-y-1 mt-2">
                            <li><strong>Hak Informasi:</strong> Mengetahui bagaimana data Anda digunakan</li>
                            <li><strong>Hak Akses:</strong> Mendapatkan salinan data pribadi Anda</li>
                            <li><strong>Hak Koreksi:</strong> Memperbaiki data yang tidak akurat</li>
                            <li><strong>Hak Penghapusan:</strong> Meminta penghapusan data pribadi Anda</li>
                            <li><strong>Hak Portabilitas:</strong> Menerima data dalam format yang dapat dibaca mesin</li>
                            <li><strong>Hak Keberatan:</strong> Menolak pemrosesan data tertentu</li>
                            <li><strong>Hak Penarikan Persetujuan:</strong> Menarik persetujuan yang telah diberikan</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Retensi Data</h2>
                        <p className="text-gray-600 leading-relaxed">
                            Kami menyimpan data Anda selama akun Anda aktif atau selama diperlukan untuk menyediakan layanan. Jika Anda menghapus akun, kami akan menghapus data pribadi Anda dalam waktu 30 hari, kecuali jika penyimpanan lebih lama diperlukan oleh hukum yang berlaku.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Cookie</h2>
                        <p className="text-gray-600 leading-relaxed">
                            Platform kami menggunakan cookie dan teknologi serupa untuk mempertahankan sesi login, mengingat preferensi Anda, dan meningkatkan pengalaman pengguna. Anda dapat mengatur preferensi cookie melalui pengaturan browser Anda.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Perubahan Kebijakan</h2>
                        <p className="text-gray-600 leading-relaxed">
                            Kami dapat memperbarui Kebijakan Privasi ini dari waktu ke waktu. Perubahan akan dipublikasikan di halaman ini dengan tanggal pembaruan. Kami menyarankan Anda untuk memeriksa halaman ini secara berkala.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Kontak</h2>
                        <p className="text-gray-600 leading-relaxed">
                            Untuk pertanyaan mengenai Kebijakan Privasi atau hak-hak Anda terkait data pribadi, silakan hubungi kami melalui email di <a href="mailto:privacy@qalcuity.com" className="text-blue-600 hover:text-blue-700">privacy@qalcuity.com</a>.
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
