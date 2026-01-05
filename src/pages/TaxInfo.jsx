import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { motion } from 'framer-motion'
import { FileText, CheckCircle, XCircle, Search } from 'lucide-react'
import { getApiUrl } from '../utils/api'

const TaxInfo = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    reset,
  } = useForm()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [isLookingUp, setIsLookingUp] = useState(false)
  const [lookupResult, setLookupResult] = useState(null)
  const [savedTaxInfo, setSavedTaxInfo] = useState(null)

  // Load saved tax info on mount
  useEffect(() => {
    const loadSaved = async () => {
      try {
        const apiUrl = getApiUrl()
        console.log('[TaxInfo] Loading saved tax info from:', `${apiUrl}/api/tax-info`)
        const res = await fetch(`${apiUrl}/api/tax-info`)
        if (!res.ok) {
          console.log('[TaxInfo] No saved data or server not available')
          return
        }
        const data = await res.json()
        if (data.success && data.data) {
          setSavedTaxInfo(data.data)
          const t = data.data
          setValue('taxCode', t.taxCode || '')
          setValue('invoiceNumber', t.invoiceNumber || '')
          setValue('companyName', t.companyName || '')
          setValue('address', t.address || '')
          setValue('email', t.email || '')
          setValue('phone', t.phone || '')
        }
      } catch (err) {
        console.error('[TaxInfo] Load tax info error:', err)
        // Don't show error to user, just log it
      }
    }
    loadSaved()
  }, [setValue])

  const handleLookup = async (taxCode) => {
    if (!taxCode || !/^[0-9]{10,13}$/.test(taxCode)) {
      setLookupResult({
        success: false,
        message: 'Mã số thuế không hợp lệ. Vui lòng nhập 10-13 chữ số.',
      })
      return
    }
    try {
      setIsLookingUp(true)
      setLookupResult(null)
      const apiUrl = getApiUrl()
      console.log(`[Frontend] Looking up tax code: ${taxCode} via ${apiUrl}/api/tax-lookup/${taxCode}`)
      
      const res = await fetch(`${apiUrl}/api/tax-lookup/${taxCode}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      })
      
      // Check if response is ok
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      }
      
      const data = await res.json()
      console.log('[Frontend] Lookup response:', data)
      
      if (data.success && data.data) {
        setLookupResult({ success: true, message: 'Đã tìm thấy thông tin công ty' })
        const info = data.data
        if (info.companyName) setValue('companyName', info.companyName)
        if (info.address) setValue('address', info.address)
        if (info.companyNameEn) {
          // Optionally set English name if needed
          console.log('Company English name:', info.companyNameEn)
        }
      } else {
        setLookupResult({
          success: false,
          message: data.message || 'Không tìm thấy thông tin công ty từ các nguồn tra cứu',
        })
      }
    } catch (err) {
      console.error('[Frontend] Lookup error:', err)
      let errorMessage = 'Không thể tra cứu thông tin. Vui lòng thử lại.'
      
      if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
        errorMessage = 'Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng hoặc đảm bảo server đang chạy.'
      } else if (err.message) {
        errorMessage = `Lỗi: ${err.message}`
      }
      
      setLookupResult({
        success: false,
        message: errorMessage,
      })
    } finally {
      setIsLookingUp(false)
    }
  }

  const onSubmit = async (formData) => {
    setIsSubmitting(true)
    setSubmitError('')
    setSubmitSuccess(false)
    try {
      const apiUrl = getApiUrl()
      const res = await fetch(`${apiUrl}/api/tax-info`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Lưu thông tin thất bại')
      }
      setSubmitSuccess(true)
      setSavedTaxInfo(data.data)
      
      // Reset form để tiếp tục nhập thông tin mới
      reset({
        taxCode: '',
        invoiceNumber: '',
        companyName: '',
        address: '',
        email: '',
        phone: ''
      })
      
      // Clear lookup result
      setLookupResult(null)
      
      // Auto hide success message after 3 seconds
      setTimeout(() => {
        setSubmitSuccess(false)
      }, 3000)
    } catch (err) {
      console.error('Save tax info error', err)
      setSubmitError(err.message || 'Có lỗi xảy ra khi lưu thông tin')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-yellow-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-500 rounded-full mb-4">
            <FileText className="text-white" size={32} />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-amber-800 mb-2">
            Thông Tin Mã Số Thuế
          </h1>
          <p className="text-neutral-600">
            Vui lòng điền thông tin mã số thuế để xuất hóa đơn
          </p>
        </motion.div>

        {/* Success / Error */}
        {submitSuccess && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
            <CheckCircle className="text-green-600" size={22} />
            <div>
              <p className="font-semibold text-green-800">Lưu thành công!</p>
              <p className="text-sm text-green-700">
                Thông tin mã số thuế và số hóa đơn đã được lưu.
              </p>
            </div>
          </div>
        )}
        {submitError && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <XCircle className="text-red-600" size={22} />
            <div>
              <p className="font-semibold text-red-800">Lỗi</p>
              <p className="text-sm text-red-700">{submitError}</p>
            </div>
          </div>
        )}

        {/* Saved info */}
        {savedTaxInfo && (
          <div className="mb-6 bg-white rounded-xl shadow-sm border border-amber-100 p-4 text-sm">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="text-green-600" size={18} />
              <span className="font-semibold text-amber-800">Thông tin đã lưu gần nhất</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <span className="text-neutral-500">Mã số thuế:</span>{' '}
                <span className="font-semibold">{savedTaxInfo.taxCode || '-'}</span>
              </div>
              <div>
                <span className="text-neutral-500">Số hóa đơn:</span>{' '}
                <span className="font-semibold">{savedTaxInfo.invoiceNumber || '-'}</span>
              </div>
              <div className="md:col-span-2">
                <span className="text-neutral-500">Tên công ty:</span>{' '}
                <span className="font-semibold">{savedTaxInfo.companyName || '-'}</span>
              </div>
              <div className="md:col-span-2">
                <span className="text-neutral-500">Địa chỉ:</span>{' '}
                <span className="font-semibold">{savedTaxInfo.address || '-'}</span>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSubmit(onSubmit)}
          className="bg-white rounded-xl shadow-lg p-6 md:p-8 border border-amber-200"
        >
          <div className="space-y-4">
            {/* Tax code & lookup */}
            <div>
              <label
                htmlFor="taxCode"
                className="block text-sm font-medium text-neutral-700 mb-2"
              >
                Mã số thuế <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  id="taxCode"
                  type="text"
                  {...register('taxCode', {
                    required: 'Vui lòng nhập mã số thuế',
                    pattern: {
                      value: /^[0-9]{10,13}$/,
                      message: 'Mã số thuế phải có 10-13 chữ số',
                    },
                  })}
                  className="flex-1 px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                  placeholder="Nhập mã số thuế"
                />
                <button
                  type="button"
                  onClick={async () => {
                    const input = document.getElementById('taxCode')
                    const value = input?.value?.trim()
                    await handleLookup(value)
                  }}
                  className="inline-flex items-center justify-center px-4 py-3 rounded-lg border border-amber-500 text-amber-700 text-sm font-medium hover:bg-amber-50"
                  disabled={isLookingUp}
                >
                  {isLookingUp ? 'Đang tra...' : (
                    <>
                      <Search size={16} className="mr-1" />
                      Tra cứu
                    </>
                  )}
                </button>
              </div>
              {errors.taxCode && (
                <p className="mt-1 text-xs text-red-600">{errors.taxCode.message}</p>
              )}
              {lookupResult && (
                <p
                  className={`mt-2 text-xs ${
                    lookupResult.success ? 'text-green-700' : 'text-red-700'
                  }`}
                >
                  {lookupResult.message}
                </p>
              )}
            </div>

            {/* Invoice number */}
            <div>
              <label
                htmlFor="invoiceNumber"
                className="block text-sm font-medium text-neutral-700 mb-2"
              >
                Số hóa đơn (nhân viên ghi trước) <span className="text-red-500">*</span>
              </label>
              <input
                id="invoiceNumber"
                type="text"
                {...register('invoiceNumber', {
                  required: 'Vui lòng nhập số hóa đơn',
                })}
                className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                placeholder="VD: 000123"
              />
              {errors.invoiceNumber && (
                <p className="mt-1 text-xs text-red-600">{errors.invoiceNumber.message}</p>
              )}
            </div>

            {/* Company name */}
            <div>
              <label
                htmlFor="companyName"
                className="block text-sm font-medium text-neutral-700 mb-2"
              >
                Tên công ty / Tên khách hàng
              </label>
              <input
                id="companyName"
                type="text"
                {...register('companyName')}
                className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                placeholder="Nhập tên công ty hoặc khách hàng"
              />
            </div>

            {/* Address */}
            <div>
              <label
                htmlFor="address"
                className="block text-sm font-medium text-neutral-700 mb-2"
              >
                Địa chỉ
              </label>
              <textarea
                id="address"
                rows={3}
                {...register('address')}
                className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm resize-none"
                placeholder="Nhập địa chỉ (tự động thêm 'Việt Nam' ở cuối nếu thiếu)"
              />
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-neutral-700 mb-2"
              >
                Email <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                type="email"
                {...register('email', {
                  required: 'Vui lòng nhập email',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Email không hợp lệ',
                  },
                })}
                className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                placeholder="Nhập email"
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-medium text-neutral-700 mb-2"
              >
                Số điện thoại <span className="text-red-500">*</span>
              </label>
              <input
                id="phone"
                type="tel"
                {...register('phone', {
                  required: 'Vui lòng nhập số điện thoại',
                  pattern: {
                    value: /^[0-9]{10,11}$/,
                    message: 'Số điện thoại phải có 10-11 chữ số',
                  },
                })}
                className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                placeholder="Nhập số điện thoại"
              />
              {errors.phone && (
                <p className="mt-1 text-xs text-red-600">{errors.phone.message}</p>
              )}
            </div>
          </div>

          <div className="mt-6">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full inline-flex items-center justify-center px-6 py-3 rounded-xl bg-amber-500 text-white font-semibold text-sm hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Đang lưu...' : 'Lưu thông tin'}
            </button>
          </div>
        </motion.form>
      </div>
    </div>
  )
}

export default TaxInfo
