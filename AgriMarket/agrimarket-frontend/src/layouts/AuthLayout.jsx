import React from 'react'
import { Outlet } from 'react-router-dom'

const AuthLayout = () => {
  return (
    <div className="auth-layout" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--background-color)', padding: '20px' }}>
      {/* PASTE AUTH LAYOUT JSX FROM ANIMA HERE */}
      <Outlet />
    </div>
  )
}

export default AuthLayout
