/**
 * Script test để kiểm tra kết nối Google Sheets
 * Chạy: node test-google-sheets.js
 */

import dotenv from 'dotenv';
dotenv.config();

const GOOGLE_APPS_SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_URL;

if (!GOOGLE_APPS_SCRIPT_URL) {
  console.error('❌ GOOGLE_APPS_SCRIPT_URL không được cấu hình trong .env');
  process.exit(1);
}

console.log('🔍 Testing Google Sheets connection...');
console.log(`📋 URL: ${GOOGLE_APPS_SCRIPT_URL}\n`);

// Test 1: Test doGet (nếu có)
console.log('Test 1: Testing doGet...');
try {
  const getResponse = await fetch(GOOGLE_APPS_SCRIPT_URL, {
    method: 'GET',
    redirect: 'follow'
  });
  
  if (getResponse.ok) {
    const getData = await getResponse.text();
    console.log('✅ doGet response:', getData.substring(0, 200));
  } else {
    console.log(`⚠️ doGet returned: ${getResponse.status} ${getResponse.statusText}`);
  }
} catch (error) {
  console.log(`❌ doGet error: ${error.message}`);
}

console.log('\n');

// Test 2: Test doPost với dữ liệu mẫu
console.log('Test 2: Testing doPost with sample data...');
const testData = {
  invoiceNumber: 'TEST001',
  taxCode: '0316794479',
  companyName: 'CÔNG TY TNHH CASSO',
  address: 'Test Address, Việt Nam',
  email: 'test@example.com',
  phone: '0123456789'
};

try {
  const postResponse = await fetch(GOOGLE_APPS_SCRIPT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(testData),
    redirect: 'follow'
  });
  
  console.log(`Status: ${postResponse.status} ${postResponse.statusText}`);
  
  const responseText = await postResponse.text();
  console.log('Response:', responseText.substring(0, 500));
  
  if (postResponse.ok) {
    try {
      const result = JSON.parse(responseText);
      if (result.success) {
        console.log('\n✅ SUCCESS! Data should be saved to Google Sheet');
        console.log('📊 Check your Google Sheet to verify');
      } else {
        console.log('\n❌ Apps Script returned error:', result.message);
      }
    } catch (parseError) {
      console.log('\n⚠️ Response is not JSON:', responseText.substring(0, 200));
    }
  } else {
    console.log('\n❌ Failed to save data');
    if (postResponse.status === 401) {
      console.log('💡 Tip: Check if "Who has access" is set to "Anyone"');
    } else if (postResponse.status === 403) {
      console.log('💡 Tip: Check if Apps Script has permission to edit the Sheet');
    } else if (postResponse.status === 404) {
      console.log('💡 Tip: Check if GOOGLE_APPS_SCRIPT_URL is correct');
    }
  }
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('💡 Tip: Check your internet connection and Apps Script URL');
}

