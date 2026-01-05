/**
 * Google Apps Script để ghi dữ liệu vào Google Sheet
 * 
 * HƯỚNG DẪN:
 * 1. Mở Google Sheet: https://docs.google.com/spreadsheets/d/1biHwq9fCQ1QjdbjlRBZ2L4kL10VoAaU8L4spQZHaNes
 * 2. Vào Extensions > Apps Script
 * 3. Xóa code mặc định và paste code này vào
 * 4. Nếu muốn thêm Library:
 *    - Vào Libraries (thư viện) ở menu bên trái
 *    - Click "+" để thêm library
 *    - Dán library ID: 1t3HJEDrWr9WyLRPWA2Np2wmAYyKcGzA9sqRBP0N-EaTul_Q64ufSs76j
 *    - Chọn version mới nhất
 *    - Đặt identifier (ví dụ: "MyLibrary")
 *    - Click "Save"
 *    - Authorize library khi được yêu cầu
 * 5. Lưu và đặt tên project (ví dụ: "Tax Info Logger")
 * 6. Deploy > New deployment > Web app
 * 7. Chọn:
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 8. Copy Web App URL và paste vào server/.env như GOOGLE_APPS_SCRIPT_URL
 */

// Sheet name - có thể đổi thành tên sheet cụ thể hoặc để null để dùng sheet đầu tiên
// Nếu để null, sẽ sử dụng sheet đầu tiên trong spreadsheet
const SHEET_NAME = null; // null = sheet đầu tiên, hoặc 'tax_info', 'TaxInfo', 'Sheet1', etc.

// Nếu bạn đã thêm library, uncomment và sử dụng identifier bạn đã đặt:
// const MyLibrary = LibraryName; // Thay "LibraryName" bằng identifier bạn đã đặt trong Libraries

// Function để xử lý POST request từ backend
function doPost(e) {
  try {
    // Parse JSON data từ request
    const data = JSON.parse(e.postData.contents);
    
    // Lấy spreadsheet
    const spreadsheet = SpreadsheetApp.openById('1biHwq9fCQ1QjdbjlRBZ2L4kL10VoAaU8L4spQZHaNes');
    
    // Lấy sheet - ưu tiên theo tên, nếu không có thì dùng sheet đầu tiên
    let sheet;
    if (SHEET_NAME) {
      sheet = spreadsheet.getSheetByName(SHEET_NAME);
      if (!sheet) {
        // Nếu sheet không tồn tại, tạo mới
        sheet = spreadsheet.insertSheet(SHEET_NAME);
      }
    } else {
      // Sử dụng sheet đầu tiên
      sheet = spreadsheet.getSheets()[0];
      if (!sheet) {
        throw new Error('Không tìm thấy sheet nào trong spreadsheet');
      }
    }
    
    // Kiểm tra và tạo header nếu chưa có
    const lastRow = sheet.getLastRow();
    const firstRowValue = sheet.getRange(1, 1).getValue();
    const hasHeader = (firstRowValue === 'Thời gian');
    
    // Nếu sheet trống hoặc row đầu tiên không phải header
    if (lastRow === 0 || !hasHeader) {
      // Chèn header row ở đầu (nếu có dữ liệu thì insert, nếu không thì append)
      if (lastRow > 0 && !hasHeader) {
        sheet.insertRowBefore(1);
      }
      // Tạo header row
      sheet.getRange(1, 1, 1, 7).setValues([[
        'Thời gian',
        'Số hóa đơn',
        'Mã số thuế',
        'Tên công ty',
        'Địa chỉ',
        'Email',
        'Số điện thoại'
      ]]);
      // Format header
      sheet.getRange(1, 1, 1, 7)
        .setFontWeight('bold')
        .setBackground('#f59e0b')
        .setFontColor('#ffffff')
        .setHorizontalAlignment('center');
    }
    
    // Chuẩn bị dữ liệu để thêm vào sheet
    const rowData = [
      new Date().toISOString(),                    // Thời gian
      data.invoiceNumber || '',                    // Số hóa đơn
      data.taxCode || '',                          // Mã số thuế
      data.companyName || '',                      // Tên công ty
      data.address || '',                          // Địa chỉ
      data.email || '',                            // Email
      data.phone || ''                             // Số điện thoại
    ];
    
    // Thêm dòng mới vào sheet
    sheet.appendRow(rowData);
    
    // Trả về success response
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: 'Đã ghi dữ liệu vào Google Sheet thành công'
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    // Trả về error response
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        message: 'Lỗi: ' + error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Function để test (optional)
function test() {
  const testData = {
    invoiceNumber: 'TEST001',
    taxCode: '0316794479',
    companyName: 'CÔNG TY TNHH CASSO',
    address: 'Test Address, Việt Nam',
    email: 'test@example.com',
    phone: '0123456789'
  };
  
  const mockEvent = {
    postData: {
      contents: JSON.stringify(testData)
    }
  };
  
  const result = doPost(mockEvent);
  Logger.log(result.getContent());
}

// Function doGet để test connection (optional)
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({
      success: true,
      message: 'Tax Info Google Apps Script is running',
      timestamp: new Date().toISOString(),
      sheetName: SHEET_NAME
    }))
    .setMimeType(ContentService.MimeType.JSON);
}
