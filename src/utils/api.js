// API Configuration Helper
export const getApiUrl = () => {
  // In production, use relative URLs (same domain)
  // In development, use localhost
  if (import.meta.env.PROD) {
    return ''; // Relative URL - same domain as frontend
  } else {
    return 'http://localhost:3002'; // Local development server
  }
};

// Test API connection
export const testApiConnection = async () => {
  try {
    const apiUrl = getApiUrl();
    console.log('Testing API connection to:', `${apiUrl}/api/health`);
    
    const response = await fetch(`${apiUrl}/api/health`);
    const data = await response.json();
    
    console.log('API Health Check Response:', data);
    return { success: true, data };
  } catch (error) {
    console.error('API Connection Test Failed:', error);
    return { success: false, error: error.message };
  }
};
