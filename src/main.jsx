import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

console.log('[main.jsx] Starting app...', {
  env: import.meta.env.MODE,
  prod: import.meta.env.PROD
})

try {
  const rootElement = document.getElementById('root')
  if (!rootElement) {
    throw new Error('Root element not found')
  }
  
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
  console.log('[main.jsx] App rendered successfully')
} catch (error) {
  console.error('[main.jsx] Error rendering app:', error)
  document.body.innerHTML = `
    <div style="padding: 20px; text-align: center; font-family: Arial;">
      <h1>Lỗi khởi động ứng dụng</h1>
      <p style="color: red;">${error.message}</p>
      <pre style="text-align: left; background: #f0f0f0; padding: 10px; overflow: auto;">${error.stack}</pre>
      <button onclick="window.location.reload()">Tải lại trang</button>
    </div>
  `
}
