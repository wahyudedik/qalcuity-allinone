'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from '@/lib/i18n'
import { SOD_MODULE, SOD_ACTION } from '@/lib/sod-constants'
import { ShieldCheck, Plus, Trash2, Loader2, X, Pencil, Power, PowerOff, Search, FileText } from 'lucide-react'

export type SoDRule = {
    id: string
    name: string
    description: string | null
    role1: string
    role2: string
    module: string
    action: string | null
    enabled: boolean
    createdAt: string
    updatedAt: string
}

type RuleForm = {
    name: string
    description: string
    role1: string
    role2: string
    module: string
    action: string
    enabled: boolean
}

const ROLE_OPTIONS = ['SUPERADMIN', 'ADMIN', 'MEMBER', 'VIEWER']

const MODULE_OPTIONS: { value: string; label: string }[] = Object.values(SOD_MODULE).map((v) => ({ value: v, label: v }))

const ACTION_OPTIONS: { value: string; label: string }[] = Object.values(SOD_ACTION).map((v) => ({ value: v, label: v }))

/** Extract human-readable error from API response (string or { code, message } shape). */
function extractError(data: { error?: unknown } | null | undefined, fallback: string): string {
    if (!data || data.error === undefined || data.error === null) return fallback
    if (typeof data.error === 'string' && data.error) return data.error
    if (typeof data.error === 'object' && 'message' in data.error) {
        const msg = (data.error as { message?: unknown }).message
        if (typeof msg === 'string' && msg) return msg
    }
    return fallback
}

export default function SoDRulesTab({ onToast }: { onToast: (message: string, type: 'success' | 'error') => void }) {
    const { t } = useTranslation()
    const [rules, setRules] = useState<SoDRule[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [search, setSearch] = useState('')
    const [filterModule, setFilterModule] = useState('')
    const [filterEnabled, setFilterEnabled] = useState('')
    const [modalOpen, setModalOpen] = useState(false)
    const [editing, setEditing] = useState<SoDRule | null>(null)
    const [form, setForm] = useState<RuleForm>({
        name: '',
        description: '',
        role1: 'ADMIN',
        role2: 'MEMBER',
        module: MODULE_OPTIONS[0]?.value ?? SOD_MODULE.FINANCE,
        action: '',
        enabled: true,
    })
    const [saving, setSaving] = useState(false)
    const [deleting, setDeleting] = useState<string | null>(null)
    const [toggling, setToggling] = useState<string | null>(null)

    const fetchRules = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            const params = new URLSearchParams()
            if (filterModule) params.set('module', filterModule)
            if (filterEnabled) params.set('enabled', filterEnabled)
            const qs = params.toString()
            const res = await fetch(`/api/finance/sod-rules${qs ? `?${qs}` : ''}`)
            const data = await res.json()
            if (data.success) {
                setRules(Array.isArray(data.data) ? data.data : [])
            } else {
                setError(extractError(data, t('settings.sod.rules.loadFailed')))
            }
        } catch {
            setError(t('settings.sod.rules.connectFailed'))
        } finally {
            setLoading(false)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filterModule, filterEnabled])

    useEffect(() => {
        fetchRules()
    }, [fetchRules])

    const filteredRules = rules.filter((r) => {
        if (!search.trim()) return true
        const q = search.toLowerCase()
        return (
            r.name.toLowerCase().includes(q) ||
            r.role1.toLowerCase().includes(q) ||
            r.role2.toLowerCase().includes(q) ||
            (r.description ?? '').toLowerCase().includes(q)
        )
    })

    const openCreate = () => {
        setEditing(null)
        setForm({
            name: '',
            description: '',
            role1: 'ADMIN',
            role2: 'MEMBER',
            module: MODULE_OPTIONS[0]?.value ?? SOD_MODULE.FINANCE,
            action: '',
            enabled: true,
        })
        setModalOpen(true)
    }

    const openEdit = (rule: SoDRule) => {
        setEditing(rule)
        setForm({
            name: rule.name,
            description: rule.description ?? '',
            role1: rule.role1,
            role2: rule.role2,
            module: rule.module,
            action: rule.action ?? '',
            enabled: rule.enabled,
        })
        setModalOpen(true)
    }

    const handleSubmit = async () => {
        if (!form.name.trim()) {
            onToast(t('settings.sod.rules.nameRequired'), 'error')
            return
        }
        if (form.role1 === form.role2) {
            onToast(t('settings.sod.rules.rolesMustDiffer'), 'error')
            return
        }

        setSaving(true)
        try {
            const body = {
                name: form.name.trim(),
                description: form.description.trim() || null,
                role1: form.role1,
                role2: form.role2,
                module: form.module,
                action: form.action || null,
                enabled: form.enabled,
            }
            const res = await fetch(
                editing ? `/api/finance/sod-rules/${editing.id}` : '/api/finance/sod-rules',
                {
                    method: editing ? 'PUT' : 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                }
            )
            const data = await res.json()
            if (data.success) {
                onToast(editing ? t('settings.sod.rules.updateSuccess') : t('settings.sod.rules.createSuccess'), 'success')
                setModalOpen(false)
                fetchRules()
            } else {
                onToast(extractError(data, t('settings.sod.rules.saveFailed')), 'error')
            }
        } catch {
            onToast(t('settings.sod.rules.connectFailed'), 'error')
        } finally {
            setSaving(false)
        }
    }

    const handleToggle = async (rule: SoDRule) => {
        setToggling(rule.id)
        try {
            const res = await fetch(`/api/finance/sod-rules/${rule.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enabled: !rule.enabled }),
            })
            const data = await res.json()
            if (data.success) {
                onToast(rule.enabled ? t('settings.sod.rules.disabledMsg') : t('settings.sod.rules.enabledMsg'), 'success')
                fetchRules()
            } else {
                onToast(extractError(data, t('settings.sod.rules.saveFailed')), 'error')
            }
        } catch {
            onToast(t('settings.sod.rules.connectFailed'), 'error')
        } finally {
            setToggling(null)
        }
    }

    const handleDelete = async (rule: SoDRule) => {
        if (!confirm(t('settings.sod.rules.deleteConfirmMsg').replace('{name}', rule.name))) return

        setDeleting(rule.id)
        try {
            const res = await fetch(`/api/finance/sod-rules/${rule.id}`, { method: 'DELETE' })
            const data = await res.json()
            if (data.success) {
                onToast(t('settings.sod.rules.deleteSuccess'), 'success')
                fetchRules()
            } else {
                // 409 — rule masih punya exception aktif; pesan dari backend dijelaskan
                onToast(extractError(data, t('settings.sod.rules.deleteFailed')), 'error')
            }
        } catch {
            onToast(t('settings.sod.rules.connectFailed'), 'error')
        } finally {
            setDeleting(null)
        }
    }

    const moduleLabel = (m: string) => MODULE_OPTIONS.find((o) => o.value === m)?.label ?? m
    const actionLabel = (a: string | null) =>
        a ? (ACTION_OPTIONS.find((o) => o.value === a)?.label ?? a) : t('settings.sod.rules.allActions')

    if (loading) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="animate-pulse space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-12 bg-gray-200 rounded"></div>
                    ))}
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 p-8">
                <div className="flex flex-col items-center text-center">
                    <ShieldCheck className="h-12 w-12 text-red-500 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('settings.sod.rules.loadError')}</h3>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <button onClick={fetchRules} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        {t('settings.retry')}
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {/* Toolbar: search + filters + create */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={t('settings.sod.rules.searchPlaceholder')}
                            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        <select
                            value={filterModule}
                            onChange={(e) => setFilterModule(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">{t('settings.sod.rules.allModules')}</option>
                            {MODULE_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                        <select
                            value={filterEnabled}
                            onChange={(e) => setFilterEnabled(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">{t('settings.sod.rules.allStatus')}</option>
                            <option value="true">{t('settings.sod.rules.enabledLabel')}</option>
                            <option value="false">{t('settings.sod.rules.disabledLabel')}</option>
                        </select>
                        <button
                            onClick={openCreate}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                        >
                            <Plus className="h-4 w-4" />
                            {t('settings.sod.rules.addRule')}
                        </button>
                    </div>
                </div>
            </div>

            {/* Empty state */}
            {filteredRules.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                    <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('settings.sod.rules.emptyTitle')}</h3>
                    <p className="text-gray-600 mb-4">{t('settings.sod.rules.emptyDesc')}</p>
                    <button
                        onClick={openCreate}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Plus className="h-4 w-4 inline mr-1" />
                        {t('settings.sod.rules.createFirst')}
                    </button>
                </div>
            ) : (
                <>
                    {/* Desktop: table */}
                    <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase">
                                    <th className="px-4 py-3">{t('settings.sod.rules.colName')}</th>
                                    <th className="px-4 py-3">{t('settings.sod.rules.colRoles')}</th>
                                    <th className="px-4 py-3">{t('settings.sod.rules.colModule')}</th>
                                    <th className="px-4 py-3">{t('settings.sod.rules.colAction')}</th>
                                    <th className="px-4 py-3">{t('settings.sod.rules.colStatus')}</th>
                                    <th className="px-4 py-3 text-right">{t('settings.sod.rules.colActions')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredRules.map((rule) => (
                                    <tr key={rule.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-gray-900">{rule.name}</div>
                                            {rule.description && (
                                                <div className="text-xs text-gray-500 mt-0.5 max-w-xs truncate">{rule.description}</div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1 text-xs">
                                                <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-medium">{rule.role1}</span>
                                                <span className="text-gray-400">✕</span>
                                                <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded font-medium">{rule.role2}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-gray-700">{moduleLabel(rule.module)}</td>
                                        <td className="px-4 py-3 text-gray-700">{actionLabel(rule.action)}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${rule.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                                                }`}>
                                                {rule.enabled ? t('settings.sod.rules.enabledLabel') : t('settings.sod.rules.disabledLabel')}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => handleToggle(rule)}
                                                    disabled={toggling === rule.id}
                                                    title={rule.enabled ? t('settings.sod.rules.disableBtn') : t('settings.sod.rules.enableBtn')}
                                                    className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                                                >
                                                    {toggling === rule.id ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : rule.enabled ? (
                                                        <PowerOff className="h-4 w-4 text-orange-500" />
                                                    ) : (
                                                        <Power className="h-4 w-4 text-green-500" />
                                                    )}
                                                </button>
                                                <button
                                                    onClick={() => openEdit(rule)}
                                                    className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(rule)}
                                                    disabled={deleting === rule.id}
                                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                                >
                                                    {deleting === rule.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile: cards */}
                    <div className="md:hidden space-y-3">
                        {filteredRules.map((rule) => (
                            <div key={rule.id} className="bg-white rounded-xl border border-gray-200 p-4">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-gray-900 truncate">{rule.name}</div>
                                        {rule.description && (
                                            <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{rule.description}</div>
                                        )}
                                    </div>
                                    <span className={`px-2 py-0.5 text-xs rounded-full font-medium whitespace-nowrap ${rule.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                                        }`}>
                                        {rule.enabled ? t('settings.sod.rules.enabledLabel') : t('settings.sod.rules.disabledLabel')}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1 text-xs mt-2">
                                    <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-medium">{rule.role1}</span>
                                    <span className="text-gray-400">✕</span>
                                    <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded font-medium">{rule.role2}</span>
                                </div>
                                <div className="text-xs text-gray-500 mt-1.5">
                                    {moduleLabel(rule.module)} • {actionLabel(rule.action)}
                                </div>
                                <div className="flex items-center justify-end gap-1 mt-3">
                                    <button
                                        onClick={() => handleToggle(rule)}
                                        disabled={toggling === rule.id}
                                        className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                                    >
                                        {toggling === rule.id ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : rule.enabled ? (
                                            <PowerOff className="h-4 w-4 text-orange-500" />
                                        ) : (
                                            <Power className="h-4 w-4 text-green-500" />
                                        )}
                                    </button>
                                    <button
                                        onClick={() => openEdit(rule)}
                                        className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                    >
                                        <Pencil className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(rule)}
                                        disabled={deleting === rule.id}
                                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                    >
                                        {deleting === rule.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* Create / Edit Modal */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden">
                        <div className="flex items-center justify-between p-6 border-b border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-900">
                                {editing ? t('settings.sod.rules.editRule') : t('settings.sod.rules.createModalTitle')}
                            </h3>
                            <button onClick={() => setModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4 overflow-y-auto max-h-[60vh]">
                            {/* Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.sod.rules.nameLabel')}</label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                                    placeholder={t('settings.sod.rules.namePlaceholder')}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.sod.rules.descriptionLabel')}</label>
                                <textarea
                                    value={form.description}
                                    onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                                    rows={2}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            {/* Roles */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.sod.rules.role1Label')}</label>
                                    <select
                                        value={form.role1}
                                        onChange={(e) => setForm((prev) => ({ ...prev, role1: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        {ROLE_OPTIONS.map((r) => (
                                            <option key={r} value={r}>{r}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.sod.rules.role2Label')}</label>
                                    <select
                                        value={form.role2}
                                        onChange={(e) => setForm((prev) => ({ ...prev, role2: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        {ROLE_OPTIONS.map((r) => (
                                            <option key={r} value={r}>{r}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            {form.role1 === form.role2 && (
                                <p className="text-xs text-red-500 -mt-2">{t('settings.sod.rules.rolesMustDiffer')}</p>
                            )}

                            {/* Module + Action */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.sod.rules.moduleLabel')}</label>
                                    <select
                                        value={form.module}
                                        onChange={(e) => setForm((prev) => ({ ...prev, module: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        {MODULE_OPTIONS.map((opt) => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.sod.rules.actionLabel')}</label>
                                    <select
                                        value={form.action}
                                        onChange={(e) => setForm((prev) => ({ ...prev, action: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="">{t('settings.sod.rules.allActions')}</option>
                                        {ACTION_OPTIONS.map((opt) => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Enabled */}
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={form.enabled}
                                    onChange={(e) => setForm((prev) => ({ ...prev, enabled: e.target.checked }))}
                                    className="h-4 w-4 text-blue-600 rounded"
                                />
                                <span className="text-sm font-medium text-gray-700">{t('settings.sod.rules.enabledLabelField')}</span>
                            </label>
                        </div>
                        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
                            <button
                                onClick={() => setModalOpen(false)}
                                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                {t('settings.sod.rules.cancel')}
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={saving || !form.name.trim() || form.role1 === form.role2}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                            >
                                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                                {editing ? t('settings.sod.rules.saveBtn') : t('settings.sod.rules.createBtn')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
