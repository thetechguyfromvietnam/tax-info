import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { motion } from 'framer-motion'
import { FileText, CheckCircle, XCircle, Search } from 'lucide-react'
import { getApiUrl } from '../utils/api'
import { t } from '../utils/i18n'

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

  // Helper function to get bilingual label
  const getBilingualLabel = (key) => {
    const vi = t(key, 'vi')
    const en = t(key, 'en')
    return vi === en ? vi : `${vi} / ${en}`
  }

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
        message: getBilingualLabel('lookupInvalid'),
      })
      return
    }
    try {
      setIsLookingUp(true)
      setLookupResult(null)
      const apiUrl = getApiUrl()
      const requestUrl = `${apiUrl}/api/tax-lookup/${taxCode}`
      console.log(`[Frontend] Looking up tax code: ${taxCode} via ${requestUrl}`)
      
      // Create AbortController for timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 20000) // 20 second timeout
      
      try {
        const res = await fetch(requestUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          signal: controller.signal
        })
        
        clearTimeout(timeoutId)
        
        // Check if response is ok
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`)
        }
        
        const data = await res.json()
        console.log('[Frontend] Lookup response:', data)
        
        if (data.success && data.data) {
          setLookupResult({ success: true, message: getBilingualLabel('lookupSuccess') })
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
            message: data.message || getBilingualLabel('lookupFailed'),
          })
        }
      } catch (fetchError) {
        clearTimeout(timeoutId)
        
        if (fetchError.name === 'AbortError') {
          throw new Error(getBilingualLabel('lookupTimeout'))
        }
        throw fetchError
      }
    } catch (err) {
      console.error('[Frontend] Lookup error:', err)
      let errorMessage = getBilingualLabel('lookupError')
      
      if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
        errorMessage = getBilingualLabel('lookupNetworkError')
      } else if (err.message?.includes('timeout') || err.message?.includes('thời gian') || err.message?.includes('timed out')) {
        errorMessage = getBilingualLabel('lookupTimeout')
      } else if (err.message) {
        errorMessage = `${getBilingualLabel('error')}: ${err.message}`
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
      // Normalize phone number: remove spaces, dashes, and +84 prefix
      let normalizedPhone = formData.phone || ''
      normalizedPhone = normalizedPhone.replace(/\s+/g, '') // Remove spaces
      normalizedPhone = normalizedPhone.replace(/-/g, '') // Remove dashes
      normalizedPhone = normalizedPhone.replace(/\+84/g, '0') // Replace +84 with 0
      normalizedPhone = normalizedPhone.replace(/^84/, '0') // Replace 84 prefix with 0
      
      const apiUrl = getApiUrl()
      const requestUrl = `${apiUrl}/api/tax-info`
      console.log('[TaxInfo] Submitting to:', requestUrl)
      
      // Create AbortController for timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout
      
      try {
        const res = await fetch(requestUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            phone: normalizedPhone, // Use normalized phone
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }),
          signal: controller.signal
        })
        
        clearTimeout(timeoutId)
        
        // Check if response is ok
        if (!res.ok) {
          let errorMessage = `${getBilingualLabel('error')} HTTP ${res.status}: ${res.statusText}`
          try {
            const errorData = await res.json()
            if (errorData.message) {
              errorMessage = errorData.message
            }
          } catch (e) {
            // If response is not JSON, use status text
            console.error('[TaxInfo] Failed to parse error response:', e)
          }
          throw new Error(errorMessage)
        }
        
        const data = await res.json()
        console.log('[TaxInfo] Response data:', data)
        
        if (!data.success) {
          throw new Error(data.message || getBilingualLabel('submitError'))
        }
        
        // Check Google Sheets sync status
        if (data.googleSheetsSync) {
          if (data.googleSheetsSync.success) {
            console.log('[TaxInfo] ✅ Google Sheets sync successful')
          } else {
            console.warn('[TaxInfo] ⚠️ Google Sheets sync failed:', data.googleSheetsSync.message)
            // Log warning but don't show error to user - data is still saved
            // The backend will retry automatically, and user can check logs if needed
          }
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
      } catch (fetchError) {
        clearTimeout(timeoutId)
        
        if (fetchError.name === 'AbortError') {
          throw new Error(getBilingualLabel('submitTimeout'))
        }
        throw fetchError
      }
    } catch (err) {
      console.error('[TaxInfo] Save tax info error:', err)
      let errorMessage = err.message || getBilingualLabel('submitError')
      
      // Provide more specific error messages
      if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
        errorMessage = getBilingualLabel('submitNetworkError')
      } else if (err.message?.includes('timeout') || err.message?.includes('thời gian') || err.message?.includes('timed out')) {
        errorMessage = getBilingualLabel('submitTimeout')
      }
      
      setSubmitError(errorMessage)
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
            {getBilingualLabel('title')}
          </h1>
          <p className="text-neutral-600">
            {getBilingualLabel('subtitle')}
          </p>
        </motion.div>

        {/* Success / Error */}
        {submitSuccess && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
            <CheckCircle className="text-green-600" size={22} />
            <div className="flex-1">
              <p className="font-semibold text-green-800">{getBilingualLabel('saveSuccess')}</p>
              <p className="text-sm text-green-700">
                {getBilingualLabel('saveSuccessMessage')}
              </p>
            </div>
          </div>
        )}
        {submitError && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <XCircle className="text-red-600" size={22} />
            <div>
              <p className="font-semibold text-red-800">{getBilingualLabel('error')}</p>
              <p className="text-sm text-red-700">{submitError}</p>
            </div>
          </div>
        )}

        {/* Saved info */}
        {savedTaxInfo && (
          <div className="mb-6 bg-white rounded-xl shadow-sm border border-amber-100 p-4 text-sm">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="text-green-600" size={18} />
              <span className="font-semibold text-amber-800">{getBilingualLabel('lastSavedInfo')}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <span className="text-neutral-500">{getBilingualLabel('taxCode')}:</span>{' '}
                <span className="font-semibold">{savedTaxInfo.taxCode || '-'}</span>
              </div>
              <div>
                <span className="text-neutral-500">{getBilingualLabel('invoiceNumber')}:</span>{' '}
                <span className="font-semibold">{savedTaxInfo.invoiceNumber || '-'}</span>
              </div>
              <div className="md:col-span-2">
                <span className="text-neutral-500">{getBilingualLabel('companyName')}:</span>{' '}
                <span className="font-semibold">{savedTaxInfo.companyName || '-'}</span>
              </div>
              <div className="md:col-span-2">
                <span className="text-neutral-500">{getBilingualLabel('address')}:</span>{' '}
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
                {getBilingualLabel('taxCodeLabel')} <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  id="taxCode"
                  type="text"
                  {...register('taxCode', {
                    required: getBilingualLabel('taxCodeRequired'),
                    pattern: {
                      value: /^[0-9]{10,13}$/,
                      message: getBilingualLabel('taxCodeInvalid'),
                    },
                  })}
                  className="flex-1 px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                  placeholder={getBilingualLabel('taxCodePlaceholder')}
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
                  {isLookingUp ? getBilingualLabel('lookingUp') : (
                    <>
                      <Search size={16} className="mr-1" />
                      {getBilingualLabel('lookup')}
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
                {getBilingualLabel('invoiceNumberLabel')} <span className="text-red-500">*</span>
              </label>
              <input
                id="invoiceNumber"
                type="text"
                {...register('invoiceNumber', {
                  required: getBilingualLabel('invoiceNumberRequired'),
                })}
                className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                placeholder={getBilingualLabel('invoiceNumberPlaceholder')}
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
                {getBilingualLabel('companyNameLabel')}
              </label>
              <input
                id="companyName"
                type="text"
                {...register('companyName')}
                className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                placeholder={getBilingualLabel('companyNamePlaceholder')}
              />
            </div>

            {/* Address */}
            <div>
              <label
                htmlFor="address"
                className="block text-sm font-medium text-neutral-700 mb-2"
              >
                {getBilingualLabel('addressLabel')}
              </label>
              <textarea
                id="address"
                rows={3}
                {...register('address')}
                className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm resize-none"
                placeholder={getBilingualLabel('addressPlaceholder')}
              />
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-neutral-700 mb-2"
              >
                {getBilingualLabel('emailLabel')} <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                type="email"
                {...register('email', {
                  required: getBilingualLabel('emailRequired'),
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: getBilingualLabel('emailInvalid'),
                  },
                })}
                className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                placeholder={getBilingualLabel('emailPlaceholder')}
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
                {getBilingualLabel('phoneLabel')} <span className="text-red-500">*</span>
              </label>
              <input
                id="phone"
                type="tel"
                {...register('phone', {
                  required: getBilingualLabel('phoneRequired'),
                  validate: (value) => {
                    if (!value) return getBilingualLabel('phoneRequired')
                    // Normalize phone number for validation
                    let normalized = value.replace(/\s+/g, '').replace(/-/g, '').replace(/\+84/g, '0').replace(/^84/, '0')
                    if (!/^[0-9]{10,11}$/.test(normalized)) {
                      return getBilingualLabel('phoneInvalid')
                    }
                    return true
                  },
                })}
                className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                placeholder={getBilingualLabel('phonePlaceholder')}
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
              {isSubmitting ? getBilingualLabel('saving') : getBilingualLabel('save')}
            </button>
          </div>
        </motion.form>
      </div>
    </div>
  )
}

export default TaxInfo
