'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from '@/lib/i18n'
import { FileUpload } from '@/components/ui/file-upload'
import { Loader2, CheckCircle, X } from 'lucide-react'

export default function CompanySettingsPage() {
  const { t } = useTranslation()
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [formData, setFormData] = useState({
    companyName: '',
    companyEmail: '',
    companyPhone: '',
    companyAddress: '',
    city: '',
    province: '',
    postalCode: '',
    country: 'Indonesia',
    npwp: '',
    website: '',
  })

  useEffect(() => {
    fetchCompanyData()
  }, [])

  useEffect(() => {
    if (saveSuccess) {
      const timer = setTimeout(() => setSaveSuccess(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [saveSuccess])

  const fetchCompanyData = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const res = await fetch('/api/settings/company')
      const data = await res.json()
      if (data.success) {
        const d = data.data
        setFormData({
          companyName: d.name || '',
          companyEmail: d.email || '',
          companyPhone: d.phone || '',
          companyAddress: d.address || '',
          city: d.city || '',
          province: d.province || '',
          postalCode: d.postalCode || '',
          country: d.country || 'Indonesia',
          npwp: d.npwp || '',
          website: d.website || '',
        })
      } else {
        setError(data.error || t('settings.errorLoadCompany') || 'Gagal memuat data perusahaan')
      }
    } catch {
      setError(t('settings.errorConnectServer'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setSaveSuccess(false)
    setError(null)

    try {
      const res = await fetch('/api/settings/company', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.companyName,
          email: formData.companyEmail,
          phone: formData.companyPhone,
          address: formData.companyAddress,
          website: formData.website,
          npwp: formData.npwp,
          city: formData.city,
          province: formData.province,
          postalCode: formData.postalCode,
          country: formData.country,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setSaveSuccess(true)
      } else {
        setError(data.error || t('settings.errorSaveChanges') || 'Gagal menyimpan perubahan')
      }
    } catch {
      setError(t('settings.errorConnectServer'))
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 p-12 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
          <p className="text-sm text-gray-500">{t('settings.loadingCompany')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <p className="text-sm text-red-700 flex-1">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-sm text-red-600 hover:text-red-800 font-medium"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Company Info */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('settings.companyInfo') || 'Informasi Perusahaan'}</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-1.5">
              {t('settings.companyNameLabel') || 'Nama Perusahaan'}
            </label>
            <input
              id="companyName"
              name="companyName"
              type="text"
              value={formData.companyName}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900"
            />
          </div>

          <div>
            <label htmlFor="companyEmail" className="block text-sm font-medium text-gray-700 mb-1.5">
              {t('settings.companyEmailLabel') || 'Email Perusahaan'}
            </label>
            <input
              id="companyEmail"
              name="companyEmail"
              type="email"
              value={formData.companyEmail}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900"
            />
          </div>

          <div>
            <label htmlFor="companyPhone" className="block text-sm font-medium text-gray-700 mb-1.5">
              {t('settings.companyPhoneLabel') || 'Telepon Perusahaan'}
            </label>
            <input
              id="companyPhone"
              name="companyPhone"
              type="tel"
              value={formData.companyPhone}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900"
            />
          </div>

          <div>
            <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-1.5">
              {t('settings.website') || 'Website'}
            </label>
            <input
              id="website"
              name="website"
              type="url"
              value={formData.website}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900"
            />
          </div>

          <div>
            <label htmlFor="npwp" className="block text-sm font-medium text-gray-700 mb-1.5">
              {t('settings.npwp') || 'NPWP'}
            </label>
            <input
              id="npwp"
              name="npwp"
              type="text"
              value={formData.npwp}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900"
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="companyAddress" className="block text-sm font-medium text-gray-700 mb-1.5">
              {t('settings.streetAddress') || 'Alamat'}
            </label>
            <textarea
              id="companyAddress"
              name="companyAddress"
              value={formData.companyAddress}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900 resize-none"
            />
          </div>

          <div>
            <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1.5">
              {t('settings.city') || 'Kota'}
            </label>
            <input
              id="city"
              name="city"
              type="text"
              value={formData.city}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900"
            />
          </div>

          <div>
            <label htmlFor="province" className="block text-sm font-medium text-gray-700 mb-1.5">
              {t('settings.province') || 'Provinsi'}
            </label>
            <input
              id="province"
              name="province"
              type="text"
              value={formData.province}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900"
            />
          </div>

          <div>
            <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700 mb-1.5">
              {t('settings.postalCode') || 'Kode Pos'}
            </label>
            <input
              id="postalCode"
              name="postalCode"
              type="text"
              value={formData.postalCode}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900"
            />
          </div>

          <div>
            <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1.5">
              {t('settings.country') || 'Negara'}
            </label>
            <select
              id="country"
              name="country"
              value={formData.country}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900 bg-white"
            >
              <option value="Indonesia">Indonesia</option>
              <option value="Malaysia">Malaysia</option>
              <option value="Singapore">Singapore</option>
              <option value="Thailand">Thailand</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={fetchCompanyData}
            className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {t('common.cancel') || 'Batal'}
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('settings.saving') || 'Menyimpan...'}
              </>
            ) : saveSuccess ? (
              <>
                <CheckCircle className="w-4 h-4" />
                {t('settings.saved')}
              </>
            ) : (
              t('settings.saveCompany') || 'Simpan Perubahan'
            )}
          </button>
        </div>
      </form>

      {/* Logo */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('settings.companyLogo')}</h2>
        <div className="flex flex-col md:flex-row items-start gap-6">
          <div className="w-24 h-24 bg-gray-100 rounded-xl flex items-center justify-center border-2 border-dashed border-gray-300 shrink-0">
            <span className="text-gray-400 text-sm">Logo</span>
          </div>
          <div className="flex-1 w-full">
            <FileUpload
              accept="image/svg+xml,image/png,image/jpeg"
              maxSize={2}
              onUpload={(file) => {
                // File uploaded successfully
              }}
            />
            <p className="text-xs text-gray-500 mt-2">
              {t('settings.logoHint')}
            </p>
          </div>
        </div>
      </div>

      {/* Branding */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('settings.branding')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {t('settings.primaryColor')}
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                defaultValue="#2563eb"
                className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer"
              />
              <input
                type="text"
                defaultValue="#2563eb"
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900 font-mono"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {t('settings.secondaryColor')}
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                defaultValue="#10b981"
                className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer"
              />
              <input
                type="text"
                defaultValue="#10b981"
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900 font-mono"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
