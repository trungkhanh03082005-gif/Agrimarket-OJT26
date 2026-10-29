import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { GoogleOAuthProvider } from '@react-oauth/google'

// Nếu chưa cấu hình Google Client ID, dùng placeholder chuẩn để thư viện Google GSI không throw lỗi missing_required_parameter
const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "placeholder-agrimarket-client-id.apps.googleusercontent.com"

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={clientId}>
      <App />
    </GoogleOAuthProvider>
  </React.StrictMode>,
)
