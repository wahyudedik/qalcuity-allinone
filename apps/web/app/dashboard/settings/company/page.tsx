'use client'

import { useState } from 'react'
import { useTranslation } from '@/lib/i18n'

export default function CompanySettingsPage() {
  const { t } = useTranslation()
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    companyName: 'PT Maju Bersama',
    companyEmail: 'info@majubersama.com',
    companyPhone: '+62 21-1234-5678',
    companyAddress: 'Jl. Sudirman No. 123, Jakarta Selatan',
    city: 'Jakarta Selatan',
    province: 'DKI Jakarta',
    postalCode: '12190',
    country: 'Indonesia',
    npwp: '12.345.678.9-012.000',
    website: 'https://majubersama.com',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    await new Promise(resolve => setTimeout(resolve, 1000))
    setIsSaving(false)
  }

  return (
    <div className="space-y-6">
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
              onChange={handleChange as any}
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
            className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {t('common.cancel') || 'Batal'}
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isSaving ? (t('settings.saving') || 'Menyimpan...') : (t('settings.saveCompany') || 'Simpan Perubahan')}
          </button>
        </div>
      </form>

      {/* Logo */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Logo Perusahaan</h2>
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 bg-gray-100 rounded-xl flex items-center justify-center border-2 border-dashed border-gray-300">
            <span className="text-gray-400 text-sm">Logo</span>
          </div>
          <div>
            <button
              type="button"
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Upload Logo
            </button>
            <p className="text-xs text-gray-500 mt-2">
              SVG, PNG, atau JPG. Maksimal 2MB. Disarankan 512x512px.
            </p>
          </div>
        </div>
      </div>

      {/* Branding */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Branding</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Warna Primer
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
              Warna Sekunder
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
