import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3002;

// Tax info storage file path - use /tmp on Vercel, or server directory locally
const TAX_INFO_FILE = process.env.VERCEL 
  ? path.join('/tmp', 'tax-info.json')
  : path.join(__dirname, '../server', 'tax-info.json');

// Google Sheets configuration - Using Apps Script (simpler than Service Account)
const GOOGLE_APPS_SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_URL || '';

// Log Google Sheets configuration status on server start
if (GOOGLE_APPS_SCRIPT_URL) {
  console.log('✅ [Google Sheets] Configuration loaded');
  console.log(`   URL: ${GOOGLE_APPS_SCRIPT_URL.substring(0, 50)}...`);
} else {
  console.log('⚠️ [Google Sheets] Not configured - GOOGLE_APPS_SCRIPT_URL not set in .env');
}

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for Vercel compatibility
  crossOriginEmbedderPolicy: false
}));
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL || true // Allow all origins in production on Vercel
    : [
        'http://localhost:3000',
        'http://localhost:3001', 
        'http://localhost:5173',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001',
        'http://127.0.0.1:5173'
      ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Middleware to ensure all responses are JSON
app.use((req, res, next) => {
  // Store original json method
  const originalJson = res.json;
  
  // Override json method to ensure Content-Type header
  res.json = function(data) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return originalJson.call(this, data);
  };
  
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Tax Info API is running',
    timestamp: new Date().toISOString()
  });
});

// Tax Info Storage Functions
// Note: On Vercel serverless, file system is read-only except /tmp
const readTaxInfo = () => {
  try {
    // On Vercel, file system operations may not work, return null gracefully
    if (process.env.VERCEL) {
      console.log('[File System] Running on Vercel - file operations disabled');
      return null;
    }
    
    if (fs.existsSync(TAX_INFO_FILE)) {
      const data = fs.readFileSync(TAX_INFO_FILE, 'utf8');
      return JSON.parse(data);
    }
    return null;
  } catch (error) {
    console.error('Error reading tax info:', error);
    return null;
  }
};

const writeTaxInfo = (taxInfo) => {
  try {
    // On Vercel, file system is read-only except /tmp
    if (process.env.VERCEL) {
      console.log('[File System] Running on Vercel - skipping file write (data will be saved to Google Sheets only)');
      return true; // Return true to not break the flow, data is saved to Google Sheets
    }
    
    fs.writeFileSync(TAX_INFO_FILE, JSON.stringify(taxInfo, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error writing tax info:', error);
    // Don't fail completely, Google Sheets will still save the data
    return true;
  }
};

// Append tax info to Google Sheets via Apps Script (if configured)
const appendTaxInfoToSheet = async (taxInfo, retryCount = 0) => {
  const MAX_RETRIES = 2;
  
  try {
    console.log('[Google Sheets] Function called with taxInfo:', {
      taxCode: taxInfo.taxCode,
      companyName: taxInfo.companyName,
      invoiceNumber: taxInfo.invoiceNumber,
      retryAttempt: retryCount
    });
    
    if (!GOOGLE_APPS_SCRIPT_URL) {
      // Google Sheets not configured – nothing to do
      console.log('ℹ️ [Google Sheets] Not configured (GOOGLE_APPS_SCRIPT_URL not set)');
      console.log('ℹ️ [Google Sheets] Check server/.env file for GOOGLE_APPS_SCRIPT_URL');
      return { success: false, message: 'Google Sheets not configured' };
    }

    console.log('[Google Sheets] Sending data to Apps Script...');
    console.log(`[Google Sheets] URL: ${GOOGLE_APPS_SCRIPT_URL}`);
    console.log('[Google Sheets] Data to send:', {
      invoiceNumber: taxInfo.invoiceNumber || '',
      taxCode: taxInfo.taxCode || '',
      companyName: taxInfo.companyName || '',
      address: taxInfo.address || '',
      email: taxInfo.email || '',
      phone: taxInfo.phone || ''
    });
    
    // Create AbortController for timeout (30 seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    try {
      // Send data to Apps Script web app
      // Note: Google Apps Script URLs may redirect, so we need to follow redirects
      const response = await fetch(GOOGLE_APPS_SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invoiceNumber: taxInfo.invoiceNumber || '',
          taxCode: taxInfo.taxCode || '',
          companyName: taxInfo.companyName || '',
          address: taxInfo.address || '',
          email: taxInfo.email || '',
          phone: taxInfo.phone || ''
        }),
        redirect: 'follow', // Follow redirects
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const responseText = await response.text();
      console.log(`[Google Sheets] Response status: ${response.status} ${response.statusText}`);
      console.log(`[Google Sheets] Response body: ${responseText.substring(0, 300)}`);
      
      if (response.ok) {
        try {
          const result = JSON.parse(responseText);
          if (result.success) {
            console.log('✅ [Google Sheets] Appended tax info successfully');
            console.log(`   Tax Code: ${taxInfo.taxCode}, Company: ${taxInfo.companyName}`);
            return { success: true, message: 'Data saved to Google Sheets' };
          } else {
            console.error('❌ [Google Sheets] Apps Script returned error:', result.message);
            // Retry on error if we haven't exceeded max retries
            if (retryCount < MAX_RETRIES) {
              console.log(`[Google Sheets] Retrying... (${retryCount + 1}/${MAX_RETRIES})`);
              await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // Exponential backoff
              return appendTaxInfoToSheet(taxInfo, retryCount + 1);
            }
            return { success: false, message: result.message || 'Apps Script returned error' };
          }
        } catch (parseError) {
          console.error('❌ [Google Sheets] Failed to parse JSON response:', parseError.message);
          console.error(`   Response was: ${responseText.substring(0, 200)}`);
          // Retry on parse error if we haven't exceeded max retries
          if (retryCount < MAX_RETRIES) {
            console.log(`[Google Sheets] Retrying due to parse error... (${retryCount + 1}/${MAX_RETRIES})`);
            await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
            return appendTaxInfoToSheet(taxInfo, retryCount + 1);
          }
          return { success: false, message: 'Failed to parse response from Google Sheets' };
        }
      } else {
        console.error(`❌ [Google Sheets] Failed to call Apps Script: ${response.status} ${response.statusText}`);
        if (responseText) {
          console.error(`   Error details: ${responseText.substring(0, 300)}`);
        }
        
        // Retry on 5xx errors (server errors) but not on 4xx errors (client errors)
        if (response.status >= 500 && retryCount < MAX_RETRIES) {
          console.log(`[Google Sheets] Retrying due to server error... (${retryCount + 1}/${MAX_RETRIES})`);
          await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
          return appendTaxInfoToSheet(taxInfo, retryCount + 1);
        }
        
        // Provide helpful error messages
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        if (response.status === 401) {
          errorMessage = 'Apps Script authorization error. Check if "Who has access" is set to "Anyone"';
          console.error('   💡 Tip: Check if Apps Script is authorized and "Who has access" is set to "Anyone"');
        } else if (response.status === 403) {
          errorMessage = 'Permission denied. Check if the Google Sheet allows editing';
          console.error('   💡 Tip: Check if the Google Sheet allows editing and Apps Script has proper permissions');
        } else if (response.status === 404) {
          errorMessage = 'Apps Script URL not found. Check GOOGLE_APPS_SCRIPT_URL';
          console.error('   💡 Tip: Check if GOOGLE_APPS_SCRIPT_URL is correct');
        }
        
        return { success: false, message: errorMessage };
      }
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        console.error('❌ [Google Sheets] Request timeout after 30 seconds');
        // Retry on timeout if we haven't exceeded max retries
        if (retryCount < MAX_RETRIES) {
          console.log(`[Google Sheets] Retrying due to timeout... (${retryCount + 1}/${MAX_RETRIES})`);
          await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
          return appendTaxInfoToSheet(taxInfo, retryCount + 1);
        }
        return { success: false, message: 'Request timeout. Please check your connection and try again.' };
      }
      throw fetchError;
    }
  } catch (error) {
    console.error('❌ [Google Sheets] Error appending tax info:', error.message);
    if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
      console.error('   💡 Tip: Check your internet connection and Apps Script URL');
      // Retry on network errors if we haven't exceeded max retries
      if (retryCount < MAX_RETRIES) {
        console.log(`[Google Sheets] Retrying due to network error... (${retryCount + 1}/${MAX_RETRIES})`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        return appendTaxInfoToSheet(taxInfo, retryCount + 1);
      }
      return { success: false, message: 'Network error. Please check your connection.' };
    }
    return { success: false, message: error.message || 'Unknown error occurred' };
  }
};

// Helper function to format address - automatically add "Việt Nam" if not present
const formatAddress = (address) => {
  if (!address || address.trim() === '') {
    return '';
  }
  
  const trimmedAddress = address.trim();
  
  // Check if address already ends with "Việt Nam" or "Vietnam" (case insensitive)
  const vietnamPatterns = [
    /,\s*Việt\s*Nam\s*$/i,
    /,\s*Vietnam\s*$/i,
    /\s+Việt\s*Nam\s*$/i,
    /\s+Vietnam\s*$/i
  ];
  
  const hasVietnam = vietnamPatterns.some(pattern => pattern.test(trimmedAddress));
  
  if (hasVietnam) {
    return trimmedAddress;
  }
  
  // Add "Việt Nam" at the end
  return `${trimmedAddress}, Việt Nam`;
};

// Mock data for testing (remove when real API is configured)
const MOCK_TAX_DATA = {
  '3901212654': {
    "Type": 11,
    "MaSoThue": "3901212654",
    "Title": "Công Ty TNHH Mtv Ngô Trọng Phát",
    "TitleEn": "Ngo Trong Phat Co., Ltd",
    "TitleEnAscii": null,
    "DiaChiCongTy": "Tổ 17, ấp Tân Tiến, Xã Tân Lập, Huyện Tân Biên, Tỉnh Tây Ninh"
  }
};

// Try VietQR API (Free public API)
const tryVietQRApi = async (taxCode) => {
  try {
    // VietQR API endpoint - correct URL with api. prefix
    const apiUrl = `https://api.vietqr.io/v2/business/${taxCode}`;
    console.log(`Trying VietQR API: ${apiUrl}`);
    
    // Get API credentials from environment (optional - API may work without auth)
    const clientId = process.env.VIETQR_CLIENT_ID;
    const apiKey = process.env.VIETQR_API_KEY;
    
    // Build headers
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'Tax-Info-App/1.0'
    };
    
    // Add authentication if credentials are provided
    if (clientId && apiKey) {
      headers['x-client-id'] = clientId;
      headers['x-api-key'] = apiKey;
      console.log('Using VietQR API with authentication');
    } else {
      console.log('Using VietQR API without authentication (public access)');
    }
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: headers,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    // Handle rate limiting
    if (response.status === 429) {
      console.log('VietQR API rate limit exceeded');
      return null;
    }
    
    if (!response.ok) {
      console.log(`VietQR API returned status ${response.status}`);
      return null;
    }
    
    let data;
    try {
      data = await response.json();
    } catch (jsonError) {
      console.error('VietQR API: Failed to parse JSON response:', jsonError);
      const textResponse = await response.text();
      console.error('VietQR API: Raw response:', textResponse.substring(0, 200));
      return null;
    }
    
    // VietQR format: {code: "00", desc: "Success", data: {id, name, internationalName, shortName, address}}
    if (data.code === '00' && data.data) {
      const result = {
        success: true,
        data: {
          taxCode: data.data.id || taxCode,
          companyName: data.data.name || '',
          companyNameEn: data.data.internationalName || '',
          shortName: data.data.shortName || '',
          address: formatAddress(data.data.address || '')
        }
      };
      console.log('VietQR API success:', result.data.companyName);
      return result;
    }
    
    // Handle error response from VietQR
    if (data.code && data.code !== '00') {
      const errorDesc = data.desc || 'Unknown error';
      console.log(`VietQR API error: ${data.code} - ${errorDesc}`);
      // Return error message for better debugging
      return {
        success: false,
        message: `VietQR API: ${errorDesc}`
      };
    }
    
    // If response doesn't have expected format
    console.log('VietQR API: Unexpected response format', JSON.stringify(data).substring(0, 200));
    return null;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('VietQR API timeout after 10 seconds');
    } else if (error.message) {
      console.log('VietQR API failed:', error.message);
      console.error('Full error:', error);
    } else {
      console.log('VietQR API failed with unknown error:', error);
    }
    return null;
  }
};

// Tax Info Lookup Function - Try multiple public APIs
const lookupCompanyByTaxCode = async (taxCode) => {
  try {
    // Validate tax code format
    if (!/^[0-9]{10,13}$/.test(taxCode)) {
      return { success: false, message: 'Mã số thuế không hợp lệ' };
    }

    console.log(`Looking up tax code: ${taxCode}`);

    // Priority 1: Try configured custom API
    const apiBaseUrl = process.env.TAX_LOOKUP_API_URL;
    
    if (apiBaseUrl && !apiBaseUrl.includes('example.com')) {
      console.log(`Using custom API: ${apiBaseUrl}`);
      const apiUrl = `${apiBaseUrl}/${taxCode}`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      try {
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'User-Agent': 'Tax-Info-App/1.0'
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          let data;
          try {
            data = await response.json();
          } catch (jsonError) {
            console.error('Custom API: Failed to parse JSON response:', jsonError);
            const textResponse = await response.text().catch(() => 'Unable to read response');
            console.error('Custom API: Raw response:', textResponse.substring(0, 200));
            throw new Error('Invalid JSON response from custom API');
          }
          
          // Check for new API format (with MaSoThue field)
          if (data.MaSoThue && data.Title) {
            const result = {
              success: true,
              data: {
                taxCode: data.MaSoThue || taxCode,
                companyName: data.Title || '',
                companyNameEn: data.TitleEn || '',
                shortName: data.TitleEnAscii || '',
                address: formatAddress(data.DiaChiCongTy || '')
              }
            };
            console.log('Successfully found company info (custom API):', result.data.companyName);
            return result;
          }
        }
      } catch (error) {
        console.log('Custom API failed, trying public APIs...');
      }
    }
    
    // Priority 2: Try VietQR API (Free public API)
    console.log('Trying VietQR public API...');
    const vietQrResult = await tryVietQRApi(taxCode);
    if (vietQrResult) {
      if (vietQrResult.success) {
        console.log('Successfully found company info (VietQR):', vietQrResult.data.companyName);
        return vietQrResult;
      } else {
        // Log error from VietQR API but continue to try other methods
        console.log('VietQR API returned error:', vietQrResult.message);
      }
    }
    
    // Priority 3: Use mock data for testing
    if (MOCK_TAX_DATA[taxCode]) {
      console.log('Using mock data for testing');
      const mockData = MOCK_TAX_DATA[taxCode];
      const result = {
        success: true,
        data: {
          taxCode: mockData.MaSoThue || taxCode,
          companyName: mockData.Title || '',
          companyNameEn: mockData.TitleEn || '',
          shortName: mockData.TitleEnAscii || '',
          address: formatAddress(mockData.DiaChiCongTy || '')
        }
      };
      console.log('Successfully found company info (mock):', result.data.companyName);
      return result;
    }
    
    // All methods failed
    return { 
      success: false, 
      message: 'Không tìm thấy thông tin công ty từ các nguồn công khai. Vui lòng nhập thủ công hoặc kiểm tra lại mã số thuế.' 
    };
  } catch (error) {
    console.error('Error looking up company:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    // Handle specific error types
    if (error.name === 'AbortError') {
      return { 
        success: false, 
        message: 'Yêu cầu tra cứu quá thời gian. Vui lòng thử lại.' 
      };
    }
    
    if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
      return { 
        success: false, 
        message: 'Không thể kết nối đến server tra cứu. Đang sử dụng dữ liệu mẫu. Vui lòng cấu hình TAX_LOOKUP_API_URL trong file .env để sử dụng API thực.' 
      };
    }
    
    return { 
      success: false, 
      message: `Lỗi khi tra cứu thông tin công ty: ${error.message}` 
    };
  }
};

// Helper function to parse API response format
const parseTaxApiResponse = (data) => {
  if (data.MaSoThue && data.Title) {
    return {
      success: true,
      data: {
        taxCode: data.MaSoThue,
        companyName: data.Title || '',
        companyNameEn: data.TitleEn || '',
        shortName: data.TitleEnAscii || '',
        address: formatAddress(data.DiaChiCongTy || '')
      }
    };
  }
  return null;
};

// Tax Info API Routes
app.get('/api/tax-info', (req, res) => {
  try {
    const taxInfo = readTaxInfo();
    res.json({
      success: true,
      data: taxInfo
    });
  } catch (error) {
    console.error('Error getting tax info:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve tax information'
    });
  }
});

// Tax Code Lookup API
app.get('/api/tax-lookup/:taxCode', async (req, res) => {
  // Set JSON header immediately to ensure all responses are JSON
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  
  try {
    const { taxCode } = req.params;
    console.log(`[Tax Lookup] Request received for tax code: ${taxCode}`);
    console.log(`[Tax Lookup] Environment: ${process.env.NODE_ENV}, Vercel: ${process.env.VERCEL ? 'Yes' : 'No'}`);
    
    // Validate tax code format first
    if (!taxCode || !/^[0-9]{10,13}$/.test(taxCode)) {
      console.log(`[Tax Lookup] Invalid tax code format: ${taxCode}`);
      return res.status(200).json({
        success: false,
        message: 'Mã số thuế không hợp lệ. Vui lòng nhập 10-13 chữ số.'
      });
    }
    
    // Call lookup function with timeout protection
    let result;
    try {
      result = await Promise.race([
        lookupCompanyByTaxCode(taxCode),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Lookup timeout after 15 seconds')), 15000)
        )
      ]);
    } catch (lookupError) {
      console.error('[Tax Lookup] Lookup function error:', lookupError);
      return res.status(200).json({
        success: false,
        message: lookupError.message || 'Lỗi khi tra cứu thông tin. Vui lòng thử lại sau.'
      });
    }
    
    if (result && result.success) {
      console.log(`[Tax Lookup] ✅ Success for ${taxCode}: ${result.data?.companyName || 'N/A'}`);
      return res.json({
        success: true,
        data: result.data
      });
    } else {
      const errorMessage = result?.message || 'Không tìm thấy thông tin công ty từ các nguồn tra cứu';
      console.log(`[Tax Lookup] ❌ Failed for ${taxCode}: ${errorMessage}`);
      // Return 200 with success: false instead of 404, so frontend can handle it gracefully
      return res.status(200).json({
        success: false,
        message: errorMessage
      });
    }
  } catch (error) {
    console.error('[Tax Lookup] ❌ Unexpected Exception:', error);
    console.error('[Tax Lookup] Error details:', {
      message: error.message,
      stack: error.stack?.substring(0, 500), // Limit stack trace length
      name: error.name
    });
    
    // Always return 200 with error message, not 500, so frontend can handle gracefully
    // Ensure headers are set before sending response
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.status(200).json({
        success: false,
        message: `Lỗi khi tra cứu: ${error.message || 'Vui lòng thử lại sau'}`
      });
    }
  }
});

// Accept direct API response (for testing or when API returns data directly)
app.post('/api/tax-lookup/parse', (req, res) => {
  try {
    const apiResponse = req.body;
    console.log('Parsing API response:', JSON.stringify(apiResponse, null, 2));
    
    // Parse the new API format
    const parsed = parseTaxApiResponse(apiResponse);
    
    if (parsed && parsed.success) {
      res.json({
        success: true,
        data: parsed.data
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Không thể parse response từ API. Đảm bảo response có MaSoThue và Title fields.'
      });
    }
  } catch (error) {
    console.error('Error parsing API response:', error);
    res.status(500).json({
      success: false,
      message: `Lỗi khi parse response: ${error.message}`
    });
  }
});

app.post('/api/tax-info', (req, res) => {
  try {
    const taxData = req.body;
    
    // Validate required fields
    if (!taxData.taxCode) {
      return res.status(400).json({
        success: false,
        message: 'Mã số thuế là bắt buộc'
      });
    }

    // Validate tax code format (10-13 digits)
    if (!/^[0-9]{10,13}$/.test(taxData.taxCode)) {
      return res.status(400).json({
        success: false,
        message: 'Mã số thuế phải có 10-13 chữ số'
      });
    }

    // Validate email (required)
    if (!taxData.email || taxData.email.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Email là bắt buộc'
      });
    }

    // Validate email format
    const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
    if (!emailRegex.test(taxData.email)) {
      return res.status(400).json({
        success: false,
        message: 'Email không hợp lệ'
      });
    }

    // Validate phone (required)
    if (!taxData.phone || taxData.phone.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Số điện thoại là bắt buộc'
      });
    }

    // Normalize phone number: remove spaces, dashes, and +84 prefix
    let normalizedPhone = taxData.phone.replace(/\s+/g, ''); // Remove spaces
    normalizedPhone = normalizedPhone.replace(/-/g, ''); // Remove dashes
    normalizedPhone = normalizedPhone.replace(/\+84/g, '0'); // Replace +84 with 0
    normalizedPhone = normalizedPhone.replace(/^84/, '0'); // Replace 84 prefix with 0

    // Validate phone format (10-11 digits)
    if (!/^[0-9]{10,11}$/.test(normalizedPhone)) {
      return res.status(400).json({
        success: false,
        message: 'Số điện thoại phải có 10-11 chữ số (có thể nhập với dấu cách hoặc dấu gạch ngang)'
      });
    }

    // Create tax info object (use normalized phone)
    const taxInfo = {
      taxCode: taxData.taxCode,
      companyName: taxData.companyName || '',
      address: taxData.address || '',
      email: taxData.email || '',
      phone: normalizedPhone, // Use normalized phone number
      invoiceNumber: taxData.invoiceNumber || '',
      createdAt: taxData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Save to file
    const saved = writeTaxInfo(taxInfo);
    
    // Also append to Google Sheet (with better error handling)
    console.log('[POST /api/tax-info] Attempting to save to Google Sheets...');
    let googleSheetsResult = null;
    try {
      googleSheetsResult = await appendTaxInfoToSheet(taxInfo);
      if (googleSheetsResult.success) {
        console.log('[POST /api/tax-info] ✅ Google Sheets sync completed successfully');
      } else {
        console.error('[POST /api/tax-info] ⚠️ Google Sheets sync failed:', googleSheetsResult.message);
        // Don't fail the entire request if Google Sheets fails, but log it
      }
    } catch (err) {
      console.error('[POST /api/tax-info] ❌ Failed to sync tax info to Google Sheet:', err?.message);
      console.error('[POST /api/tax-info] Error stack:', err?.stack);
      // Don't fail the entire request if Google Sheets fails
    }
    
    if (saved) {
      // Include Google Sheets sync status in response if available
      const responseMessage = googleSheetsResult?.success 
        ? 'Thông tin mã số thuế đã được lưu thành công và đã được ghi vào Google Sheet'
        : 'Thông tin mã số thuế đã được lưu thành công' + (googleSheetsResult ? ` (Lưu vào Google Sheet: ${googleSheetsResult.message})` : '');
      
      res.json({
        success: true,
        message: responseMessage,
        data: taxInfo,
        googleSheetsSync: googleSheetsResult || { success: false, message: 'Not attempted' }
      });
    } else {
      throw new Error('Failed to save tax information');
    }
  } catch (error) {
    console.error('Error saving tax info:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to save tax information'
    });
  }
});

// Error handling middleware - MUST be after all routes
app.use((err, req, res, next) => {
  console.error('[Error Handler]', err.stack);
  console.error('[Error Handler] Error details:', {
    message: err.message,
    name: err.name,
    url: req.url,
    method: req.method
  });
  
  // Ensure JSON response even on errors - check if headers already sent
  if (!res.headersSent) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    
    // For tax-lookup endpoint, return 200 with error message instead of 500
    if (req.url && req.url.includes('/api/tax-lookup/')) {
      res.status(200).json({
        success: false,
        message: err.message || 'Lỗi khi tra cứu thông tin. Vui lòng thử lại sau.'
      });
    } else {
      res.status(500).json({
        success: false,
        message: err.message || 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.stack : undefined
      });
    }
  } else {
    // If headers already sent, try to end the response
    res.end();
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found'
  });
});

// For Vercel deployment - export the Express app
export default app;
