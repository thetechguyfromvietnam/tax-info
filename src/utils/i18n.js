// Translation strings
const translations = {
  vi: {
    // Header
    title: 'Thông Tin Mã Số Thuế',
    subtitle: 'Vui lòng điền thông tin mã số thuế để xuất hóa đơn',
    
    // Success/Error messages
    saveSuccess: 'Lưu thành công!',
    saveSuccessMessage: 'Thông tin mã số thuế và số hóa đơn đã được lưu.',
    error: 'Lỗi',
    
    // Saved info section
    lastSavedInfo: 'Thông tin đã lưu gần nhất',
    taxCode: 'Mã số thuế',
    invoiceNumber: 'Số hóa đơn',
    companyName: 'Tên công ty',
    address: 'Địa chỉ',
    
    // Form labels
    taxCodeLabel: 'Mã số thuế',
    invoiceNumberLabel: 'Số hóa đơn',
    companyNameLabel: 'Tên công ty',
    addressLabel: 'Địa chỉ',
    emailLabel: 'Email',
    phoneLabel: 'Số điện thoại',
    
    // Form placeholders
    taxCodePlaceholder: 'Nhập mã số thuế',
    invoiceNumberPlaceholder: 'VD: 000123',
    companyNamePlaceholder: 'Nhập tên công ty',
    addressPlaceholder: 'Nhập địa chỉ (tự động thêm \'Việt Nam\' ở cuối nếu thiếu)',
    emailPlaceholder: 'Nhập email',
    phonePlaceholder: 'Nhập số điện thoại (ví dụ: 0123 456 789 hoặc 0123-456-789)',
    
    // Buttons
    lookup: 'Tra cứu',
    lookingUp: 'Đang tra...',
    save: 'Lưu thông tin',
    saving: 'Đang lưu...',
    
    // Validation messages
    taxCodeRequired: 'Vui lòng nhập mã số thuế',
    taxCodeInvalid: 'Mã số thuế phải có 10-13 chữ số',
    invoiceNumberRequired: 'Vui lòng nhập số hóa đơn',
    emailRequired: 'Vui lòng nhập email',
    emailInvalid: 'Email không hợp lệ',
    phoneRequired: 'Vui lòng nhập số điện thoại',
    phoneInvalid: 'Số điện thoại phải có 10-11 chữ số (có thể nhập với dấu cách hoặc dấu gạch ngang)',
    
    // Lookup messages
    lookupSuccess: 'Đã tìm thấy thông tin công ty',
    lookupFailed: 'Không tìm thấy thông tin công ty từ các nguồn tra cứu',
    lookupInvalid: 'Mã số thuế không hợp lệ. Vui lòng nhập 10-13 chữ số.',
    lookupError: 'Không thể tra cứu thông tin. Vui lòng thử lại.',
    lookupNetworkError: 'Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng hoặc đảm bảo server đang chạy.',
    lookupTimeout: 'Yêu cầu tra cứu quá thời gian. Vui lòng thử lại.',
    
    // Submit messages
    submitNetworkError: 'Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng và thử lại.',
    submitTimeout: 'Yêu cầu quá thời gian. Vui lòng kiểm tra kết nối mạng và thử lại.',
    submitError: 'Có lỗi xảy ra khi lưu thông tin',
    
    // Language
    language: 'Ngôn ngữ',
    vietnamese: 'Tiếng Việt',
    english: 'English'
  },
  en: {
    // Header
    title: 'Tax ID Information',
    subtitle: 'Please fill in the tax ID information to generate invoice',
    
    // Success/Error messages
    saveSuccess: 'Saved successfully!',
    saveSuccessMessage: 'Tax ID and invoice number information has been saved.',
    error: 'Error',
    
    // Saved info section
    lastSavedInfo: 'Last saved information',
    taxCode: 'Tax Code',
    invoiceNumber: 'Invoice Number',
    companyName: 'Company Name',
    address: 'Address',
    
    // Form labels
    taxCodeLabel: 'Tax Code',
    invoiceNumberLabel: 'Invoice Number',
    companyNameLabel: 'Company Name',
    addressLabel: 'Address',
    emailLabel: 'Email',
    phoneLabel: 'Phone Number',
    
    // Form placeholders
    taxCodePlaceholder: 'Enter tax code',
    invoiceNumberPlaceholder: 'E.g: 000123',
    companyNamePlaceholder: 'Enter company name',
    addressPlaceholder: 'Enter address (automatically adds \'Vietnam\' at the end if missing)',
    emailPlaceholder: 'Enter email',
    phonePlaceholder: 'Enter phone number (e.g: 0123 456 789 or 0123-456-789)',
    
    // Buttons
    lookup: 'Lookup',
    lookingUp: 'Looking up...',
    save: 'Save Information',
    saving: 'Saving...',
    
    // Validation messages
    taxCodeRequired: 'Please enter tax code',
    taxCodeInvalid: 'Tax code must have 10-13 digits',
    invoiceNumberRequired: 'Please enter invoice number',
    emailRequired: 'Please enter email',
    emailInvalid: 'Invalid email',
    phoneRequired: 'Please enter phone number',
    phoneInvalid: 'Phone number must have 10-11 digits (can be entered with spaces or dashes)',
    
    // Lookup messages
    lookupSuccess: 'Company information found',
    lookupFailed: 'Company information not found from available sources',
    lookupInvalid: 'Invalid tax code. Please enter 10-13 digits.',
    lookupError: 'Unable to lookup information. Please try again.',
    lookupNetworkError: 'Cannot connect to server. Please check your network connection or ensure the server is running.',
    lookupTimeout: 'Lookup request timed out. Please try again.',
    
    // Submit messages
    submitNetworkError: 'Cannot connect to server. Please check your network connection and try again.',
    submitTimeout: 'Request timed out. Please check your network connection and try again.',
    submitError: 'An error occurred while saving information',
    
    // Language
    language: 'Language',
    vietnamese: 'Tiếng Việt',
    english: 'English'
  }
}

// Get current language from localStorage or default to Vietnamese
export const getLanguage = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('language') || 'vi'
  }
  return 'vi'
}

// Set language
export const setLanguage = (lang) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('language', lang)
  }
}

// Get translation
export const t = (key, lang = null) => {
  const currentLang = lang || getLanguage()
  return translations[currentLang]?.[key] || key
}

export default translations

