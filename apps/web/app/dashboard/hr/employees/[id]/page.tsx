'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/utils'

interface EmployeeDetail {
    id: string
    firstName: string
    lastName: string
    email: string
    phone: string
    department: string
    position: string
    joinDate: string
    status: string
    salary: number
    address: string
    emergencyContact: string
    emergencyPhone: string
    skills: string[]
    performance: { rating: number; lastReview: string }
}

const statusConfig: Record<string, { label: string; color: string }> = {
    active: { label: 'Aktif', color: 'bg-green-100 text-green-800' },
    inactive: { label: 'Tidak Aktif', color: 'bg-red-100 text-red-800' },
    probation: { label: 'Masa Percobaan', color: 'bg-yellow-100 text-yellow-800' },
}

export default function EmployeeDetailPage({ params }: { params: { id: string } }) {
    const [employee, setEmployee] = useState<EmployeeDetail | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchEmployee = async () => {
            try {
                const response = await fetch(`/api/hr/employees/${params.id}`)
                const data = await response.json()
                if (data.success) {
                    setEmployee(data.data)
                } else {
                    setError('Karyawan tidak ditemukan')
                }
            } catch {
                setError('Gagal memuat data karyawan')
            } finally {
                setLoading(false)
            }
        }
        fetchEmployee()
    }, [params.id])

    if (loading) {
        return (
            <div className="p-6">
                <div className="h-6 w-32 animate-pulse rounded bg-gray-200" />
                <div className="mt-4 h-48 animate-pulse rounded-xl bg-gray-100" />
            </div>
        )
    }

    if (error || !employee) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="text-center">
                    <p className="text-lg text-gray-600">{error || 'Data tidak tersedia'}</p>
                    <Link href="/dashboard/hr/employees" className="mt-4 inline-block text-blue-600 hover:text-blue-800">
                        ← Kembali ke Karyawan
                    </Link>
                </div>
            </div>
        )
    }

    const statusInfo = statusConfig[employee.status] || { label: employee.status, color: 'bg-gray-100 text-gray-800' }
    const fullName = `${employee.firstName} ${employee.lastName}`

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div>
                <Link href="/dashboard/hr/employees" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
                    ← Kembali ke Karyawan
                </Link>
                <div className="mt-4 flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-600">
                        {employee.firstName[0]}{employee.lastName[0]}
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{fullName}</h1>
                        <p className="text-sm text-gray-500">{employee.position} • {employee.department}</p>
                    </div>
                    <span className={`ml-auto inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${statusInfo.color}`}>
                        {statusInfo.label}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Main Info */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Personal Info */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h3 className="text-lg font-semibold text-gray-900">Informasi Pribadi</h3>
                        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <p className="text-sm text-gray-500">Email</p>
                                <p className="font-medium text-gray-900">{employee.email}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Telepon</p>
                                <p className="font-medium text-gray-900">{employee.phone}</p>
                            </div>
                            <div className="sm:col-span-2">
                                <p className="text-sm text-gray-500">Alamat</p>
                                <p className="font-medium text-gray-900">{employee.address}</p>
                            </div>
                        </div>
                    </div>

                    {/* Emergency Contact */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h3 className="text-lg font-semibold text-gray-900">Kontak Darurat</h3>
                        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <p className="text-sm text-gray-500">Nama</p>
                                <p className="font-medium text-gray-900">{employee.emergencyContact}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Telepon</p>
                                <p className="font-medium text-gray-900">{employee.emergencyPhone}</p>
                            </div>
                        </div>
                    </div>

                    {/* Skills */}
                    {employee.skills.length > 0 && (
                        <div className="rounded-xl border border-gray-200 bg-white p-6">
                            <h3 className="text-lg font-semibold text-gray-900">Keahlian</h3>
                            <div className="mt-4 flex flex-wrap gap-2">
                                {employee.skills.map((skill) => (
                                    <span key={skill} className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
                                        {skill}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Work Info */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h3 className="text-lg font-semibold text-gray-900">Informasi Kerja</h3>
                        <div className="mt-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-500">Departemen</span>
                                <span className="text-sm font-medium text-gray-900">{employee.department}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-500">Posisi</span>
                                <span className="text-sm font-medium text-gray-900">{employee.position}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-500">Tanggal Masuk</span>
                                <span className="text-sm text-gray-900">{formatDate(employee.joinDate)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-500">ID Karyawan</span>
                                <span className="font-mono text-sm text-gray-900">{employee.id}</span>
                            </div>
                        </div>
                    </div>

                    {/* Compensation */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h3 className="text-lg font-semibold text-gray-900">Kompensasi</h3>
                        <div className="mt-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-500">Gaji Pokok</span>
                                <span className="text-sm font-medium text-gray-900">{formatCurrency(employee.salary)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-500">THR</span>
                                <span className="text-sm font-medium text-gray-900">{formatCurrency(employee.salary)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-500">BPJS</span>
                                <span className="text-sm font-medium text-green-600">✓ Full Coverage</span>
                            </div>
                        </div>
                    </div>

                    {/* Performance */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h3 className="text-lg font-semibold text-gray-900">Performa</h3>
                        <div className="mt-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-500">Rating</span>
                                <span className="text-lg font-bold text-yellow-500">
                                    {'⭐'.repeat(Math.round(employee.performance.rating))} {employee.performance.rating}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-500">Review Terakhir</span>
                                <span className="text-sm text-gray-900">{formatDate(employee.performance.lastReview)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h3 className="text-lg font-semibold text-gray-900">Aksi</h3>
                        <div className="mt-4 space-y-3">
                            <button className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                                ✏️ Edit Profil
                            </button>
                            <button className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                                📄 Lihat Slip Gaji
                            </button>
                            <button className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                                📊 Riwayat Kehadiran
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
