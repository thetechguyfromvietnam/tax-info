import TaxInfo from './pages/TaxInfo'

function App() {
  try {
    return <TaxInfo />
  } catch (error) {
    console.error('App error:', error)
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Đã xảy ra lỗi</h2>
        <p>{error.message}</p>
        <button onClick={() => window.location.reload()}>Tải lại trang</button>
      </div>
    )
  }
}

export default App
