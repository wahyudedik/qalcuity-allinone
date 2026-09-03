'use client'

import { useState } from 'react'
import { Send, Mail, FileText, Loader2, X } from 'lucide-react'

interface EmailComposeProps {
    to?: string
    subject?: string
    entityType?: 'CONTACT' | 'LEAD' | 'DEAL'
    entityId?: string
    onClose?: () => void
    onSent?: () => void
}

const templates = [
    { id: '', label: 'Tanpa Template' },
    { id: 'welcome', label: 'Selamat Datang', subject: 'Selamat Datang dari Qalcuity', body: 'Yth. {{nama}},\n\nSelamat datang di Qalcuity. Kami senang dapat bekerja sama dengan Anda.\n\nJika ada pertanyaan, jangan ragu untuk menghubungi kami.\n\nHormat kami,\nTim Qalcuity' },
    { id: 'followup', label: 'Follow-up', subject: 'Follow-up: Penawaran Kami', body: 'Yth. {{nama}},\n\nKami ingin menindaklanjuti diskusi kita sebelumnya mengenai penawaran kami.\n\nApakah ada pertanyaan atau hal yang perlu kami jelaskan lebih lanjut?\n\nKami tunggu kabar dari Anda.\n\nHormat kami,\nTim Qalcuity' },
    { id: 'proposal', label: 'Penawaran', subject: 'Penawaran Kerja Sama', body: 'Yth. {{nama}},\n\nBersama ini kami kirimkan penawaran kerja sama dari Qalcuity.\n\nDetail penawaran:\n- Layanan: Qalcuity Business Operating System\n- Harga: Sesuai proposal terlampir\n- Berlaku: 30 hari sejak tanggal email ini\n\nSilakan hubungi kami untuk diskusi lebih lanjut.\n\nHormat kami,\nTim Qalcuity' },
]

export function EmailCompose({ to = '', subject = '', entityType, entityId, onClose, onSent }: EmailComposeProps) {
    const [formData, setFormData] = useState({
        to,
        subject,
        body: '',
    })
    const [sending, setSending] = useState(false)
    const [sent, setSent] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [selectedTemplate, setSelectedTemplate] = useState('')

    const handleTemplateChange = (templateId: string) => {
        setSelectedTemplate(templateId)
        const template = templates.find((t) => t.id === templateId)
        if (template && templateId) {
            setFormData({
                ...formData,
                subject: template.subject || '',
                body: template.body || '',
            })
        }
    }

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.to.trim() || !formData.subject.trim() || !formData.body.trim()) return

        try {
            setSending(true)
            setError(null)

            const res = await fetch('/api/crm/emails', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: formData.to,
                    subject: formData.subject,
                    body: formData.body,
                    entityType,
                    entityId,
                }),
            })

            const data = await res.json()
            if (data.success) {
                setSent(true)
                onSent?.()
                setTimeout(() => {
                    onClose?.()
                }, 2000)
            } else {
                setError(data.error || 'Gagal mengirim email')
            }
        } catch {
            setError('Gagal mengirim email. Silakan coba lagi.')
        } finally {
            setSending(false)
        }
    }

    if (sent) {
        return (
            <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center">
                <Mail className="mx-auto h-12 w-12 text-green-600" />
                <h3 className="mt-3 text-lg font-semibold text-green-800">Email Terkirim!</h3>
                <p className="mt-1 text-sm text-green-600">
                    Email berhasil dikirim ke {formData.to}
                </p>
            </div>
        )
    }

    return (
        <div className="rounded-xl border border-gray-200 bg-white">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
                <div className="flex items-center gap-2">
                    <Mail className="h-5 w-5 text-blue-600" />
                    <h3 className="text-sm font-semibold text-gray-900">Kirim Email</h3>
                </div>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>

            {/* Form */}
            <form onSubmit={handleSend} className="p-4 space-y-3">
                {error && (
                    <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                        {error}
                    </div>
                )}

                {/* Template Selector */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        <FileText className="inline h-4 w-4 mr-1" />
                        Template
                    </label>
                    <select
                        value={selectedTemplate}
                        onChange={(e) => handleTemplateChange(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                        {templates.map((t) => (
                            <option key={t.id} value={t.id}>{t.label}</option>
                        ))}
                    </select>
                </div>

                {/* To */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Kepada *</label>
                    <input
                        type="email"
                        value={formData.to}
                        onChange={(e) => setFormData({ ...formData, to: e.target.value })}
                        placeholder="email@contoh.com"
                        required
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                </div>

                {/* Subject */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subjek *</label>
                    <input
                        type="text"
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        placeholder="Subjek email"
                        required
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                </div>

                {/* Body */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Isi Email *</label>
                    <textarea
                        value={formData.body}
                        onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                        placeholder="Tulis isi email di sini..."
                        rows={8}
                        required
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-2">
                    {onClose && (
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                            Batal
                        </button>
                    )}
                    <button
                        type="submit"
                        disabled={sending || !formData.to.trim() || !formData.subject.trim() || !formData.body.trim()}
                        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                        {sending ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Mengirim...
                            </>
                        ) : (
                            <>
                                <Send className="h-4 w-4" />
                                Kirim Email
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    )
}
